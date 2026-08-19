# -*- coding: utf-8 -*-
"""
Doctor Availability Router
============================
Manage live doctor status, smart doctor search, reassignment, and waiting times.
"""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..database import get_db
from ..models.user import User, UserRole
from ..models.patient import Patient
from ..models.doctor_availability import (
    DoctorAvailability, AvailabilityStatus,
    DoctorReassignment, ReassignmentStatus,
)
from ..schemas.hip_schemas import (
    AvailabilityUpdate, AvailabilityResponse,
    DoctorSearchResult, ReassignmentRequest, ReassignmentResponse,
    WaitingTimeResponse,
)
from ..services.auth_service import get_current_user

router = APIRouter(prefix="/api/doctors", tags=["Doctor Availability"])


@router.put("/{doctor_id}/availability", response_model=AvailabilityResponse)
def update_availability(
    doctor_id: int,
    data: AvailabilityUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a doctor's availability status."""
    # Only the doctor themselves or admins can update
    if current_user.id != doctor_id and current_user.role not in [
        UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN
    ]:
        raise HTTPException(status_code=403, detail="Not authorized")

    avail = db.query(DoctorAvailability).filter(
        DoctorAvailability.doctor_id == doctor_id
    ).first()

    if not avail:
        avail = DoctorAvailability(
            doctor_id=doctor_id,
            status=AvailabilityStatus(data.status),
            status_message=data.status_message,
            expected_available_at=data.expected_available_at,
        )
        db.add(avail)
    else:
        avail.status = AvailabilityStatus(data.status)
        avail.status_message = data.status_message
        avail.expected_available_at = data.expected_available_at
        avail.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(avail)
    return AvailabilityResponse.model_validate(avail)


@router.get("/{doctor_id}/availability", response_model=AvailabilityResponse)
def get_availability(
    doctor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a doctor's current availability."""
    avail = db.query(DoctorAvailability).filter(
        DoctorAvailability.doctor_id == doctor_id
    ).first()
    if not avail:
        # Default to available if no record
        return AvailabilityResponse(
            id=0, doctor_id=doctor_id, status="available",
            updated_at=datetime.utcnow(),
        )
    return AvailabilityResponse.model_validate(avail)


@router.get("/available", response_model=list[DoctorSearchResult])
def search_available_doctors(
    specialization: str = Query(None),
    department: str = Query(None),
    hospital_id: int = Query(None),
    sort_by: str = Query("workload"),  # workload, rating, experience
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Smart doctor search — find available doctors with filters and sorting."""
    q = db.query(User).filter(User.role == UserRole.DOCTOR, User.is_active == True)

    if specialization:
        q = q.filter(User.specialization.ilike(f"%{specialization}%"))
    if department:
        q = q.filter(User.department.ilike(f"%{department}%"))
    if hospital_id:
        q = q.filter(User.hospital_id == hospital_id)

    doctors = q.all()

    results = []
    for doc in doctors:
        # Check availability
        avail = db.query(DoctorAvailability).filter(
            DoctorAvailability.doctor_id == doc.id
        ).first()
        status = avail.status.value if avail else "available"

        # Count current patients
        workload = db.query(Patient).filter(
            Patient.assigned_doctor_id == doc.id,
            Patient.status.in_(["admitted", "icu", "emergency"]),
        ).count()

        # Estimate wait time
        est_wait = workload * (doc.consultation_time_avg or 15)

        results.append(DoctorSearchResult(
            id=doc.id,
            full_name=doc.full_name,
            specialization=doc.specialization,
            department=doc.department,
            experience_years=doc.experience_years,
            rating_avg=doc.rating_avg,
            rating_count=doc.rating_count or 0,
            current_workload=workload,
            consultation_time_avg=doc.consultation_time_avg or 15,
            availability_status=status,
            estimated_wait_minutes=est_wait,
            profile_photo=doc.profile_photo,
        ))

    # Sort
    if sort_by == "workload":
        results.sort(key=lambda x: x.current_workload)
    elif sort_by == "rating":
        results.sort(key=lambda x: x.rating_avg or 0, reverse=True)
    elif sort_by == "experience":
        results.sort(key=lambda x: x.experience_years or 0, reverse=True)

    # Available doctors first
    results.sort(key=lambda x: 0 if x.availability_status == "available" else 1)

    return results


@router.post("/reassign", response_model=ReassignmentResponse)
def request_reassignment(
    data: ReassignmentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Request doctor reassignment for a patient."""
    # Verify patient exists
    patient = db.query(Patient).filter(Patient.id == data.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    reassign = DoctorReassignment(
        patient_id=data.patient_id,
        from_doctor_id=data.from_doctor_id,
        to_doctor_id=data.to_doctor_id,
        reason=data.reason,
        requested_by=current_user.id,
        status=ReassignmentStatus.PENDING,
    )

    # If to_doctor_id is provided and available, auto-assign
    if data.to_doctor_id:
        avail = db.query(DoctorAvailability).filter(
            DoctorAvailability.doctor_id == data.to_doctor_id
        ).first()
        if avail and avail.status == AvailabilityStatus.AVAILABLE:
            reassign.status = ReassignmentStatus.AUTO_ASSIGNED
            reassign.resolved_at = datetime.utcnow()
            patient.assigned_doctor_id = data.to_doctor_id
        else:
            reassign.status = ReassignmentStatus.PENDING

    db.add(reassign)
    db.commit()
    db.refresh(reassign)
    return ReassignmentResponse.model_validate(reassign)


@router.get("/reassignments/{patient_id}", response_model=list[ReassignmentResponse])
def get_reassignment_history(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get reassignment history for a patient."""
    records = db.query(DoctorReassignment).filter(
        DoctorReassignment.patient_id == patient_id
    ).order_by(DoctorReassignment.created_at.desc()).all()
    return [ReassignmentResponse.model_validate(r) for r in records]


@router.get("/{doctor_id}/waiting-time", response_model=WaitingTimeResponse)
def get_waiting_time(
    doctor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get estimated waiting time for a doctor."""
    doctor = db.query(User).filter(User.id == doctor_id, User.role == UserRole.DOCTOR).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    current_patients = db.query(Patient).filter(
        Patient.assigned_doctor_id == doctor_id,
        Patient.status.in_(["admitted", "icu", "emergency"]),
    ).count()

    avg_time = doctor.consultation_time_avg or 15
    # Simple queue estimate
    queue = max(0, current_patients - 1)  # exclude current patient
    est_wait = queue * avg_time

    return WaitingTimeResponse(
        doctor_id=doctor.id,
        doctor_name=doctor.full_name,
        current_patients=current_patients,
        avg_consultation_minutes=avg_time,
        queue_length=queue,
        estimated_wait_minutes=est_wait,
    )
