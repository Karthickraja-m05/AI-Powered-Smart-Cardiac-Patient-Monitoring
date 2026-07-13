# -*- coding: utf-8 -*-
"""Prediction Schemas."""

from datetime import datetime
from typing import Optional, Dict, List, Any
from pydantic import BaseModel, Field


class PredictionRequest(BaseModel):
    patient_id: int
    # UCI Heart Disease features
    age: float = Field(..., ge=0, le=150)
    sex: int = Field(..., ge=0, le=1)
    cp: int = Field(..., ge=0, le=3)
    trestbps: float = Field(..., ge=40, le=300)
    chol: float = Field(..., ge=50, le=700)
    fbs: int = Field(..., ge=0, le=1)
    restecg: int = Field(..., ge=0, le=2)
    thalach: float = Field(..., ge=40, le=250)
    exang: int = Field(..., ge=0, le=1)
    oldpeak: float = Field(..., ge=0, le=10)
    slope: int = Field(..., ge=0, le=2)
    ca: int = Field(..., ge=0, le=4)
    thal: int = Field(..., ge=0, le=3)


class PredictionResponse(BaseModel):
    id: int
    patient_id: int
    risk_score: float
    risk_percentage: float
    risk_level: str
    confidence: Optional[float] = None
    model_name: Optional[str] = None
    feature_values: Optional[Dict[str, Any]] = None
    shap_values: Optional[Dict[str, float]] = None
    top_risk_factors: Optional[List[str]] = None
    predicted_at: datetime

    class Config:
        from_attributes = True
