# -*- coding: utf-8 -*-
"""
Shift Management Models
========================
Doctor and nurse shift scheduling with workload tracking.
"""

import enum
from datetime import datetime, date
from sqlalchemy import (
    Column, Integer, String, Date, DateTime, Enum, ForeignKey, Boolean
)
from ..database import Base


class ShiftType(str, enum.Enum):
    MORNING = "morning"       # 06:00 – 14:00
    AFTERNOON = "afternoon"   # 14:00 – 22:00
    NIGHT = "night"           # 22:00 – 06:00
    EMERGENCY = "emergency"   # On-call


class DoctorShift(Base):
    __tablename__ = "doctor_shifts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=True)
    department = Column(String(100), nullable=True)

    # ── Schedule ──
    shift_type = Column(Enum(ShiftType), nullable=False)
    shift_date = Column(Date, nullable=False)
    start_time = Column(String(5), nullable=True)   # "06:00"
    end_time = Column(String(5), nullable=True)      # "14:00"

    # ── Status ──
    is_active = Column(Boolean, default=True)
    checked_in = Column(Boolean, default=False)
    checked_in_at = Column(DateTime, nullable=True)
    checked_out_at = Column(DateTime, nullable=True)

    # ── Timestamps ──
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<DoctorShift doctor={self.doctor_id} {self.shift_type.value} {self.shift_date}>"


class NurseShift(Base):
    __tablename__ = "nurse_shifts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nurse_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=True)
    ward = Column(String(100), nullable=True)

    # ── Schedule ──
    shift_type = Column(Enum(ShiftType), nullable=False)
    shift_date = Column(Date, nullable=False)
    start_time = Column(String(5), nullable=True)
    end_time = Column(String(5), nullable=True)

    # ── Workload ──
    patient_count = Column(Integer, default=0)
    max_patients = Column(Integer, default=8)

    # ── Status ──
    is_active = Column(Boolean, default=True)
    checked_in = Column(Boolean, default=False)
    checked_in_at = Column(DateTime, nullable=True)
    checked_out_at = Column(DateTime, nullable=True)

    # ── Timestamps ──
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<NurseShift nurse={self.nurse_id} {self.shift_type.value} {self.shift_date}>"
