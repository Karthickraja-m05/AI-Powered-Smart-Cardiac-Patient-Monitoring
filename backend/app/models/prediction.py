# -*- coding: utf-8 -*-
"""
Prediction Model
================
Stores ML cardiovascular risk predictions with SHAP explanations.
"""

import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, Float, String, DateTime, Enum, JSON, ForeignKey
)
from ..database import Base


class RiskLevel(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)

    # ── Prediction Results ──
    risk_score = Column(Float, nullable=False)         # 0.0 - 1.0 probability
    risk_percentage = Column(Float, nullable=False)    # 0-100
    risk_level = Column(Enum(RiskLevel), nullable=False)
    confidence = Column(Float, nullable=True)          # Model confidence

    # ── Model Info ──
    model_name = Column(String(100), nullable=True)    # e.g., "XGBoost"
    model_version = Column(String(50), nullable=True)

    # ── Input Features ──
    feature_values = Column(JSON, nullable=True)       # { "age": 55, "cp": 2, ... }

    # ── Explainability ──
    shap_values = Column(JSON, nullable=True)          # { "age": 0.12, "cp": -0.08, ... }
    top_risk_factors = Column(JSON, nullable=True)     # ["Chest Pain Type", "ST Depression"]

    # ── Context ──
    predicted_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    vital_sign_id = Column(Integer, ForeignKey("vital_signs.id"), nullable=True)

    # ── Timestamps ──
    predicted_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<Prediction patient={self.patient_id} risk={self.risk_percentage}% ({self.risk_level.value})>"
