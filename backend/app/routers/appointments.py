# -*- coding: utf-8 -*-
"""
Appointments Router
===================
Appointment booking, listing, status updates, doctor-patient scheduling,
automated doctor notifications, audit logging, and real-time synchronization.
"""

from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.user import User, UserRole
from ..models.patient import Patient
from ..models.appointment import Appointment, AppointmentStatus
from ..models.patient_timeline import TimelineEvent, TimelineEventType
from ..models.notification import Notification, NotificationChannel
from ..models.audit_log import AuditAction
from ..schemas.hip_schemas import (
    AppointmentCreate,
    AppointmentUpdate,
    AppointmentResponse,
)
from ..services.auth_service import get_current_user
from ..services.audit_service import log_audit_event
from ..services.websocket_manager import trigger_background_broadcast

router = APIRouter(prefix="/api/appointments", tags=["Appointments"])


def _to_response(appt: Appointment, db: Session) -> AppointmentResponse:
    patient = db.query(Patient).filter(Patient.id == appt.patient_id).first()
    doctor = db.query(User).filter(User.id == appt.doctor_id).first()

    return AppointmentResponse(
        id=appt.id,
        patient_id=appt.patient_id,
        patient_name=patient.full_name if patient else "Unknown Patient",
        patient_uid=patient.patient_uid if patient else None,
        doctor_id=appt.doctor_id,
        doctor_name=doctor.full_name if doctor else "Unknown Doctor",
        doctor_specialization=doctor.specialization if doctor else None,
        scheduled_at=appt.scheduled_at,
        duration_minutes=appt.duration_minutes or 30,
        appointment_type=appt.appointment_type or "checkup",
        status=appt.status.value if hasattr(appt.status, "value") else str(appt.status),
        reason=appt.reason,
        doctor_notes=appt.doctor_notes,
        diagnosis=appt.diagnosis,
        treatment_plan=appt.treatment_plan,
        created_at=appt.created_at or datetime.utcnow(),
    )


@router.get("", response_model=List[AppointmentResponse])
@router.get("/", response_model=List[AppointmentResponse], include_in_schema=False)
def get_appointments(
    patient_id: Optional[int] = Query(None),
    doctor_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get appointments with optional filters."""
    q = db.query(Appointment)
    if patient_id:
        q = q.filter(Appointment.patient_id == patient_id)
    if doctor_id:
        q = q.filter(Appointment.doctor_id == doctor_id)
    if status and status != "all":
        try:
            q = q.filter(Appointment.status == AppointmentStatus(status))
        except ValueError:
            pass

    appts = q.order_by(Appointment.scheduled_at.desc()).limit(limit).all()
    return [_to_response(a, db) for a in appts]


@router.post("", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_appointment(
    data: AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Book a new consultation appointment and synchronize across doctor, receptionist & patient views."""
    patient = db.query(Patient).filter(Patient.id == data.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    doctor = db.query(User).filter(User.id == data.doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    appt = Appointment(
        patient_id=data.patient_id,
        doctor_id=data.doctor_id,
        scheduled_at=data.scheduled_at,
        duration_minutes=data.duration_minutes or 30,
        appointment_type=data.appointment_type or "consultation",
        status=AppointmentStatus.SCHEDULED,
        reason=data.reason,
        doctor_notes=data.doctor_notes,
        created_at=datetime.utcnow(),
    )
    db.add(appt)
    db.commit()
    db.refresh(appt)

    # 1. Notify Assigned Doctor
    doc_notif = Notification(
        recipient_id=doctor.id,
        channel=NotificationChannel.IN_APP,
        title="📅 New Consultation Booked",
        message=f"New appointment with {patient.full_name} ({patient.patient_uid or f'PAT-{patient.id}'}) scheduled for {data.scheduled_at.strftime('%b %d, %H:%M')}. Reason: {data.reason or 'Cardiac Review'}",
        patient_id=patient.id,
        is_sent=True,
        is_read=False,
        sent_at=datetime.utcnow(),
        created_at=datetime.utcnow(),
    )
    db.add(doc_notif)

    # 2. Notify Patient (if user linked)
    if patient.user_id:
        pat_notif = Notification(
            recipient_id=patient.user_id,
            channel=NotificationChannel.IN_APP,
            title="📅 Appointment Confirmed",
            message=f"Your appointment with {doctor.full_name} ({doctor.specialization or 'Cardiology'}) has been booked for {data.scheduled_at.strftime('%b %d, %H:%M')}.",
            patient_id=patient.id,
            is_sent=True,
            is_read=False,
            sent_at=datetime.utcnow(),
            created_at=datetime.utcnow(),
        )
        db.add(pat_notif)

    # 3. Log to Patient Timeline
    timeline_event = TimelineEvent(
        patient_id=data.patient_id,
        event_type=TimelineEventType.DOCTOR_VISIT,
        title=f"Consultation Booked with {doctor.full_name}",
        description=f"Scheduled for {data.scheduled_at.strftime('%Y-%m-%d %H:%M')}. Reason: {data.reason or 'Cardiac evaluation'}",
        icon="📅",
        created_by=current_user.id,
        event_at=datetime.utcnow(),
    )
    db.add(timeline_event)
    db.commit()

    # 4. Log to System Audit Trail
    log_audit_event(
        db=db,
        action=AuditAction.BOOK_APPOINTMENT,
        entity_type="appointment",
        entity_id=appt.id,
        user=current_user,
        description=f"Appointment booked for {patient.full_name} with {doctor.full_name} on {data.scheduled_at.strftime('%Y-%m-%d %H:%M')} by {current_user.full_name} ({current_user.role.value}).",
        new_value={
            "appointment_id": appt.id,
            "patient_id": patient.id,
            "doctor_id": doctor.id,
            "scheduled_at": data.scheduled_at.isoformat(),
            "appointment_type": data.appointment_type,
        },
    )

    # 5. Broadcast live WebSocket event
    response_obj = _to_response(appt, db)
    trigger_background_broadcast("appointment_created", response_obj.model_dump(mode="json"))

    return response_obj


@router.get("/{id}", response_model=AppointmentResponse)
def get_appointment(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get single appointment details."""
    appt = db.query(Appointment).filter(Appointment.id == id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return _to_response(appt, db)


@router.put("/{id}", response_model=AppointmentResponse)
def update_appointment(
    id: int,
    data: AppointmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update appointment details or status (e.g. Confirmed, Completed, Cancelled)."""
    appt = db.query(Appointment).filter(Appointment.id == id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    old_status = appt.status.value if hasattr(appt.status, "value") else str(appt.status)
    update_dict = data.model_dump(exclude_unset=True)

    if "status" in update_dict and update_dict["status"]:
        try:
            update_dict["status"] = AppointmentStatus(update_dict["status"])
        except ValueError:
            pass

    for key, value in update_dict.items():
        setattr(appt, key, value)

    db.commit()
    db.refresh(appt)

    patient = db.query(Patient).filter(Patient.id == appt.patient_id).first()
    doctor = db.query(User).filter(User.id == appt.doctor_id).first()

    # Log to Audit Trail
    log_audit_event(
        db=db,
        action=AuditAction.UPDATE_APPOINTMENT,
        entity_type="appointment",
        entity_id=appt.id,
        user=current_user,
        description=f"Appointment #{appt.id} updated by {current_user.full_name}. Status changed from {old_status} to {appt.status.value if hasattr(appt.status, 'value') else appt.status}.",
        new_value=update_dict,
    )

    # Broadcast update
    response_obj = _to_response(appt, db)
    trigger_background_broadcast("appointment_updated", response_obj.model_dump(mode="json"))

    return response_obj


@router.delete("/{id}")
def cancel_appointment(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cancel an appointment."""
    appt = db.query(Appointment).filter(Appointment.id == id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    appt.status = AppointmentStatus.CANCELLED
    db.commit()

    patient = db.query(Patient).filter(Patient.id == appt.patient_id).first()
    doctor = db.query(User).filter(User.id == appt.doctor_id).first()

    log_audit_event(
        db=db,
        action=AuditAction.CANCEL_APPOINTMENT,
        entity_type="appointment",
        entity_id=appt.id,
        user=current_user,
        description=f"Appointment #{appt.id} CANCELLED by {current_user.full_name} for patient {patient.full_name if patient else f'#{appt.patient_id}'}.",
    )

    trigger_background_broadcast("appointment_cancelled", {"id": id, "status": "cancelled"})

    return {"message": "Appointment cancelled successfully", "id": id}
