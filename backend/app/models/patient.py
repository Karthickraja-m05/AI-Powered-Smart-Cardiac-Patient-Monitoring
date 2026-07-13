# -*- coding: utf-8 -*-
"""
Patient Model
=============
Comprehensive patient record with demographics, medical history,
hospital assignment, and insurance information.
"""

import enum
from datetime import datetime, date
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Date,
    Enum, Text, ForeignKey, JSON
)
from ..database import Base


class BloodGroup(str, enum.Enum):
    A_POS = "A+"
    A_NEG = "A-"
    B_POS = "B+"
    B_NEG = "B-"
    AB_POS = "AB+"
    AB_NEG = "AB-"
    O_POS = "O+"
    O_NEG = "O-"


class PatientStatus(str, enum.Enum):
    ADMITTED = "admitted"
    DISCHARGED = "discharged"
    ICU = "icu"
    EMERGENCY = "emergency"
    OUTPATIENT = "outpatient"
    TRANSFERRED = "transferred"
    DECEASED = "deceased"


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    patient_uid = Column(String(20), unique=True, index=True, nullable=False)  # PAT-00001

    # ── Demographics ──
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    date_of_birth = Column(Date, nullable=True)
    age = Column(Integer, nullable=True)
    gender = Column(String(10), nullable=False)  # Male, Female, Other
    blood_group = Column(Enum(BloodGroup), nullable=True)
    photo = Column(String(500), nullable=True)  # file path
    qr_code = Column(String(500), nullable=True)  # QR code image path

    # ── Body Metrics ──
    height_cm = Column(Float, nullable=True)
    weight_kg = Column(Float, nullable=True)
    bmi = Column(Float, nullable=True)

    # ── Contact ──
    phone = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
    address = Column(Text, nullable=True)
    emergency_contact_name = Column(String(255), nullable=True)
    emergency_contact_phone = Column(String(20), nullable=True)
    emergency_contact_relation = Column(String(50), nullable=True)

    # ── Insurance ──
    insurance_provider = Column(String(255), nullable=True)
    insurance_policy_number = Column(String(100), nullable=True)
    insurance_expiry = Column(Date, nullable=True)

    # ── Hospital Assignment ──
    status = Column(Enum(PatientStatus), default=PatientStatus.ADMITTED)
    ward = Column(String(50), nullable=True)
    room_number = Column(String(20), nullable=True)
    bed_number = Column(String(20), nullable=True)
    assigned_doctor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    assigned_nurse_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # ── Admission ──
    admission_date = Column(DateTime, nullable=True)
    discharge_date = Column(DateTime, nullable=True)
    admission_reason = Column(Text, nullable=True)

    # ── Medical History ──
    medical_history = Column(Text, nullable=True)  # JSON or free text
    previous_surgeries = Column(Text, nullable=True)
    allergies = Column(Text, nullable=True)
    family_history = Column(Text, nullable=True)

    # ── Risk Factors (boolean flags) ──
    is_smoker = Column(Boolean, default=False)
    alcohol_use = Column(Boolean, default=False)
    has_hypertension = Column(Boolean, default=False)
    has_diabetes = Column(Boolean, default=False)
    has_kidney_disease = Column(Boolean, default=False)
    has_previous_heart_disease = Column(Boolean, default=False)

    # ── Current Medications (free text/JSON) ──
    current_medications = Column(Text, nullable=True)

    # ── Uploaded Files (JSON array of file paths) ──
    ecg_files = Column(JSON, default=list)
    xray_files = Column(JSON, default=list)
    mri_files = Column(JSON, default=list)
    ct_scan_files = Column(JSON, default=list)
    lab_report_files = Column(JSON, default=list)
    prescription_files = Column(JSON, default=list)

    # ── AI Risk ──
    current_risk_level = Column(String(20), nullable=True)  # low, medium, high, critical
    current_risk_score = Column(Float, nullable=True)

    # ── Linked User Account ──
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # ── Timestamps ──
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<Patient {self.patient_uid}: {self.first_name} {self.last_name}>"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"
