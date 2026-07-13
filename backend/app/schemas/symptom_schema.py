# -*- coding: utf-8 -*-
"""Symptom Schemas."""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class SymptomCreate(BaseModel):
    patient_id: int
    chest_pain: bool = False
    arm_pain: bool = False
    jaw_pain: bool = False
    shoulder_pain: bool = False
    neck_pain: bool = False
    back_pain: bool = False
    body_pain: bool = False
    breathing_difficulty: bool = False
    shortness_of_breath: bool = False
    cough: bool = False
    palpitations: bool = False
    dizziness: bool = False
    loss_of_consciousness: bool = False
    vomiting: bool = False
    fatigue: bool = False
    sweating: bool = False
    swelling: bool = False
    fever: bool = False
    headache: bool = False
    pain_score: Optional[int] = Field(None, ge=0, le=10)
    notes: Optional[str] = None


class SymptomResponse(BaseModel):
    id: int
    patient_id: int
    chest_pain: bool
    arm_pain: bool
    jaw_pain: bool
    shoulder_pain: bool
    neck_pain: bool
    back_pain: bool
    body_pain: bool
    breathing_difficulty: bool
    shortness_of_breath: bool
    cough: bool
    palpitations: bool
    dizziness: bool
    loss_of_consciousness: bool
    vomiting: bool
    fatigue: bool
    sweating: bool
    swelling: bool
    fever: bool
    headache: bool
    pain_score: Optional[int] = None
    notes: Optional[str] = None
    recorded_by: Optional[int] = None
    recorded_at: datetime

    class Config:
        from_attributes = True
