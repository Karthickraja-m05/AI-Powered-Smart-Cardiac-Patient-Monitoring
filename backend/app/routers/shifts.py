# -*- coding: utf-8 -*-
"""
Shifts Router
==============
Doctor and nurse shift scheduling and management.
"""

from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.user import User, UserRole
from ..models.shift import DoctorShift, NurseShift, ShiftType
from ..schemas.hip_schemas import ShiftCreate, DoctorShiftResponse, NurseShiftResponse
from ..services.auth_service import get_current_user, require_roles

router = APIRouter(prefix="/api/shifts", tags=["Shift Management"])


# ── Doctor Shifts ──

@router.post("/doctor/{doctor_id}", response_model=DoctorShiftResponse, status_code=201)
def create_doctor_shift(
    doctor_id: int,
    data: ShiftCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(
        UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN
    )),
):
    """Create a doctor shift."""
    shift = DoctorShift(
        doctor_id=doctor_id,
        hospital_id=data.hospital_id,
        department=data.department,
        shift_type=ShiftType(data.shift_type),
        shift_date=data.shift_date,
        start_time=data.start_time,
        end_time=data.end_time,
    )
    db.add(shift)
    db.commit()
    db.refresh(shift)
    return DoctorShiftResponse.model_validate(shift)


@router.get("/doctor/{doctor_id}", response_model=list[DoctorShiftResponse])
def get_doctor_shifts(
    doctor_id: int,
    from_date: date = Query(None),
    to_date: date = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get shifts for a doctor."""
    q = db.query(DoctorShift).filter(DoctorShift.doctor_id == doctor_id)
    if from_date:
        q = q.filter(DoctorShift.shift_date >= from_date)
    if to_date:
        q = q.filter(DoctorShift.shift_date <= to_date)
    shifts = q.order_by(DoctorShift.shift_date.desc()).all()
    return [DoctorShiftResponse.model_validate(s) for s in shifts]


@router.get("/doctor", response_model=list[DoctorShiftResponse])
def get_all_doctor_shifts(
    shift_date: date = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all doctor shifts (optionally for a specific date)."""
    q = db.query(DoctorShift)
    if shift_date:
        q = q.filter(DoctorShift.shift_date == shift_date)
    else:
        q = q.filter(DoctorShift.shift_date == date.today())
    shifts = q.order_by(DoctorShift.shift_date.desc()).all()
    return [DoctorShiftResponse.model_validate(s) for s in shifts]


# ── Nurse Shifts ──

@router.post("/nurse/{nurse_id}", response_model=NurseShiftResponse, status_code=201)
def create_nurse_shift(
    nurse_id: int,
    data: ShiftCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(
        UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN
    )),
):
    """Create a nurse shift."""
    shift = NurseShift(
        nurse_id=nurse_id,
        hospital_id=data.hospital_id,
        ward=data.ward,
        shift_type=ShiftType(data.shift_type),
        shift_date=data.shift_date,
        start_time=data.start_time,
        end_time=data.end_time,
    )
    db.add(shift)
    db.commit()
    db.refresh(shift)
    return NurseShiftResponse.model_validate(shift)


@router.get("/nurse/{nurse_id}", response_model=list[NurseShiftResponse])
def get_nurse_shifts(
    nurse_id: int,
    from_date: date = Query(None),
    to_date: date = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get shifts for a nurse."""
    q = db.query(NurseShift).filter(NurseShift.nurse_id == nurse_id)
    if from_date:
        q = q.filter(NurseShift.shift_date >= from_date)
    if to_date:
        q = q.filter(NurseShift.shift_date <= to_date)
    shifts = q.order_by(NurseShift.shift_date.desc()).all()
    return [NurseShiftResponse.model_validate(s) for s in shifts]


@router.get("/nurse", response_model=list[NurseShiftResponse])
def get_all_nurse_shifts(
    shift_date: date = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all nurse shifts (optionally for a specific date)."""
    q = db.query(NurseShift)
    if shift_date:
        q = q.filter(NurseShift.shift_date == shift_date)
    else:
        q = q.filter(NurseShift.shift_date == date.today())
    shifts = q.order_by(NurseShift.shift_date.desc()).all()
    return [NurseShiftResponse.model_validate(s) for s in shifts]
