# -*- coding: utf-8 -*-
"""
Visitor Management Model
=========================
Visitor registration, QR-based check-in/out, scheduling, and security logs.
"""

import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, DateTime, Enum, Text, ForeignKey, Boolean
)
from ..database import Base


class VisitorStatus(str, enum.Enum):
    REGISTERED = "registered"
    CHECKED_IN = "checked_in"
    CHECKED_OUT = "checked_out"
    DENIED = "denied"
    EXPIRED = "expired"


class Visitor(Base):
    __tablename__ = "visitors"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)

    # ── Visitor Info ──
    visitor_name = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
    relation = Column(String(100), nullable=True)  # spouse, parent, friend, etc.
    id_proof_type = Column(String(50), nullable=True)  # Aadhaar, PAN, etc.
    id_proof_number = Column(String(50), nullable=True)

    # ── QR & Access ──
    qr_code = Column(String(500), nullable=True)  # path to QR image or QR data string
    qr_token = Column(String(100), unique=True, nullable=True)  # unique token for QR

    # ── Visit Schedule ──
    scheduled_date = Column(DateTime, nullable=True)
    scheduled_start = Column(String(5), nullable=True)  # "10:00"
    scheduled_end = Column(String(5), nullable=True)     # "12:00"

    # ── Check-in/out ──
    status = Column(Enum(VisitorStatus), default=VisitorStatus.REGISTERED)
    check_in_at = Column(DateTime, nullable=True)
    check_out_at = Column(DateTime, nullable=True)

    # ── Security ──
    registered_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    notes = Column(Text, nullable=True)
    is_blocked = Column(Boolean, default=False)

    # ── Timestamps ──
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<Visitor {self.visitor_name} for patient={self.patient_id} status={self.status.value}>"
