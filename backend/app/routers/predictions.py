# -*- coding: utf-8 -*-
"""
Predictions Router
==================
Run ML predictions and query prediction history.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.user import User
from ..models.prediction import Prediction
from ..schemas.prediction_schema import PredictionRequest, PredictionResponse
from ..services.auth_service import get_current_user
from ..services.prediction_service import run_prediction
from ..services.alert_service import create_ai_risk_alert

router = APIRouter(prefix="/api/predictions", tags=["AI Predictions"])


@router.post("", response_model=PredictionResponse, status_code=201)
def create_prediction(
    data: PredictionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Run cardiovascular risk prediction for a patient.

    ⚕️ DISCLAIMER: This is an AI-assisted clinical decision support tool.
    Results must be reviewed and validated by licensed clinicians.
    This system does NOT diagnose medical conditions.
    """
    features = {
        "age": data.age,
        "sex": data.sex,
        "cp": data.cp,
        "trestbps": data.trestbps,
        "chol": data.chol,
        "fbs": data.fbs,
        "restecg": data.restecg,
        "thalach": data.thalach,
        "exang": data.exang,
        "oldpeak": data.oldpeak,
        "slope": data.slope,
        "ca": data.ca,
        "thal": data.thal,
    }

    prediction = run_prediction(
        db=db,
        patient_id=data.patient_id,
        features=features,
        predicted_by=current_user.id,
    )

    # Create alert if risk is high
    if prediction.risk_percentage >= 50:
        create_ai_risk_alert(db, data.patient_id, prediction.risk_percentage, prediction.risk_level.value)

    return PredictionResponse.model_validate(prediction)


@router.get("/{patient_id}", response_model=List[PredictionResponse])
def get_prediction_history(
    patient_id: int,
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get prediction history for a patient."""
    predictions = (
        db.query(Prediction)
        .filter(Prediction.patient_id == patient_id)
        .order_by(Prediction.predicted_at.desc())
        .limit(limit)
        .all()
    )
    return [PredictionResponse.model_validate(p) for p in predictions]


@router.get("/{patient_id}/latest", response_model=Optional[PredictionResponse])
def get_latest_prediction(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the most recent prediction for a patient."""
    prediction = (
        db.query(Prediction)
        .filter(Prediction.patient_id == patient_id)
        .order_by(Prediction.predicted_at.desc())
        .first()
    )
    if not prediction:
        return None
    return PredictionResponse.model_validate(prediction)
