# -*- coding: utf-8 -*-
"""
Doctor Availability & Reassignment Models
==========================================
Track real-time doctor availability and handle reassignment requests.
"""

import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, DateTime, Enum, Text, ForeignKey
)
from ..database import Base


class AvailabilityStatus(str, enum.Enum):
    AVAILABLE = "available"
    BUSY = "busy"
    IN_SURGERY = "in_surgery"
    EMERGENCY = "emergency"
    MEETING = "meeting"
    OFF_DUTY = "off_duty"
    VACATION = "vacation"


class ReassignmentStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    AUTO_ASSIGNED = "auto_assigned"


class DoctorAvailability(Base):
    __tablename__ = "doctor_availability"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True, index=True)
    status = Column(Enum(AvailabilityStatus), default=AvailabilityStatus.AVAILABLE, nullable=False)
    status_message = Column(String(255), nullable=True)  # e.g., "In Surgery – Room 3"
    expected_available_at = Column(DateTime, nullable=True)  # When they expect to be free

    # ── Timestamps ──
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<DoctorAvailability doctor={self.doctor_id} status={self.status.value}>"


class DoctorReassignment(Base):
    __tablename__ = "doctor_reassignments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    from_doctor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    to_doctor_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # null until assigned
    reason = Column(Text, nullable=True)

    # ── Workflow ──
    requested_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(Enum(ReassignmentStatus), default=ReassignmentStatus.PENDING)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # ── Timestamps ──
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    resolved_at = Column(DateTime, nullable=True)

    def __repr__(self):
        return f"<DoctorReassignment patient={self.patient_id} from={self.from_doctor_id} to={self.to_doctor_id}>"
