# -*- coding: utf-8 -*-
"""
Patient Router
==============
Full CRUD with search, filtering, pagination, and file uploads.
"""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import or_

from ..database import get_db
from ..models.user import User, UserRole
from ..models.patient import Patient, PatientStatus
from ..schemas.patient_schema import (
    PatientCreate, PatientUpdate, PatientResponse, PatientListResponse,
)
from ..services.auth_service import get_current_user

router = APIRouter(prefix="/api/patients", tags=["Patients"])


def _generate_patient_uid(db: Session) -> str:
    """Generate unique patient ID like PAT-00001."""
    count = db.query(Patient).count()
    return f"PAT-{str(count + 1).zfill(5)}"


@router.post("", response_model=PatientResponse, status_code=201)
def create_patient(
    data: PatientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new patient record."""
    # Compute BMI if height and weight provided
    bmi = None
    if data.height_cm and data.weight_kg:
        height_m = data.height_cm / 100
        bmi = round(data.weight_kg / (height_m ** 2), 1)

    patient = Patient(
        patient_uid=_generate_patient_uid(db),
        **data.model_dump(),
        bmi=bmi,
        status=PatientStatus.ADMITTED,
        admission_date=datetime.utcnow(),
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return PatientResponse.model_validate(patient)


@router.get("", response_model=PatientListResponse)
def list_patients(
    query: Optional[str] = None,
    ward: Optional[str] = None,
    status: Optional[str] = None,
    risk_level: Optional[str] = None,
    doctor_id: Optional[int] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List patients with search, filtering, and pagination."""
    q = db.query(Patient)

    # Search by name, patient UID, phone, bed number
    if query:
        search = f"%{query}%"
        q = q.filter(or_(
            Patient.first_name.ilike(search),
            Patient.last_name.ilike(search),
            Patient.patient_uid.ilike(search),
            Patient.phone.ilike(search),
            Patient.bed_number.ilike(search),
        ))

    if ward:
        q = q.filter(Patient.ward == ward)
    if status:
        q = q.filter(Patient.status == PatientStatus(status))
    if risk_level:
        q = q.filter(Patient.current_risk_level == risk_level)
    if doctor_id:
        q = q.filter(Patient.assigned_doctor_id == doctor_id)

    # Role-based filtering
    if current_user.role == UserRole.DOCTOR:
        q = q.filter(Patient.assigned_doctor_id == current_user.id)
    elif current_user.role == UserRole.NURSE:
        q = q.filter(Patient.assigned_nurse_id == current_user.id)
    elif current_user.role == UserRole.PATIENT:
        q = q.filter(Patient.user_id == current_user.id)

    total = q.count()
    patients = q.order_by(Patient.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()

    return PatientListResponse(
        patients=[PatientResponse.model_validate(p) for p in patients],
        total=total,
        page=page,
        per_page=per_page,
    )


@router.get("/{patient_id}", response_model=PatientResponse)
def get_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single patient by ID."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return PatientResponse.model_validate(patient)


@router.put("/{patient_id}", response_model=PatientResponse)
def update_patient(
    patient_id: int,
    data: PatientUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a patient record."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    update_data = data.model_dump(exclude_unset=True)

    # Recompute BMI if height or weight changed
    height = update_data.get("height_cm", patient.height_cm)
    weight = update_data.get("weight_kg", patient.weight_kg)
    if height and weight:
        update_data["bmi"] = round(weight / ((height / 100) ** 2), 1)

    for key, value in update_data.items():
        setattr(patient, key, value)

    db.commit()
    db.refresh(patient)
    return PatientResponse.model_validate(patient)


@router.delete("/{patient_id}")
def delete_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a patient record (admin only)."""
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN]:
        raise HTTPException(status_code=403, detail="Only admins can delete patients")

    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    db.delete(patient)
    db.commit()
    return {"message": f"Patient {patient.patient_uid} deleted"}


@router.post("/{patient_id}/discharge", response_model=PatientResponse)
def discharge_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Discharge a patient."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    patient.status = PatientStatus.DISCHARGED
    patient.discharge_date = datetime.utcnow()
    db.commit()
    db.refresh(patient)
    return PatientResponse.model_validate(patient)
