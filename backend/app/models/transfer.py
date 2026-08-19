# -*- coding: utf-8 -*-
"""
Patient Transfer Model
=======================
Track patient transfers between doctors, wards, rooms, and hospitals.
"""

import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, DateTime, Enum, Text, ForeignKey
)
from ..database import Base


class TransferType(str, enum.Enum):
    DOCTOR = "doctor"
    WARD = "ward"
    ROOM = "room"
    HOSPITAL = "hospital"


class TransferStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class PatientTransfer(Base):
    __tablename__ = "patient_transfers"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    transfer_type = Column(Enum(TransferType), nullable=False)

    # ── From ──
    from_doctor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    from_ward = Column(String(100), nullable=True)
    from_room = Column(String(20), nullable=True)
    from_bed = Column(String(20), nullable=True)
    from_hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=True)

    # ── To ──
    to_doctor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    to_ward = Column(String(100), nullable=True)
    to_room = Column(String(20), nullable=True)
    to_bed = Column(String(20), nullable=True)
    to_hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=True)

    # ── Details ──
    reason = Column(Text, nullable=True)
    status = Column(Enum(TransferStatus), default=TransferStatus.PENDING)
    transferred_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # ── Timestamps ──
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)

    def __repr__(self):
        return f"<PatientTransfer patient={self.patient_id} type={self.transfer_type.value}>"
