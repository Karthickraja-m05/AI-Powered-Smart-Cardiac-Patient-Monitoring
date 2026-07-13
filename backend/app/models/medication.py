# -*- coding: utf-8 -*-
"""
Medication Model
================
Tracks medications, doses, injections, IV fluids, and administration records.
"""

import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Enum, Text, ForeignKey
)
from ..database import Base


class MedicationType(str, enum.Enum):
    ORAL = "oral"
    INJECTION = "injection"
    IV_FLUID = "iv_fluid"
    INSULIN = "insulin"
    PAINKILLER = "painkiller"
    ANTIBIOTIC = "antibiotic"
    TOPICAL = "topical"
    INHALER = "inhaler"
    OTHER = "other"


class MedicationStatus(str, enum.Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    DISCONTINUED = "discontinued"
    ON_HOLD = "on_hold"


class Medication(Base):
    __tablename__ = "medications"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)

    # ── Medication Details ──
    medicine_name = Column(String(255), nullable=False)
    generic_name = Column(String(255), nullable=True)
    dose = Column(String(100), nullable=False)         # e.g., "500mg"
    frequency = Column(String(100), nullable=False)    # e.g., "3x daily"
    route = Column(Enum(MedicationType), default=MedicationType.ORAL)
    instructions = Column(Text, nullable=True)

    # ── Schedule ──
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    next_dose_at = Column(DateTime, nullable=True)

    # ── Administration Tracking ──
    doses_given = Column(Integer, default=0)
    doses_missed = Column(Integer, default=0)
    doses_total = Column(Integer, nullable=True)
    status = Column(Enum(MedicationStatus), default=MedicationStatus.ACTIVE)

    # ── Prescribed By ──
    prescribed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    administered_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    last_administered_at = Column(DateTime, nullable=True)

    # ── Notes ──
    notes = Column(Text, nullable=True)
    side_effects = Column(Text, nullable=True)

    # ── Timestamps ──
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<Medication {self.medicine_name} {self.dose} for patient={self.patient_id}>"
