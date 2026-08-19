# -*- coding: utf-8 -*-
"""
Hospital & Department Models
=============================
Multi-hospital support with department hierarchy.
"""

from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey
)
from ..database import Base


class Hospital(Base):
    __tablename__ = "hospitals"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False, unique=True)
    code = Column(String(20), unique=True, index=True, nullable=False)  # e.g., "HSP-001"

    # ── Location ──
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    country = Column(String(100), default="India")
    pincode = Column(String(10), nullable=True)

    # ── Contact ──
    phone = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
    website = Column(String(500), nullable=True)

    # ── Capacity ──
    total_beds = Column(Integer, default=100)
    icu_beds = Column(Integer, default=10)
    emergency_beds = Column(Integer, default=15)

    # ── Sustainability ──
    carbon_savings_kg = Column(Float, default=0.0)
    solar_panels = Column(Boolean, default=False)
    green_rating = Column(String(10), nullable=True)  # A, B, C, D

    # ── Status ──
    is_active = Column(Boolean, default=True)
    established_year = Column(Integer, nullable=True)
    logo_path = Column(String(500), nullable=True)

    # ── Timestamps ──
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<Hospital {self.code}: {self.name}>"


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    code = Column(String(20), nullable=True)  # e.g., "CARD", "NEURO"

    # ── Details ──
    floor = Column(String(20), nullable=True)
    wing = Column(String(50), nullable=True)
    bed_count = Column(Integer, default=0)
    head_doctor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    phone_ext = Column(String(10), nullable=True)

    # ── Status ──
    is_active = Column(Boolean, default=True)

    # ── Timestamps ──
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<Department {self.name} @ hospital={self.hospital_id}>"
