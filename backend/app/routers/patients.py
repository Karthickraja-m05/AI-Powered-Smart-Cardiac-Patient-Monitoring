# -*- coding: utf-8 -*-
"""
Patient Router
==============
Full CRUD with search, filtering, pagination, file uploads,
audit logging, and real-time dashboard event triggers.
"""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import or_

from ..database import get_db
from ..models.user import User, UserRole
from ..models.patient import Patient, PatientStatus
from ..models.audit_log import AuditAction
from ..schemas.patient_schema import (
    PatientCreate, PatientUpdate, PatientResponse, PatientListResponse,
)
from ..services.auth_service import get_current_user
from ..services.load_balancer_service import DoctorLoadBalancer
from ..services.audit_service import log_audit_event
from ..services.websocket_manager import trigger_background_broadcast

router = APIRouter(prefix="/api/patients", tags=["Patients"])


def _generate_patient_uid(db: Session) -> str:
    """Generate unique patient ID like PAT-00001."""
    count = db.query(Patient).count()
    return f"PAT-{str(count + 1).zfill(5)}"


@router.post("", response_model=PatientResponse, status_code=201)
@router.post("/", response_model=PatientResponse, status_code=201, include_in_schema=False)
def create_patient(
    data: PatientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new patient record, auto-assign doctor, and log audit trail."""
    # Compute BMI if height and weight provided
    bmi = None
    if data.height_cm and data.weight_kg:
        height_m = data.height_cm / 100
        bmi = round(data.weight_kg / (height_m ** 2), 1)

    uid = _generate_patient_uid(db)
    patient = Patient(
        patient_uid=uid,
        **data.model_dump(),
        bmi=bmi,
        status=PatientStatus.ADMITTED,
        admission_date=datetime.utcnow(),
        created_at=datetime.utcnow(),
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)

    # ── Auto-assign doctor via Load Balancer if none specified ──
    if not patient.assigned_doctor_id and patient.hospital_id:
        try:
            lb = DoctorLoadBalancer(db)
            lb.assign_doctor(
                patient_id=patient.id,
                hospital_id=patient.hospital_id,
                urgency_level=(
                    "emergency" if patient.status == PatientStatus.EMERGENCY
                    else "critical" if patient.status == PatientStatus.ICU
                    else "normal"
                ),
            )
            db.refresh(patient)
        except (ValueError, Exception):
            pass

    # Log to audit trail
    log_audit_event(
        db=db,
        action=AuditAction.CREATE,
        entity_type="patient",
        entity_id=patient.id,
        user=current_user,
        description=f"New patient registered: {patient.full_name} ({patient.patient_uid}) by {current_user.full_name} ({current_user.role.value}). Ward: {patient.ward or 'General'}, Room: {patient.room_number or 'N/A'}.",
        new_value={"patient_uid": patient.patient_uid, "full_name": patient.full_name, "ward": patient.ward},
    )

    # Broadcast event
    trigger_background_broadcast("patient_registered", {
        "id": patient.id,
        "patient_uid": patient.patient_uid,
        "full_name": patient.full_name,
        "status": patient.status.value if hasattr(patient.status, "value") else str(patient.status),
        "ward": patient.ward,
    })

    return PatientResponse.model_validate(patient)


@router.get("", response_model=PatientListResponse)
@router.get("/", response_model=PatientListResponse, include_in_schema=False)
def list_patients(
    search: Optional[str] = Query(None, description="Search by name, UID, or phone"),
    status: Optional[str] = Query(None, description="Filter by status"),
    risk_level: Optional[str] = Query(None, description="Filter by risk level"),
    doctor_id: Optional[int] = Query(None, description="Filter by assigned doctor"),
    nurse_id: Optional[int] = Query(None, description="Filter by assigned nurse"),
    hospital_id: Optional[int] = Query(None, description="Filter by hospital"),
    ward: Optional[str] = Query(None, description="Filter by ward"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    sort_by: str = Query("created_at", description="Sort field"),
    sort_desc: bool = Query(True, description="Sort descending"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List patients with search, filtering, and pagination."""
    query = db.query(Patient)

    # Role-based scoping
    if current_user.role == UserRole.PATIENT:
        query = query.filter(Patient.user_id == current_user.id)
    elif current_user.role == UserRole.CAREGIVER:
        if current_user.linked_patient_id:
            query = query.filter(Patient.id == current_user.linked_patient_id)
        else:
            return PatientListResponse(total=0, page=page, per_page=per_page, pages=0, patients=[])

    if search:
        pattern = f"%{search}%"
        query = query.filter(
            or_(
                Patient.first_name.ilike(pattern),
                Patient.last_name.ilike(pattern),
                Patient.patient_uid.ilike(pattern),
                Patient.phone.ilike(pattern),
            )
        )

    if status and status != "all":
        try:
            query = query.filter(Patient.status == PatientStatus(status))
        except ValueError:
            pass

    if risk_level and risk_level != "all":
        query = query.filter(Patient.current_risk_level == risk_level)

    if doctor_id:
        query = query.filter(Patient.assigned_doctor_id == doctor_id)
    if nurse_id:
        query = query.filter(Patient.assigned_nurse_id == nurse_id)
    if hospital_id:
        query = query.filter(Patient.hospital_id == hospital_id)
    if ward and ward != "all":
        query = query.filter(Patient.ward == ward)

    total = query.count()

    sort_col = getattr(Patient, sort_by, Patient.created_at)
    query = query.order_by(sort_col.desc() if sort_desc else sort_col.asc())

    pages = (total + per_page - 1) // per_page
    patients = query.offset((page - 1) * per_page).limit(per_page).all()

    return PatientListResponse(
        total=total,
        page=page,
        per_page=per_page,
        pages=pages,
        patients=[PatientResponse.model_validate(p) for p in patients],
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

    height = update_data.get("height_cm", patient.height_cm)
    weight = update_data.get("weight_kg", patient.weight_kg)
    if height and weight:
        update_data["bmi"] = round(weight / ((height / 100) ** 2), 1)

    for key, value in update_data.items():
        setattr(patient, key, value)

    patient.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(patient)

    log_audit_event(
        db=db,
        action=AuditAction.UPDATE,
        entity_type="patient",
        entity_id=patient.id,
        user=current_user,
        description=f"Patient record updated for {patient.full_name} ({patient.patient_uid}) by {current_user.full_name}.",
        new_value=update_data,
    )

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

    p_uid = patient.patient_uid
    p_name = patient.full_name
    db.delete(patient)
    db.commit()

    log_audit_event(
        db=db,
        action=AuditAction.DELETE,
        entity_type="patient",
        entity_id=patient_id,
        user=current_user,
        description=f"Patient record DELETED: {p_name} ({p_uid}) by admin {current_user.full_name}.",
    )

    return {"message": f"Patient {p_uid} deleted successfully"}


@router.post("/{patient_id}/discharge", response_model=PatientResponse)
def discharge_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Discharge a patient and log audit trail."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    patient.status = PatientStatus.DISCHARGED
    patient.discharge_date = datetime.utcnow()
    patient.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(patient)

    log_audit_event(
        db=db,
        action=AuditAction.DISCHARGE,
        entity_type="patient",
        entity_id=patient.id,
        user=current_user,
        description=f"Patient {patient.full_name} ({patient.patient_uid}) DISCHARGED by {current_user.full_name} ({current_user.role.value}).",
    )

    trigger_background_broadcast("patient_discharged", {
        "id": patient.id,
        "patient_uid": patient.patient_uid,
        "full_name": patient.full_name,
        "discharge_date": patient.discharge_date.isoformat(),
    })

    return PatientResponse.model_validate(patient)
