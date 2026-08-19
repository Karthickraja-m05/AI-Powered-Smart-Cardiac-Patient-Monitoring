# -*- coding: utf-8 -*-
"""
Patient Transfer Router
========================
Transfer patients between doctors, wards, rooms, and hospitals.
"""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.user import User, UserRole
from ..models.patient import Patient
from ..models.transfer import PatientTransfer, TransferType, TransferStatus
from ..schemas.hip_schemas import TransferCreate, TransferResponse
from ..services.auth_service import get_current_user

router = APIRouter(prefix="/api/transfers", tags=["Patient Transfers"])


@router.post("", response_model=TransferResponse, status_code=201)
def create_transfer(
    data: TransferCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Initiate a patient transfer."""
    patient = db.query(Patient).filter(Patient.id == data.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    transfer = PatientTransfer(
        patient_id=data.patient_id,
        transfer_type=TransferType(data.transfer_type),
        from_doctor_id=patient.assigned_doctor_id,
        from_ward=patient.ward,
        from_room=patient.room_number,
        from_bed=patient.bed_number,
        from_hospital_id=patient.hospital_id,
        to_doctor_id=data.to_doctor_id,
        to_ward=data.to_ward,
        to_room=data.to_room,
        to_bed=data.to_bed,
        to_hospital_id=data.to_hospital_id,
        reason=data.reason,
        transferred_by=current_user.id,
        status=TransferStatus.COMPLETED,
        completed_at=datetime.utcnow(),
    )
    db.add(transfer)

    # Update patient record
    if data.to_doctor_id:
        patient.assigned_doctor_id = data.to_doctor_id
    if data.to_ward:
        patient.ward = data.to_ward
    if data.to_room:
        patient.room_number = data.to_room
    if data.to_bed:
        patient.bed_number = data.to_bed
    if data.to_hospital_id:
        patient.hospital_id = data.to_hospital_id

    db.commit()
    db.refresh(transfer)
    return TransferResponse.model_validate(transfer)


@router.get("/{patient_id}", response_model=list[TransferResponse])
def get_transfer_history(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get transfer history for a patient."""
    transfers = db.query(PatientTransfer).filter(
        PatientTransfer.patient_id == patient_id
    ).order_by(PatientTransfer.created_at.desc()).all()
    return [TransferResponse.model_validate(t) for t in transfers]
