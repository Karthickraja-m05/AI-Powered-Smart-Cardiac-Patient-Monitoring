# -*- coding: utf-8 -*-
"""
Prediction Service
==================
ML model loading, prediction, risk classification, and SHAP explanation.
Uses the trained models from the ML module.
"""

import os
import json
import numpy as np
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

from ..config import settings
from ..models.prediction import Prediction, RiskLevel
from ..models.patient import Patient

# Feature names expected by the model (UCI Heart Disease dataset)
FEATURE_NAMES = [
    "age", "sex", "cp", "trestbps", "chol", "fbs",
    "restecg", "thalach", "exang", "oldpeak", "slope", "ca", "thal"
]

FEATURE_DISPLAY_NAMES = {
    "age": "Age",
    "sex": "Gender",
    "cp": "Chest Pain Type",
    "trestbps": "Resting Blood Pressure",
    "chol": "Cholesterol Level",
    "fbs": "Fasting Blood Sugar",
    "restecg": "ECG Result",
    "thalach": "Maximum Heart Rate",
    "exang": "Exercise Induced Angina",
    "oldpeak": "ST Depression",
    "slope": "ST Segment Slope",
    "ca": "Number of Major Vessels",
    "thal": "Thalassemia Status",
}

# In-memory model cache
_model = None
_scaler = None
_model_name = None
_model_weights = None


def _load_model_weights():
    """Load exported model weights JSON (fallback when sklearn model not available)."""
    global _model_weights
    weights_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))),
        "dashboard", "model_weights.json"
    )
    if os.path.exists(weights_path):
        with open(weights_path, "r") as f:
            _model_weights = json.load(f)
        return True
    return False


def _load_sklearn_model():
    """Load trained sklearn model and scaler from pickle files."""
    global _model, _scaler, _model_name
    try:
        import joblib
        model_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))),
            "ml", "models", "best_model.pkl"
        )
        scaler_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))),
            "ml", "models", "scaler.pkl"
        )

        # Fallback to original model paths
        if not os.path.exists(model_path):
            model_path = os.path.join(
                os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))),
                "heart_model.pkl"
            )
            scaler_path = os.path.join(
                os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))),
                "scaler.pkl"
            )

        if os.path.exists(model_path) and os.path.exists(scaler_path):
            _model = joblib.load(model_path)
            _scaler = joblib.load(scaler_path)
            _model_name = type(_model).__name__
            return True
    except Exception as e:
        print(f"[WARN] Could not load sklearn model: {e}")
    return False


def _sigmoid(x: float) -> float:
    return 1.0 / (1.0 + np.exp(-x))


def predict_with_weights(features: Dict[str, float]) -> Dict[str, Any]:
    """Predict using exported logistic regression weights (client-compatible)."""
    global _model_weights
    if _model_weights is None:
        _load_model_weights()
    if _model_weights is None:
        raise ValueError("No model weights available")

    coefficients = _model_weights["model"]["coefficients"]
    intercept = _model_weights["model"]["intercept"]
    means = _model_weights["scaler"]["mean"]
    scales = _model_weights["scaler"]["scale"]
    feature_list = _model_weights["features"]

    # Scale features
    scaled = []
    for i, name in enumerate(feature_list):
        val = features.get(name, 0)
        scaled.append((val - means[i]) / scales[i])

    # Logistic regression: z = w·x + b
    z = intercept
    for i in range(len(scaled)):
        z += coefficients[i] * scaled[i]

    prob = _sigmoid(z)
    return {
        "probability": prob,
        "label": 1 if prob >= 0.5 else 0,
        "model_name": _model_weights.get("model_name", "LogisticRegression"),
        "feature_importances": {
            feature_list[i]: abs(coefficients[i] * scaled[i])
            for i in range(len(feature_list))
        }
    }


def predict_with_sklearn(features: Dict[str, float]) -> Dict[str, Any]:
    """Predict using the trained sklearn model."""
    global _model, _scaler, _model_name
    if _model is None:
        _load_sklearn_model()
    if _model is None:
        return predict_with_weights(features)

    # Build feature array
    X = np.array([[features.get(name, 0) for name in FEATURE_NAMES]])
    X_scaled = _scaler.transform(X)

    # Predict
    prediction = _model.predict(X_scaled)[0]
    proba = _model.predict_proba(X_scaled)[0]
    prob_disease = float(proba[1])

    # Feature importances
    importances = {}
    if hasattr(_model, "feature_importances_"):
        for i, name in enumerate(FEATURE_NAMES):
            importances[name] = float(_model.feature_importances_[i])
    elif hasattr(_model, "coef_"):
        for i, name in enumerate(FEATURE_NAMES):
            importances[name] = float(abs(_model.coef_[0][i]))

    return {
        "probability": prob_disease,
        "label": int(prediction),
        "model_name": _model_name,
        "feature_importances": importances,
    }


def classify_risk(probability: float) -> RiskLevel:
    """Classify risk level based on probability threshold."""
    if probability >= 0.75:
        return RiskLevel.CRITICAL
    elif probability >= 0.50:
        return RiskLevel.HIGH
    elif probability >= 0.25:
        return RiskLevel.MEDIUM
    else:
        return RiskLevel.LOW


def run_prediction(
    db: Session,
    patient_id: int,
    features: Dict[str, float],
    predicted_by: Optional[int] = None,
) -> Prediction:
    """Run a full prediction and store the result."""
    # Try sklearn first, fall back to weights
    result = predict_with_sklearn(features)

    probability = result["probability"]
    risk_level = classify_risk(probability)
    risk_percentage = round(probability * 100, 1)

    # Get top risk factors
    importances = result.get("feature_importances", {})
    sorted_factors = sorted(importances.items(), key=lambda x: x[1], reverse=True)
    top_factors = [FEATURE_DISPLAY_NAMES.get(name, name) for name, _ in sorted_factors[:5]]

    # Create prediction record
    prediction = Prediction(
        patient_id=patient_id,
        risk_score=probability,
        risk_percentage=risk_percentage,
        risk_level=risk_level,
        confidence=round(max(probability, 1 - probability) * 100, 1),
        model_name=result.get("model_name"),
        feature_values=features,
        shap_values=importances,
        top_risk_factors=top_factors,
        predicted_by=predicted_by,
    )

    db.add(prediction)
    db.commit()
    db.refresh(prediction)

    # Update patient's current risk
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if patient:
        patient.current_risk_level = risk_level.value
        patient.current_risk_score = risk_percentage
        db.commit()

    return prediction


# Initialize model on import
_load_sklearn_model() or _load_model_weights()
