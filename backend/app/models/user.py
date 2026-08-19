# -*- coding: utf-8 -*-
"""
User Model
==========
Stores all system users with role-based access control.
Roles: SUPER_ADMIN, HOSPITAL_ADMIN, DOCTOR, NURSE, RECEPTIONIST, PATIENT, CAREGIVER
"""

import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Enum, Text, ForeignKey
)
from ..database import Base


class UserRole(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    HOSPITAL_ADMIN = "hospital_admin"
    DOCTOR = "doctor"
    NURSE = "nurse"
    RECEPTIONIST = "receptionist"
    PATIENT = "patient"
    CAREGIVER = "caregiver"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.PATIENT)

    # Profile
    phone = Column(String(20), nullable=True)
    profile_photo = Column(String(500), nullable=True)
    specialization = Column(String(255), nullable=True)  # For doctors
    department = Column(String(255), nullable=True)
    license_number = Column(String(100), nullable=True)  # For doctors/nurses

    # Hospital Assignment
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=True)

    # Doctor-specific fields
    experience_years = Column(Integer, nullable=True)
    rating_avg = Column(Float, nullable=True)
    rating_count = Column(Integer, default=0)
    current_workload = Column(Integer, default=0)  # number of active patients
    consultation_time_avg = Column(Integer, default=15)  # avg minutes per consultation

    # Caregiver-specific fields
    linked_patient_id = Column(Integer, ForeignKey("patients.id", use_alter=True), nullable=True)
    caregiver_relation = Column(String(100), nullable=True)  # spouse, parent, child, etc.

    # Status
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    last_login = Column(DateTime, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<User {self.username} ({self.role.value})>"
