# -*- coding: utf-8 -*-
"""Patient Schemas — CRUD, search, file uploads."""

from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, Field


class PatientCreate(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    date_of_birth: Optional[date] = None
    age: Optional[int] = Field(None, ge=0, le=150)
    gender: str = Field(..., pattern="^(Male|Female|Other)$")
    blood_group: Optional[str] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relation: Optional[str] = None
    insurance_provider: Optional[str] = None
    insurance_policy_number: Optional[str] = None
    ward: Optional[str] = None
    room_number: Optional[str] = None
    bed_number: Optional[str] = None
    assigned_doctor_id: Optional[int] = None
    assigned_nurse_id: Optional[int] = None
    admission_reason: Optional[str] = None
    medical_history: Optional[str] = None
    previous_surgeries: Optional[str] = None
    allergies: Optional[str] = None
    family_history: Optional[str] = None
    is_smoker: bool = False
    alcohol_use: bool = False
    has_hypertension: bool = False
    has_diabetes: bool = False
    has_kidney_disease: bool = False
    has_previous_heart_disease: bool = False
    current_medications: Optional[str] = None


class PatientUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relation: Optional[str] = None
    insurance_provider: Optional[str] = None
    insurance_policy_number: Optional[str] = None
    ward: Optional[str] = None
    room_number: Optional[str] = None
    bed_number: Optional[str] = None
    assigned_doctor_id: Optional[int] = None
    assigned_nurse_id: Optional[int] = None
    status: Optional[str] = None
    medical_history: Optional[str] = None
    previous_surgeries: Optional[str] = None
    allergies: Optional[str] = None
    family_history: Optional[str] = None
    is_smoker: Optional[bool] = None
    alcohol_use: Optional[bool] = None
    has_hypertension: Optional[bool] = None
    has_diabetes: Optional[bool] = None
    has_kidney_disease: Optional[bool] = None
    has_previous_heart_disease: Optional[bool] = None
    current_medications: Optional[str] = None


class PatientResponse(BaseModel):
    id: int
    patient_uid: str
    first_name: str
    last_name: str
    date_of_birth: Optional[date] = None
    age: Optional[int] = None
    gender: str
    blood_group: Optional[str] = None
    photo: Optional[str] = None
    qr_code: Optional[str] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    bmi: Optional[float] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relation: Optional[str] = None
    insurance_provider: Optional[str] = None
    insurance_policy_number: Optional[str] = None
    status: Optional[str] = None
    ward: Optional[str] = None
    room_number: Optional[str] = None
    bed_number: Optional[str] = None
    assigned_doctor_id: Optional[int] = None
    assigned_nurse_id: Optional[int] = None
    admission_date: Optional[datetime] = None
    discharge_date: Optional[datetime] = None
    admission_reason: Optional[str] = None
    medical_history: Optional[str] = None
    previous_surgeries: Optional[str] = None
    allergies: Optional[str] = None
    family_history: Optional[str] = None
    is_smoker: bool = False
    alcohol_use: bool = False
    has_hypertension: bool = False
    has_diabetes: bool = False
    has_kidney_disease: bool = False
    has_previous_heart_disease: bool = False
    current_medications: Optional[str] = None
    current_risk_level: Optional[str] = None
    current_risk_score: Optional[float] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PatientListResponse(BaseModel):
    patients: List[PatientResponse]
    total: int
    page: int
    per_page: int


class PatientSearchQuery(BaseModel):
    query: Optional[str] = None
    ward: Optional[str] = None
    doctor_id: Optional[int] = None
    status: Optional[str] = None
    risk_level: Optional[str] = None
    page: int = 1
    per_page: int = 20
