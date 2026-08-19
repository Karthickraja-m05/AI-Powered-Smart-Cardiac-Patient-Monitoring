# -*- coding: utf-8 -*-
"""
Hospital Router
================
CRUD for hospitals and departments (admin-only).
"""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.user import User, UserRole
from ..models.hospital import Hospital, Department
from ..schemas.hip_schemas import (
    HospitalCreate, HospitalResponse, DepartmentCreate, DepartmentResponse,
)
from ..services.auth_service import get_current_user, require_roles

router = APIRouter(prefix="/api/hospitals", tags=["Hospitals"])


# ── Hospitals ──

@router.post("", response_model=HospitalResponse, status_code=201)
def create_hospital(
    data: HospitalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN)),
):
    """Create a new hospital."""
    existing = db.query(Hospital).filter(Hospital.code == data.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Hospital code already exists")
    hospital = Hospital(**data.model_dump())
    db.add(hospital)
    db.commit()
    db.refresh(hospital)
    return HospitalResponse.model_validate(hospital)


@router.get("", response_model=list[HospitalResponse])
def list_hospitals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all hospitals."""
    hospitals = db.query(Hospital).filter(Hospital.is_active == True).all()
    return [HospitalResponse.model_validate(h) for h in hospitals]


@router.get("/{hospital_id}", response_model=HospitalResponse)
def get_hospital(
    hospital_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get hospital details."""
    hospital = db.query(Hospital).filter(Hospital.id == hospital_id).first()
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")
    return HospitalResponse.model_validate(hospital)


@router.put("/{hospital_id}", response_model=HospitalResponse)
def update_hospital(
    hospital_id: int,
    data: HospitalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN)),
):
    """Update a hospital."""
    hospital = db.query(Hospital).filter(Hospital.id == hospital_id).first()
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")
    for key, value in data.model_dump().items():
        setattr(hospital, key, value)
    db.commit()
    db.refresh(hospital)
    return HospitalResponse.model_validate(hospital)


# ── Departments ──

@router.post("/departments", response_model=DepartmentResponse, status_code=201)
def create_department(
    data: DepartmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN)),
):
    """Create a department within a hospital."""
    hospital = db.query(Hospital).filter(Hospital.id == data.hospital_id).first()
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")
    dept = Department(**data.model_dump())
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return DepartmentResponse.model_validate(dept)


@router.get("/{hospital_id}/departments", response_model=list[DepartmentResponse])
def list_departments(
    hospital_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all departments for a hospital."""
    depts = db.query(Department).filter(
        Department.hospital_id == hospital_id,
        Department.is_active == True,
    ).all()
    return [DepartmentResponse.model_validate(d) for d in depts]
