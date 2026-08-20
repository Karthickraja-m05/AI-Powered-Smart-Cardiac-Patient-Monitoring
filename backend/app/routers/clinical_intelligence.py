# -*- coding: utf-8 -*-
"""
Clinical Intelligence Router
============================
Endpoints for:
1. Personalized Patient Baseline Learning (Dynamic Z-Scores)
2. Forward Risk Trend Forecasting (5-15 min Outlook)
3. Counterfactual Explainable AI & What-If Simulator
4. Smart Patient Transfer & Escalation Recommendation
5. Post-Discharge Follow-Up Intelligence
6. Privacy-Preserving Audit & Data Localization
"""

from typing import Dict, Any, Optional
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, Query
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
from pydantic import BaseModel

from ..database import get_db
from ..services.clinical_intelligence_service import (
    calculate_patient_baseline,
    forecast_risk_trajectory,
    generate_counterfactual_recommendations,
    simulate_what_if,
    recommend_patient_transfer,
    evaluate_post_discharge_followup,
    get_privacy_audit_summary,
)

router = APIRouter(prefix="/api/intelligence", tags=["Clinical Intelligence & Innovation"])


class WhatIfRequest(BaseModel):
    features: Dict[str, float]


@router.get("/baseline/{patient_id}")
def get_patient_baseline(
    patient_id: int,
    window_size: int = Query(30, ge=5, le=100),
    db: Session = Depends(get_db)
):
    """Returns learned personalized baseline vitals and dynamic Z-score deviations."""
    try:
        return calculate_patient_baseline(db, patient_id, window_size)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/forecast/{patient_id}")
def get_risk_forecast(patient_id: int, db: Session = Depends(get_db)):
    """Returns 5, 10, and 15-minute forward vital projections and risk trajectory."""
    try:
        return forecast_risk_trajectory(db, patient_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/counterfactuals")
def get_counterfactuals(payload: WhatIfRequest):
    """
    Returns actionable counterfactual 'What-If' clinical recommendations:
    What biomarker modifications would decrease this patient's risk score?
    """
    try:
        return generate_counterfactual_recommendations(payload.features)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/what-if")
def run_what_if_simulation(payload: WhatIfRequest):
    """Real-time simulation slider computation for interactive clinical testing."""
    try:
        return simulate_what_if(payload.features)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/transfer-recommendation/{patient_id}")
def get_transfer_recommendation(patient_id: int, db: Session = Depends(get_db)):
    """
    Evaluates patient risk, trend velocity, and bed availability to recommend:
    Stay in Ward, Urgent Review, Escalate to Cardiology, or Transfer to ICU.
    """
    try:
        return recommend_patient_transfer(db, patient_id)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/post-discharge/{patient_id}")
def get_post_discharge_intelligence(patient_id: int, db: Session = Depends(get_db)):
    """Monitors post-discharge adherence, missed visits, red-flag symptoms, and readmission risk."""
    try:
        return evaluate_post_discharge_followup(db, patient_id)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/privacy-audit-summary")
def get_privacy_summary(db: Session = Depends(get_db)):
    """Returns proof of 100% on-premise localized data processing and zero-leakage security posture."""
    try:
        return get_privacy_audit_summary(db)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
