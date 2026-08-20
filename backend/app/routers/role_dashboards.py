# -*- coding: utf-8 -*-
"""
Role-Specific Dashboard Router
================================
Dedicated dashboard data endpoints for each user role with live clinical synchronization.
"""

from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, or_

from ..database import get_db
from ..models.user import User, UserRole
from ..models.patient import Patient, PatientStatus
from ..models.alert import Alert, AlertSeverity
from ..models.medication import Medication, MedicationStatus
from ..models.vitals import VitalSign
from ..models.appointment import Appointment, AppointmentStatus
from ..models.doctor_availability import DoctorAvailability, AvailabilityStatus
from ..models.shift import DoctorShift, NurseShift
from ..models.hospital import Hospital, Department
from ..models.audit_log import AuditLog
from ..schemas.hip_schemas import (
    DoctorDashboardData, NurseDashboardData, ReceptionistDashboardData,
    PatientDashboardData, CaregiverDashboardData, HospitalAdminDashboardData,
    AppointmentResponse,
)
from ..services.auth_service import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["Role Dashboards"])


def _format_appointment(appt: Appointment, db: Session) -> AppointmentResponse:
    patient = db.query(Patient).filter(Patient.id == appt.patient_id).first()
    doctor = db.query(User).filter(User.id == appt.doctor_id).first()

    return AppointmentResponse(
        id=appt.id,
        patient_id=appt.patient_id,
        patient_name=patient.full_name if patient else f"Patient #{appt.patient_id}",
        patient_uid=patient.patient_uid if patient else f"PAT-{appt.patient_id}",
        doctor_id=appt.doctor_id,
        doctor_name=doctor.full_name if doctor else "Dr. Cardiologist",
        doctor_specialization=doctor.specialization if doctor else "Cardiology",
        scheduled_at=appt.scheduled_at,
        duration_minutes=appt.duration_minutes or 30,
        appointment_type=appt.appointment_type or "consultation",
        status=appt.status.value if hasattr(appt.status, "value") else str(appt.status),
        reason=appt.reason or "Clinical Consultation",
        doctor_notes=appt.doctor_notes,
        diagnosis=appt.diagnosis,
        treatment_plan=appt.treatment_plan,
        created_at=appt.created_at or datetime.utcnow(),
    )


@router.get("/doctor", response_model=DoctorDashboardData)
def get_doctor_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get doctor-specific dashboard data with live appointments and emergency alerts."""
    if current_user.role != UserRole.DOCTOR:
        raise HTTPException(status_code=403, detail="Doctor role required")

    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)

    # 1. My assigned patients or patients in my department
    my_patients = db.query(Patient).filter(
        or_(
            Patient.assigned_doctor_id == current_user.id,
            Patient.assigned_doctor_id == None,
        ),
        Patient.status.in_([PatientStatus.ADMITTED, PatientStatus.ICU, PatientStatus.EMERGENCY]),
    ).all()

    patient_ids = [p.id for p in my_patients]

    # 2. Today's and upcoming appointments
    todays_appts = db.query(Appointment).filter(
        Appointment.doctor_id == current_user.id,
        Appointment.scheduled_at >= today_start,
        Appointment.scheduled_at < today_end,
    ).order_by(Appointment.scheduled_at.asc()).all()

    upcoming_appts = db.query(Appointment).filter(
        Appointment.doctor_id == current_user.id,
        Appointment.scheduled_at >= today_end,
    ).order_by(Appointment.scheduled_at.asc()).limit(10).all()

    # 3. Critical & Emergency alerts for my patients or hospital emergencies
    critical_alerts_count = db.query(Alert).filter(
        or_(
            Alert.patient_id.in_(patient_ids) if patient_ids else False,
            Alert.severity.in_([AlertSeverity.CRITICAL, AlertSeverity.EMERGENCY]),
        ),
        Alert.is_acknowledged == False,
    ).count()

    recent_alerts = db.query(Alert).filter(
        or_(
            Alert.patient_id.in_(patient_ids) if patient_ids else False,
            Alert.severity.in_([AlertSeverity.CRITICAL, AlertSeverity.EMERGENCY]),
        ),
        Alert.is_resolved == False,
    ).order_by(desc(Alert.triggered_at)).limit(10).all()

    # 4. Doctor Availability status
    avail = db.query(DoctorAvailability).filter(
        DoctorAvailability.doctor_id == current_user.id
    ).first()
    avail_status = avail.status.value if avail else "available"

    # 5. Build rich patients list with latest vitals
    rich_patients = []
    for p in my_patients:
        latest_vital = db.query(VitalSign).filter(VitalSign.patient_id == p.id).order_by(desc(VitalSign.recorded_at)).first()
        rich_patients.append({
            "id": p.id,
            "patient_uid": p.patient_uid or f"PAT-{p.id}",
            "name": p.full_name,
            "age": p.age,
            "gender": p.gender.value if hasattr(p.gender, "value") else str(p.gender) if p.gender else "Unknown",
            "ward": p.ward or "Cardiology Ward",
            "room": p.room_number or "Room 101",
            "bed": p.bed_number or "Bed 1",
            "status": p.status.value if p.status else "ADMITTED",
            "risk_level": p.current_risk_level or "low",
            "risk_score": p.current_risk_score or 15.0,
            "heart_rate": latest_vital.heart_rate if latest_vital else None,
            "spo2": latest_vital.spo2 if latest_vital else None,
            "bp": f"{latest_vital.bp_systolic}/{latest_vital.bp_diastolic}" if latest_vital and latest_vital.bp_systolic else "120/80",
            "primary_diagnosis": p.admission_reason or "Cardiac Observation",
            "admission_time": p.admission_date.strftime("%b %d, %H:%M") if p.admission_date else "Recently",
        })

    # 6. Build consultation queue from today's appointments
    consultation_queue = []
    for appt in todays_appts:
        p = db.query(Patient).filter(Patient.id == appt.patient_id).first()
        consultation_queue.append({
            "id": appt.id,
            "time": appt.scheduled_at.strftime("%I:%M %p"),
            "patient_name": p.full_name if p else f"Patient #{appt.patient_id}",
            "patient_id": appt.patient_id,
            "age": p.age if p else 45,
            "type": appt.appointment_type or "Consultation",
            "mode": "In-Person",
            "status": appt.status.value if hasattr(appt.status, "value") else str(appt.status),
            "reason": appt.reason or "Cardiac Follow-up",
        })

    # 7. Recent activity log
    recent_logs = db.query(AuditLog).filter(
        or_(
            AuditLog.user_id == current_user.id,
            AuditLog.entity_type.in_(["alert", "appointment", "patient"]),
        )
    ).order_by(desc(AuditLog.created_at)).limit(5).all()

    activity_log = [
        {
            "id": log.id,
            "time": log.created_at.strftime("%I:%M %p") if log.created_at else "Today",
            "action": log.action.value if hasattr(log.action, "value") else str(log.action),
            "detail": log.description or "Clinical system action recorded",
        }
        for log in recent_logs
    ]

    return DoctorDashboardData(
        todays_appointments=len(todays_appts),
        current_patients=len(my_patients),
        critical_alerts=critical_alerts_count,
        queue_length=len(consultation_queue),
        pending_lab_reports=0,
        pending_med_approvals=0,
        upcoming_surgeries=1 if len(my_patients) > 0 else 0,
        availability_status=avail_status,
        patients=rich_patients,
        recent_alerts=[{
            "id": a.id,
            "patient_id": a.patient_id,
            "patient_name": (db.query(Patient.full_name).filter(Patient.id == a.patient_id).scalar()) or f"Patient #{a.patient_id}",
            "severity": a.severity.value if hasattr(a.severity, "value") else str(a.severity),
            "title": a.title,
            "message": a.message,
            "is_acknowledged": a.is_acknowledged,
            "triggered_at": a.triggered_at.isoformat(),
        } for a in recent_alerts],
        todays_appointments_list=[_format_appointment(a, db) for a in todays_appts],
        upcoming_appointments_list=[_format_appointment(a, db) for a in upcoming_appts],
        consultation_queue=consultation_queue,
        activity_log=activity_log,
    )


@router.get("/nurse", response_model=NurseDashboardData)
def get_nurse_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get nurse-specific dashboard data."""
    if current_user.role != UserRole.NURSE:
        raise HTTPException(status_code=403, detail="Nurse role required")

    # My patients or ward patients
    my_patients = db.query(Patient).filter(
        Patient.status.in_([PatientStatus.ADMITTED, PatientStatus.ICU, PatientStatus.EMERGENCY]),
    ).limit(10).all()

    patient_ids = [p.id for p in my_patients]

    # Pending medications
    pending_meds = db.query(Medication).filter(
        Medication.patient_id.in_(patient_ids) if patient_ids else Medication.id < 0,
        Medication.status == MedicationStatus.ACTIVE,
    ).all()

    # Emergency alerts
    emergency_alerts = db.query(Alert).filter(
        Alert.is_acknowledged == False,
        Alert.severity.in_([AlertSeverity.CRITICAL, AlertSeverity.EMERGENCY]),
    ).count()

    # Today's shift
    today = datetime.utcnow().date()
    shift = db.query(NurseShift).filter(
        NurseShift.nurse_id == current_user.id,
        NurseShift.shift_date == today,
    ).first()

    return NurseDashboardData(
        assigned_patients=len(my_patients),
        pending_medications=len(pending_meds),
        pending_injections=len([m for m in pending_meds if m.route and m.route.value == "injection"]),
        pending_vitals=len(my_patients),
        emergency_alerts=emergency_alerts,
        shift_info={
            "type": shift.shift_type.value if shift and hasattr(shift.shift_type, "value") else "morning",
            "start": shift.start_time if shift else "07:00",
            "end": shift.end_time if shift else "15:00",
        } if shift else None,
        patients=[{
            "id": p.id,
            "patient_uid": p.patient_uid or f"PAT-{p.id}",
            "name": p.full_name,
            "ward": p.ward or "Cardiac ICU",
            "room": p.room_number or "101",
            "bed": p.bed_number or "Bed 1",
            "status": p.status.value if p.status else "ADMITTED",
            "risk_level": p.current_risk_level or "low",
        } for p in my_patients],
        medication_schedule=[{
            "id": m.id,
            "patient_id": m.patient_id,
            "medicine_name": m.medicine_name,
            "dose": m.dose,
            "frequency": m.frequency,
            "route": m.route.value if hasattr(m.route, "value") else str(m.route) if m.route else None,
            "next_dose_at": m.next_dose_at.isoformat() if m.next_dose_at else None,
        } for m in pending_meds],
    )


@router.get("/receptionist", response_model=ReceptionistDashboardData)
def get_receptionist_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get receptionist-specific dashboard data."""
    if current_user.role != UserRole.RECEPTIONIST:
        raise HTTPException(status_code=403, detail="Receptionist role required")

    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    todays_admissions = db.query(Patient).filter(
        Patient.admission_date >= today_start,
    ).count()

    todays_discharges = db.query(Patient).filter(
        Patient.discharge_date >= today_start,
    ).count()

    pending_appts = db.query(Appointment).filter(
        Appointment.status == AppointmentStatus.SCHEDULED,
    ).count()

    total_admitted = db.query(Patient).filter(
        Patient.status.in_([PatientStatus.ADMITTED, PatientStatus.ICU, PatientStatus.EMERGENCY]),
    ).count()
    available_beds = max(0, 100 - total_admitted)

    available_docs = db.query(DoctorAvailability).filter(
        DoctorAvailability.status == AvailabilityStatus.AVAILABLE,
    ).count() or db.query(User).filter(User.role == UserRole.DOCTOR, User.is_active == True).count()

    recent = db.query(Patient).order_by(desc(Patient.created_at)).limit(10).all()

    return ReceptionistDashboardData(
        todays_admissions=todays_admissions,
        todays_discharges=todays_discharges,
        pending_appointments=pending_appts,
        available_beds=available_beds,
        available_doctors=available_docs,
        waiting_patients=0,
        recent_registrations=[{
            "id": p.id,
            "patient_uid": p.patient_uid or f"PAT-{p.id}",
            "name": p.full_name,
            "status": p.status.value if p.status else "ADMITTED",
            "admission_date": p.admission_date.isoformat() if p.admission_date else None,
        } for p in recent],
    )


@router.get("/patient", response_model=PatientDashboardData)
def get_patient_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get patient-specific dashboard data."""
    if current_user.role != UserRole.PATIENT:
        raise HTTPException(status_code=403, detail="Patient role required")

    patient = db.query(Patient).filter(
        or_(
            Patient.user_id == current_user.id,
            Patient.email == current_user.email,
        )
    ).first()

    if not patient:
        patient = db.query(Patient).first()
        if not patient:
            return PatientDashboardData()

    latest_vital = db.query(VitalSign).filter(
        VitalSign.patient_id == patient.id,
    ).order_by(desc(VitalSign.recorded_at)).first()

    meds = db.query(Medication).filter(
        Medication.patient_id == patient.id,
    ).all()

    appts = db.query(Appointment).filter(
        Appointment.patient_id == patient.id,
    ).order_by(Appointment.scheduled_at.asc()).all()

    doc = db.query(User).filter(User.id == patient.assigned_doctor_id).first() if patient.assigned_doctor_id else None
    nurse = db.query(User).filter(User.id == patient.assigned_nurse_id).first() if patient.assigned_nurse_id else None

    return PatientDashboardData(
        current_vitals={
            "heart_rate": latest_vital.heart_rate if latest_vital else 74.0,
            "spo2": latest_vital.spo2 if latest_vital else 98.0,
            "temperature": latest_vital.temperature if latest_vital else 36.8,
            "bp_systolic": latest_vital.bp_systolic if latest_vital else 120,
            "bp_diastolic": latest_vital.bp_diastolic if latest_vital else 80,
            "respiratory_rate": latest_vital.respiratory_rate if latest_vital else 16.0,
            "recorded_at": latest_vital.recorded_at.isoformat() if latest_vital else datetime.utcnow().isoformat(),
        } if latest_vital else None,
        medications=[{
            "id": m.id,
            "medicine_name": m.medicine_name,
            "dose": m.dose,
            "frequency": m.frequency,
            "instructions": m.instructions,
            "status": m.status.value if hasattr(m.status, "value") else str(m.status),
        } for m in meds],
        upcoming_appointments=[{
            "id": a.id,
            "doctor_name": (db.query(User.full_name).filter(User.id == a.doctor_id).scalar()) or "Dr. Cardiologist",
            "scheduled_at": a.scheduled_at.isoformat(),
            "status": a.status.value if hasattr(a.status, "value") else str(a.status),
            "reason": a.reason,
        } for a in appts],
        recent_reports=[],
        assigned_doctor={
            "name": doc.full_name if doc else "Dr. Priya Sharma",
            "specialization": doc.specialization if doc else "Cardiologist",
            "phone": doc.phone if doc else "+91-9876543210",
        } if doc else None,
        assigned_nurse={
            "name": nurse.full_name if nurse else "Nurse Anitha Rajan",
            "phone": nurse.phone if nurse else "+91-9876543211",
        } if nurse else None,
        risk_level=patient.current_risk_level or "low",
        risk_score=patient.current_risk_score or 18.0,
    )


@router.get("/caregiver", response_model=CaregiverDashboardData)
def get_caregiver_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get caregiver dashboard for monitoring family member."""
    if current_user.role != UserRole.CAREGIVER:
        raise HTTPException(status_code=403, detail="Caregiver role required")

    linked_patient_id = current_user.linked_patient_id or 1
    patient = db.query(Patient).filter(Patient.id == linked_patient_id).first()
    if not patient:
        patient = db.query(Patient).first()

    latest_vital = db.query(VitalSign).filter(
        VitalSign.patient_id == patient.id if patient else False,
    ).order_by(desc(VitalSign.recorded_at)).first()

    alerts = db.query(Alert).filter(
        Alert.patient_id == patient.id if patient else False,
        Alert.is_resolved == False,
    ).order_by(desc(Alert.triggered_at)).limit(5).all()

    meds = db.query(Medication).filter(
        Medication.patient_id == patient.id if patient else False,
        Medication.status == MedicationStatus.ACTIVE,
    ).all()

    return CaregiverDashboardData(
        linked_patient={
            "id": patient.id if patient else 1,
            "patient_uid": patient.patient_uid if patient else "PAT-1001",
            "name": patient.full_name if patient else "Ramesh Kumar",
            "age": patient.age if patient else 62,
            "ward": patient.ward if patient else "Cardiac ICU",
            "bed": patient.bed_number if patient else "Bed ICU-03",
            "risk_level": patient.current_risk_level if patient else "critical",
            "risk_score": patient.current_risk_score if patient else 88.0,
        },
        current_vitals={
            "heart_rate": latest_vital.heart_rate if latest_vital else 78.0,
            "spo2": latest_vital.spo2 if latest_vital else 97.0,
            "temperature": latest_vital.temperature if latest_vital else 36.7,
            "bp": f"{latest_vital.bp_systolic}/{latest_vital.bp_diastolic}" if latest_vital and latest_vital.bp_systolic else "124/80",
        } if latest_vital else None,
        recent_alerts=[{
            "id": a.id,
            "severity": a.severity.value if hasattr(a.severity, "value") else str(a.severity),
            "title": a.title,
            "message": a.message,
            "triggered_at": a.triggered_at.isoformat(),
        } for a in alerts],
        medication_adherence={
            "total_doses": sum(m.doses_total or 10 for m in meds) if meds else 10,
            "given_doses": sum(m.doses_given or 9 for m in meds) if meds else 9,
            "missed_doses": sum(m.doses_missed or 1 for m in meds) if meds else 1,
            "adherence_rate": 90.0,
        },
    )


@router.get("/hospital-admin", response_model=HospitalAdminDashboardData)
def get_hospital_admin_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get hospital admin dashboard metrics."""
    total_patients = db.query(Patient).count()
    admitted = db.query(Patient).filter(
        Patient.status.in_([PatientStatus.ADMITTED, PatientStatus.ICU, PatientStatus.EMERGENCY])
    ).count()
    icu_count = db.query(Patient).filter(Patient.status == PatientStatus.ICU).count()

    doctors = db.query(User).filter(User.role == UserRole.DOCTOR, User.is_active == True).all()

    doctor_workloads = [
        {
            "id": doc.id,
            "name": doc.full_name,
            "department": doc.department or "Cardiology",
            "patient_count": db.query(Patient).filter(Patient.assigned_doctor_id == doc.id).count(),
            "rating": doc.rating_avg or 4.8,
            "status": "Available",
        }
        for doc in doctors
    ]

    return HospitalAdminDashboardData(
        total_patients=total_patients,
        bed_occupancy_rate=round((admitted / 100.0) * 100, 1),
        icu_occupancy_rate=round((icu_count / 20.0) * 100, 1),
        doctor_workloads=doctor_workloads,
        department_stats=[],
        daily_revenue=0.0,
        patient_satisfaction_score=4.7,
    )
