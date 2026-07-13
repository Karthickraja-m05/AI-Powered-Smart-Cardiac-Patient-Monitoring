# -*- coding: utf-8 -*-
"""
Alert Model
===========
Emergency detection alerts triggered by abnormal vitals or AI risk scores.
"""

import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Enum, Text,
    ForeignKey, JSON
)
from ..database import Base


class AlertType(str, enum.Enum):
    HEART_RATE = "heart_rate"
    SPO2 = "spo2"
    TEMPERATURE = "temperature"
    BLOOD_PRESSURE = "blood_pressure"
    RESPIRATORY = "respiratory"
    CHEST_PAIN = "chest_pain"
    AI_RISK = "ai_risk"
    EMERGENCY_BUTTON = "emergency_button"
    MEDICATION_MISSED = "medication_missed"
    FALL_DETECTED = "fall_detected"


class AlertSeverity(str, enum.Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"
    EMERGENCY = "emergency"


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)

    # ── Alert Details ──
    alert_type = Column(Enum(AlertType), nullable=False)
    severity = Column(Enum(AlertSeverity), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)

    # ── Context ──
    vitals_snapshot = Column(JSON, nullable=True)  # Vitals at time of alert
    trigger_value = Column(Float, nullable=True)   # The value that triggered the alert
    threshold = Column(Float, nullable=True)       # The threshold that was exceeded
    risk_score = Column(Float, nullable=True)      # AI risk score if applicable

    # ── Resolution ──
    is_acknowledged = Column(Boolean, default=False)
    acknowledged_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    acknowledged_at = Column(DateTime, nullable=True)
    resolution_notes = Column(Text, nullable=True)
    is_resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime, nullable=True)

    # ── Timestamps ──
    triggered_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<Alert {self.alert_type.value} ({self.severity.value}) patient={self.patient_id}>"
