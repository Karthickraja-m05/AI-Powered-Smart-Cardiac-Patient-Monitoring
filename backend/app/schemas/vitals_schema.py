# -*- coding: utf-8 -*-
"""Vitals Schemas — Recording and querying vital signs."""

from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, Field


class VitalSignCreate(BaseModel):
    patient_id: int
    heart_rate: Optional[float] = Field(None, ge=0, le=300)
    spo2: Optional[float] = Field(None, ge=0, le=100)
    temperature: Optional[float] = Field(None, ge=25, le=45)
    bp_systolic: Optional[int] = Field(None, ge=40, le=300)
    bp_diastolic: Optional[int] = Field(None, ge=20, le=200)
    respiratory_rate: Optional[float] = Field(None, ge=0, le=60)
    pulse: Optional[float] = None
    ecg_data: Optional[List[float]] = None
    ecg_interpretation: Optional[str] = None
    activity_level: Optional[str] = None
    sleep_status: Optional[str] = None
    stress_level: Optional[int] = Field(None, ge=0, le=10)
    pain_level: Optional[int] = Field(None, ge=0, le=10)
    source: str = "manual"
    device_id: Optional[str] = None
    notes: Optional[str] = None


class VitalSignResponse(BaseModel):
    id: int
    patient_id: int
    heart_rate: Optional[float] = None
    spo2: Optional[float] = None
    temperature: Optional[float] = None
    bp_systolic: Optional[int] = None
    bp_diastolic: Optional[int] = None
    respiratory_rate: Optional[float] = None
    pulse: Optional[float] = None
    ecg_data: Optional[Any] = None
    ecg_interpretation: Optional[str] = None
    activity_level: Optional[str] = None
    sleep_status: Optional[str] = None
    stress_level: Optional[int] = None
    pain_level: Optional[int] = None
    source: str
    device_id: Optional[str] = None
    notes: Optional[str] = None
    recorded_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class IoTDataPayload(BaseModel):
    """Payload from ESP32 devices."""
    device_id: str
    patient_id: int
    heart_rate: Optional[float] = None
    spo2: Optional[float] = None
    temperature: Optional[float] = None
    bp_systolic: Optional[int] = None
    bp_diastolic: Optional[int] = None
    respiratory_rate: Optional[float] = None
    ecg_data: Optional[List[float]] = None
    accelerometer: Optional[dict] = None  # {"x": 0.1, "y": 0.2, "z": 9.8}
    timestamp: Optional[str] = None
