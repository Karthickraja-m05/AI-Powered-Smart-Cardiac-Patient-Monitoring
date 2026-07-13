# -*- coding: utf-8 -*-
"""Medication Schemas."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class MedicationCreate(BaseModel):
    patient_id: int
    medicine_name: str = Field(..., min_length=1, max_length=255)
    generic_name: Optional[str] = None
    dose: str = Field(..., min_length=1, max_length=100)
    frequency: str = Field(..., min_length=1, max_length=100)
    route: str = "oral"
    instructions: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    doses_total: Optional[int] = None
    notes: Optional[str] = None


class MedicationUpdate(BaseModel):
    doses_given: Optional[int] = None
    doses_missed: Optional[int] = None
    status: Optional[str] = None
    next_dose_at: Optional[datetime] = None
    last_administered_at: Optional[datetime] = None
    notes: Optional[str] = None
    side_effects: Optional[str] = None


class MedicationResponse(BaseModel):
    id: int
    patient_id: int
    medicine_name: str
    generic_name: Optional[str] = None
    dose: str
    frequency: str
    route: str
    instructions: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    next_dose_at: Optional[datetime] = None
    doses_given: int
    doses_missed: int
    doses_total: Optional[int] = None
    status: str
    prescribed_by: Optional[int] = None
    last_administered_at: Optional[datetime] = None
    notes: Optional[str] = None
    side_effects: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
