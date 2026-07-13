# -*- coding: utf-8 -*-
"""
Vital Signs Model
=================
Stores individual vital sign readings from IoT sensors or manual entry.
"""

import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, Float, String, DateTime, Enum, Text,
    ForeignKey, JSON
)
from ..database import Base


class VitalSource(str, enum.Enum):
    IOT_ESP32 = "iot_esp32"
    MANUAL = "manual"
    IMPORT = "import"


class VitalSign(Base):
    __tablename__ = "vital_signs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)

    # ── Core Vitals ──
    heart_rate = Column(Float, nullable=True)          # bpm
    spo2 = Column(Float, nullable=True)                # %
    temperature = Column(Float, nullable=True)         # °C
    bp_systolic = Column(Integer, nullable=True)       # mmHg
    bp_diastolic = Column(Integer, nullable=True)      # mmHg
    respiratory_rate = Column(Float, nullable=True)    # breaths/min
    pulse = Column(Float, nullable=True)               # bpm (separate from HR)

    # ── ECG Data ──
    ecg_data = Column(JSON, nullable=True)             # Array of ECG values
    ecg_interpretation = Column(String(255), nullable=True)

    # ── Extended Vitals ──
    activity_level = Column(String(50), nullable=True)  # resting, walking, sleeping
    sleep_status = Column(String(50), nullable=True)    # awake, light, deep, rem
    stress_level = Column(Integer, nullable=True)       # 0-10
    pain_level = Column(Integer, nullable=True)         # 0-10

    # ── Metadata ──
    source = Column(Enum(VitalSource), default=VitalSource.MANUAL)
    device_id = Column(String(100), nullable=True)     # ESP32 device identifier
    recorded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    notes = Column(Text, nullable=True)

    # ── Timestamps ──
    recorded_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<VitalSign patient={self.patient_id} HR={self.heart_rate} SpO2={self.spo2} @ {self.recorded_at}>"
