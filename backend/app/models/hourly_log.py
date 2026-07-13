# -*- coding: utf-8 -*-
"""
Hourly Log Model
================
Automated hourly snapshots of patient status including vitals,
symptoms, medications, and AI predictions.
"""

from datetime import datetime
from sqlalchemy import (
    Column, Integer, Float, String, DateTime, Text, ForeignKey, JSON
)
from ..database import Base


class HourlyLog(Base):
    __tablename__ = "hourly_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)

    # ── Vitals Snapshot ──
    heart_rate = Column(Float, nullable=True)
    spo2 = Column(Float, nullable=True)
    temperature = Column(Float, nullable=True)
    bp_systolic = Column(Integer, nullable=True)
    bp_diastolic = Column(Integer, nullable=True)
    respiratory_rate = Column(Float, nullable=True)
    pain_score = Column(Integer, nullable=True)

    # ── Symptoms at this hour ──
    active_symptoms = Column(JSON, nullable=True)  # ["chest_pain", "dizziness"]

    # ── Medications ──
    medication_given = Column(JSON, nullable=True)   # [{"name": "Aspirin", "dose": "100mg"}]
    injection_given = Column(JSON, nullable=True)

    # ── AI Prediction ──
    risk_score = Column(Float, nullable=True)
    risk_level = Column(String(20), nullable=True)

    # ── Notes ──
    doctor_notes = Column(Text, nullable=True)
    nurse_notes = Column(Text, nullable=True)

    # ── Timestamps ──
    log_hour = Column(DateTime, nullable=False, index=True)  # The hour this log represents
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<HourlyLog patient={self.patient_id} @ {self.log_hour}>"
