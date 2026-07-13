# -*- coding: utf-8 -*-
"""
Appointment Model
=================
Patient-doctor appointment scheduling.
"""

import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, DateTime, Enum, Text, ForeignKey
)
from ..database import Base


class AppointmentStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    CONFIRMED = "confirmed"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # ── Schedule ──
    scheduled_at = Column(DateTime, nullable=False)
    duration_minutes = Column(Integer, default=30)
    appointment_type = Column(String(100), nullable=True)  # checkup, follow-up, emergency

    # ── Status ──
    status = Column(Enum(AppointmentStatus), default=AppointmentStatus.SCHEDULED)

    # ── Notes ──
    reason = Column(Text, nullable=True)
    doctor_notes = Column(Text, nullable=True)
    diagnosis = Column(Text, nullable=True)
    treatment_plan = Column(Text, nullable=True)

    # ── Timestamps ──
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<Appointment patient={self.patient_id} doctor={self.doctor_id} @ {self.scheduled_at}>"
