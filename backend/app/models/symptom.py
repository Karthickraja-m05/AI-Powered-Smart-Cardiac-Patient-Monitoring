# -*- coding: utf-8 -*-
"""
Symptom Record Model
====================
Tracks 20+ cardiac-related symptoms recorded by doctors and nurses.
"""

from datetime import datetime
from sqlalchemy import (
    Column, Integer, Float, Boolean, String, DateTime, Text, ForeignKey
)
from ..database import Base


class SymptomRecord(Base):
    __tablename__ = "symptom_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)

    # ── Pain Symptoms ──
    chest_pain = Column(Boolean, default=False)
    arm_pain = Column(Boolean, default=False)
    jaw_pain = Column(Boolean, default=False)
    shoulder_pain = Column(Boolean, default=False)
    neck_pain = Column(Boolean, default=False)
    back_pain = Column(Boolean, default=False)
    body_pain = Column(Boolean, default=False)

    # ── Respiratory Symptoms ──
    breathing_difficulty = Column(Boolean, default=False)
    shortness_of_breath = Column(Boolean, default=False)
    cough = Column(Boolean, default=False)

    # ── Cardiac Symptoms ──
    palpitations = Column(Boolean, default=False)
    dizziness = Column(Boolean, default=False)
    loss_of_consciousness = Column(Boolean, default=False)

    # ── General Symptoms ──
    vomiting = Column(Boolean, default=False)
    fatigue = Column(Boolean, default=False)
    sweating = Column(Boolean, default=False)
    swelling = Column(Boolean, default=False)
    fever = Column(Boolean, default=False)
    headache = Column(Boolean, default=False)

    # ── Pain Score ──
    pain_score = Column(Integer, nullable=True)  # 0-10

    # ── Notes ──
    notes = Column(Text, nullable=True)

    # ── Metadata ──
    recorded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    recorded_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<SymptomRecord patient={self.patient_id} @ {self.recorded_at}>"

    @property
    def active_symptoms(self):
        """Return list of active symptom names."""
        symptom_fields = [
            "chest_pain", "arm_pain", "jaw_pain", "shoulder_pain",
            "neck_pain", "back_pain", "body_pain", "breathing_difficulty",
            "shortness_of_breath", "cough", "palpitations", "dizziness",
            "loss_of_consciousness", "vomiting", "fatigue", "sweating",
            "swelling", "fever", "headache",
        ]
        return [s.replace("_", " ").title() for s in symptom_fields if getattr(self, s, False)]
