# -*- coding: utf-8 -*-
"""
Export Model Weights to JSON
==============================
Extracts trained model parameters and scaler stats from .pkl files
so the dashboard can run predictions entirely in JavaScript (no server).

Supports:
  - LogisticRegression (coefficients + intercept → sigmoid)
  - SVM with linear kernel (coefficients + intercept → sigmoid)
  - RandomForest / GradientBoosting / XGBoost (falls back to scoring
    a grid of representative patients and fitting a logistic approximation)

Output: model_weights.json
"""

import os
import sys
import json
import numpy as np
import joblib

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PARENT_DIR = os.path.dirname(BASE_DIR)
MODEL_PATH = os.path.join(PARENT_DIR, "heart_model.pkl")
SCALER_PATH = os.path.join(PARENT_DIR, "scaler.pkl")
OUTPUT_PATH = os.path.join(BASE_DIR, "model_weights.json")

def export_weights():
    """Extract model weights and scaler parameters, save as JSON."""
    model = joblib.load(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)

    model_type = type(model).__name__
    print(f"  Model type : {model_type}")
    print(f"  Scaler     : StandardScaler")

    # ── Scaler parameters ──
    scaler_data = {
        "mean": scaler.mean_.tolist(),
        "scale": scaler.scale_.tolist(),
    }

    # ── Feature names ──
    feature_names = [
        "age", "sex", "cp", "trestbps", "chol", "fbs", "restecg",
        "thalach", "exang", "oldpeak", "slope", "ca", "thal"
    ]

    # ── Model parameters ──
    model_data = {}

    if hasattr(model, "coef_") and hasattr(model, "intercept_"):
        # Linear models: LogisticRegression, LinearSVC, etc.
        model_data["type"] = "logistic"
        model_data["coefficients"] = model.coef_[0].tolist()
        model_data["intercept"] = float(model.intercept_[0])
        print(f"  Export     : Direct coefficients + intercept")

    elif hasattr(model, "predict_proba"):
        # Tree-based models: RF, GB, XGB — we export a lookup approach
        # by scoring representative samples and fitting a JS-compatible model
        # Actually, for tree models we'll use a different approach:
        # Export the predict_proba function by pre-computing on a dense grid
        # This is impractical for 13 features, so instead we'll use
        # a logistic regression surrogate trained on model predictions.
        print(f"  Export     : Surrogate logistic model (trained on {model_type} predictions)")

        from sklearn.linear_model import LogisticRegression as LR
        import pandas as pd

        # Load the original data to create a representative sample
        data_path = os.path.join(PARENT_DIR, "heart.csv")
        df = pd.read_csv(data_path)
        df.drop_duplicates(inplace=True)
        X = df.drop("target", axis=1).values

        # Scale and get predictions from the complex model
        X_scaled = scaler.transform(X)
        probas = model.predict_proba(X_scaled)[:, 1]

        # Also create augmented data by perturbing existing samples
        np.random.seed(42)
        n_augment = 2000
        indices = np.random.choice(len(X), size=n_augment, replace=True)
        X_aug = X[indices] + np.random.normal(0, 0.5, (n_augment, X.shape[1]))

        # Clip to reasonable ranges
        ranges = {
            0: (20, 100),   # age
            1: (0, 1),      # sex
            2: (0, 3),      # cp
            3: (80, 220),   # trestbps
            4: (100, 600),  # chol
            5: (0, 1),      # fbs
            6: (0, 2),      # restecg
            7: (60, 220),   # thalach
            8: (0, 1),      # exang
            9: (0, 7),      # oldpeak
            10: (0, 2),     # slope
            11: (0, 4),     # ca
            12: (0, 3),     # thal
        }
        for col, (lo, hi) in ranges.items():
            X_aug[:, col] = np.clip(X_aug[:, col], lo, hi)
        # Round integer features
        int_cols = [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12]
        for c in int_cols:
            X_aug[:, c] = np.round(X_aug[:, c])

        X_aug_scaled = scaler.transform(X_aug)
        probas_aug = model.predict_proba(X_aug_scaled)[:, 1]

        # Combine original and augmented data
        X_all_scaled = np.vstack([X_scaled, X_aug_scaled])
        y_all = np.concatenate([probas, probas_aug])

        # Train a surrogate logistic regression
        # Convert probabilities to binary labels with threshold 0.5
        y_binary = (y_all >= 0.5).astype(int)
        surrogate = LR(C=0.1, max_iter=5000, random_state=42)
        surrogate.fit(X_all_scaled, y_binary)

        model_data["type"] = "logistic"
        model_data["coefficients"] = surrogate.coef_[0].tolist()
        model_data["intercept"] = float(surrogate.intercept_[0])
        model_data["is_surrogate"] = True

        # Evaluate surrogate accuracy vs original
        surr_preds = surrogate.predict(X_scaled)
        orig_preds = (probas >= 0.5).astype(int)
        agreement = (surr_preds == orig_preds).mean()
        print(f"  Surrogate agreement with original: {agreement:.1%}")
    else:
        print(f"  ❌ Cannot export model type: {model_type}")
        sys.exit(1)

    # ── Assemble output ──
    output = {
        "model": model_data,
        "scaler": scaler_data,
        "features": feature_names,
        "model_name": model_type,
    }

    with open(OUTPUT_PATH, "w") as f:
        json.dump(output, f, indent=2)

    print(f"\n  ✅ Saved: {OUTPUT_PATH}")
    print(f"     Model type exported as: {model_data['type']}")


if __name__ == "__main__":
    print("=" * 60)
    print("  EXPORT MODEL WEIGHTS TO JSON")
    print("=" * 60)
    export_weights()
    print("=" * 60)
