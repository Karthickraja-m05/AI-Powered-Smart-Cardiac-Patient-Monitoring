# -*- coding: utf-8 -*-
"""
Medications Router
==================
Prescribe, track, and administer medications.
"""

from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.user import User
from ..models.medication import Medication, MedicationType, MedicationStatus
from ..schemas.medication_schema import MedicationCreate, MedicationUpdate, MedicationResponse
from ..services.auth_service import get_current_user

router = APIRouter(prefix="/api/medications", tags=["Medications"])


@router.post("", response_model=MedicationResponse, status_code=201)
def prescribe_medication(
    data: MedicationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Prescribe a new medication for a patient."""
    med = Medication(
        **data.model_dump(),
        route=MedicationType(data.route) if data.route else MedicationType.ORAL,
        prescribed_by=current_user.id,
        status=MedicationStatus.ACTIVE,
    )
    db.add(med)
    db.commit()
    db.refresh(med)
    return MedicationResponse.model_validate(med)


@router.get("/{patient_id}", response_model=List[MedicationResponse])
def get_medications(
    patient_id: int,
    active_only: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get medications for a patient."""
    q = db.query(Medication).filter(Medication.patient_id == patient_id)
    if active_only:
        q = q.filter(Medication.status == MedicationStatus.ACTIVE)
    meds = q.order_by(Medication.created_at.desc()).all()
    return [MedicationResponse.model_validate(m) for m in meds]


@router.put("/{medication_id}", response_model=MedicationResponse)
def update_medication(
    medication_id: int,
    data: MedicationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update medication details (e.g., record administration)."""
    med = db.query(Medication).filter(Medication.id == medication_id).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")

    update_data = data.model_dump(exclude_unset=True)
    if "status" in update_data:
        update_data["status"] = MedicationStatus(update_data["status"])
    for key, value in update_data.items():
        setattr(med, key, value)
    db.commit()
    db.refresh(med)
    return MedicationResponse.model_validate(med)


@router.post("/{medication_id}/administer")
def administer_medication(
    medication_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Record medication administration."""
    med = db.query(Medication).filter(Medication.id == medication_id).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")

    med.doses_given = (med.doses_given or 0) + 1
    med.last_administered_at = datetime.utcnow()
    med.administered_by = current_user.id

    # Check if completed
    if med.doses_total and med.doses_given >= med.doses_total:
        med.status = MedicationStatus.COMPLETED

    db.commit()
    db.refresh(med)
    return {
        "message": f"Dose #{med.doses_given} of {med.medicine_name} administered",
        "doses_given": med.doses_given,
        "doses_total": med.doses_total,
        "status": med.status.value,
    }
