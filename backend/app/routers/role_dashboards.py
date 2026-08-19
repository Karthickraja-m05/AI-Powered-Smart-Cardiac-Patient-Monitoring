# -*- coding: utf-8 -*-
"""
Role-Specific Dashboard Router
================================
Dedicated dashboard data endpoints for each user role.
"""

from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

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
from ..schemas.hip_schemas import (
    DoctorDashboardData, NurseDashboardData, ReceptionistDashboardData,
    PatientDashboardData, CaregiverDashboardData, HospitalAdminDashboardData,
)
from ..services.auth_service import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["Role Dashboards"])


@router.get("/doctor", response_model=DoctorDashboardData)
def get_doctor_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get doctor-specific dashboard data."""
    if current_user.role != UserRole.DOCTOR:
        raise HTTPException(status_code=403, detail="Doctor role required")

    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    # My patients
    my_patients = db.query(Patient).filter(
        Patient.assigned_doctor_id == current_user.id,
        Patient.status.in_([PatientStatus.ADMITTED, PatientStatus.ICU, PatientStatus.EMERGENCY]),
    ).all()

    # Today's appointments
    todays_appts = db.query(Appointment).filter(
        Appointment.doctor_id == current_user.id,
        Appointment.scheduled_at >= today_start,
        Appointment.scheduled_at < today_start + timedelta(days=1),
    ).count()

    # Critical alerts for my patients
    patient_ids = [p.id for p in my_patients]
    critical_alerts = db.query(Alert).filter(
        Alert.patient_id.in_(patient_ids) if patient_ids else Alert.id < 0,
        Alert.is_acknowledged == False,
        Alert.severity.in_([AlertSeverity.CRITICAL, AlertSeverity.EMERGENCY]),
    ).count()

    # Recent alerts
    recent_alerts = db.query(Alert).filter(
        Alert.patient_id.in_(patient_ids) if patient_ids else Alert.id < 0,
        Alert.is_acknowledged == False,
    ).order_by(Alert.triggered_at.desc()).limit(10).all()

    # Availability status
    avail = db.query(DoctorAvailability).filter(
        DoctorAvailability.doctor_id == current_user.id
    ).first()
    avail_status = avail.status.value if avail else "available"

    return DoctorDashboardData(
        todays_appointments=todays_appts,
        current_patients=len(my_patients),
        critical_alerts=critical_alerts,
        queue_length=len(my_patients),
        pending_lab_reports=0,
        pending_med_approvals=0,
        upcoming_surgeries=0,
        availability_status=avail_status,
        patients=[{
            "id": p.id,
            "patient_uid": p.patient_uid,
            "name": p.full_name,
            "ward": p.ward,
            "room": p.room_number,
            "status": p.status.value if p.status else None,
            "risk_level": p.current_risk_level,
            "risk_score": p.current_risk_score,
        } for p in my_patients],
        recent_alerts=[{
            "id": a.id,
            "patient_id": a.patient_id,
            "severity": a.severity.value,
            "title": a.title,
            "message": a.message,
            "triggered_at": a.triggered_at.isoformat(),
        } for a in recent_alerts],
    )


@router.get("/nurse", response_model=NurseDashboardData)
def get_nurse_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get nurse-specific dashboard data."""
    if current_user.role != UserRole.NURSE:
        raise HTTPException(status_code=403, detail="Nurse role required")

    # My patients
    my_patients = db.query(Patient).filter(
        Patient.assigned_nurse_id == current_user.id,
        Patient.status.in_([PatientStatus.ADMITTED, PatientStatus.ICU, PatientStatus.EMERGENCY]),
    ).all()
    patient_ids = [p.id for p in my_patients]

    # Pending medications
    pending_meds = db.query(Medication).filter(
        Medication.patient_id.in_(patient_ids) if patient_ids else Medication.id < 0,
        Medication.status == MedicationStatus.ACTIVE,
    ).all()

    # Emergency alerts
    emergency_alerts = db.query(Alert).filter(
        Alert.patient_id.in_(patient_ids) if patient_ids else Alert.id < 0,
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
            "type": shift.shift_type.value,
            "start": shift.start_time,
            "end": shift.end_time,
        } if shift else None,
        patients=[{
            "id": p.id,
            "patient_uid": p.patient_uid,
            "name": p.full_name,
            "ward": p.ward,
            "room": p.room_number,
            "bed": p.bed_number,
            "status": p.status.value if p.status else None,
            "risk_level": p.current_risk_level,
        } for p in my_patients],
        medication_schedule=[{
            "id": m.id,
            "patient_id": m.patient_id,
            "medicine_name": m.medicine_name,
            "dose": m.dose,
            "frequency": m.frequency,
            "route": m.route.value if m.route else None,
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
        Appointment.scheduled_at >= today_start,
    ).count()

    # Available beds (simple estimate)
    total_patients = db.query(Patient).filter(
        Patient.status.in_([PatientStatus.ADMITTED, PatientStatus.ICU, PatientStatus.EMERGENCY]),
    ).count()
    available_beds = max(0, 100 - total_patients)

    # Available doctors
    available_docs = db.query(DoctorAvailability).filter(
        DoctorAvailability.status == AvailabilityStatus.AVAILABLE,
    ).count()

    # Recent registrations
    recent = db.query(Patient).order_by(Patient.created_at.desc()).limit(10).all()

    return ReceptionistDashboardData(
        todays_admissions=todays_admissions,
        todays_discharges=todays_discharges,
        pending_appointments=pending_appts,
        available_beds=available_beds,
        available_doctors=available_docs,
        waiting_patients=0,
        recent_registrations=[{
            "id": p.id,
            "patient_uid": p.patient_uid,
            "name": p.full_name,
            "status": p.status.value if p.status else None,
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

    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        return PatientDashboardData()

    # Latest vitals
    latest_vital = db.query(VitalSign).filter(
        VitalSign.patient_id == patient.id,
    ).order_by(VitalSign.recorded_at.desc()).first()

    # Active medications
    meds = db.query(Medication).filter(
        Medication.patient_id == patient.id,
        Medication.status == MedicationStatus.ACTIVE,
    ).all()

    # Assigned doctor info
    assigned_doc = db.query(User).filter(User.id == patient.assigned_doctor_id).first() if patient.assigned_doctor_id else None
    assigned_nurse = db.query(User).filter(User.id == patient.assigned_nurse_id).first() if patient.assigned_nurse_id else None

    return PatientDashboardData(
        current_vitals={
            "heart_rate": latest_vital.heart_rate,
            "spo2": latest_vital.spo2,
            "temperature": latest_vital.temperature,
            "bp_systolic": latest_vital.bp_systolic,
            "bp_diastolic": latest_vital.bp_diastolic,
            "recorded_at": latest_vital.recorded_at.isoformat(),
        } if latest_vital else None,
        medications=[{
            "id": m.id,
            "medicine_name": m.medicine_name,
            "dose": m.dose,
            "frequency": m.frequency,
            "next_dose_at": m.next_dose_at.isoformat() if m.next_dose_at else None,
        } for m in meds],
        assigned_doctor={
            "id": assigned_doc.id,
            "name": assigned_doc.full_name,
            "specialization": assigned_doc.specialization,
            "phone": assigned_doc.phone,
        } if assigned_doc else None,
        assigned_nurse={
            "id": assigned_nurse.id,
            "name": assigned_nurse.full_name,
        } if assigned_nurse else None,
        risk_level=patient.current_risk_level,
        risk_score=patient.current_risk_score,
    )


@router.get("/caregiver", response_model=CaregiverDashboardData)
def get_caregiver_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get caregiver-specific dashboard data."""
    if current_user.role != UserRole.CAREGIVER:
        raise HTTPException(status_code=403, detail="Caregiver role required")

    patient = db.query(Patient).filter(
        Patient.assigned_caregiver_id == current_user.id
    ).first()
    if not patient:
        # Try linked patient
        if current_user.linked_patient_id:
            patient = db.query(Patient).filter(Patient.id == current_user.linked_patient_id).first()
    if not patient:
        return CaregiverDashboardData()

    # Doctor availability
    doc_avail = None
    if patient.assigned_doctor_id:
        doc_avail = db.query(DoctorAvailability).filter(
            DoctorAvailability.doctor_id == patient.assigned_doctor_id
        ).first()

    assigned_doc = db.query(User).filter(User.id == patient.assigned_doctor_id).first() if patient.assigned_doctor_id else None
    assigned_nurse = db.query(User).filter(User.id == patient.assigned_nurse_id).first() if patient.assigned_nurse_id else None

    # Latest vitals
    latest_vital = db.query(VitalSign).filter(
        VitalSign.patient_id == patient.id,
    ).order_by(VitalSign.recorded_at.desc()).first()

    # Active medications
    meds = db.query(Medication).filter(
        Medication.patient_id == patient.id,
        Medication.status == MedicationStatus.ACTIVE,
    ).all()

    return CaregiverDashboardData(
        patient_status=patient.status.value if patient.status else None,
        patient_name=patient.full_name,
        room_number=patient.room_number,
        ward=patient.ward,
        assigned_doctor={
            "id": assigned_doc.id,
            "name": assigned_doc.full_name,
            "specialization": assigned_doc.specialization,
            "availability": doc_avail.status.value if doc_avail else "available",
        } if assigned_doc else None,
        assigned_nurse={
            "id": assigned_nurse.id,
            "name": assigned_nurse.full_name,
        } if assigned_nurse else None,
        doctor_available=(doc_avail.status == AvailabilityStatus.AVAILABLE) if doc_avail else True,
        current_vitals={
            "heart_rate": latest_vital.heart_rate,
            "spo2": latest_vital.spo2,
            "temperature": latest_vital.temperature,
            "bp_systolic": latest_vital.bp_systolic,
            "bp_diastolic": latest_vital.bp_diastolic,
            "recorded_at": latest_vital.recorded_at.isoformat(),
        } if latest_vital else None,
        medications=[{
            "id": m.id,
            "medicine_name": m.medicine_name,
            "dose": m.dose,
            "frequency": m.frequency,
        } for m in meds],
    )


@router.get("/hospital-admin", response_model=HospitalAdminDashboardData)
def get_hospital_admin_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get hospital admin dashboard data."""
    if current_user.role not in [UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Admin role required")

    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    total_patients = db.query(Patient).filter(
        Patient.status.in_([PatientStatus.ADMITTED, PatientStatus.ICU, PatientStatus.EMERGENCY]),
    ).count()

    todays_admissions = db.query(Patient).filter(
        Patient.admission_date >= today_start,
    ).count()

    todays_discharges = db.query(Patient).filter(
        Patient.discharge_date >= today_start,
    ).count()

    available_docs = db.query(DoctorAvailability).filter(
        DoctorAvailability.status == AvailabilityStatus.AVAILABLE,
    ).count()

    total_nurses = db.query(User).filter(User.role == UserRole.NURSE, User.is_active == True).count()

    icu_patients = db.query(Patient).filter(Patient.status == PatientStatus.ICU).count()

    emergency_cases = db.query(Patient).filter(
        Patient.status == PatientStatus.EMERGENCY,
    ).count()

    # Departments
    departments = db.query(Department).filter(Department.is_active == True).all()

    return HospitalAdminDashboardData(
        total_patients=total_patients,
        todays_admissions=todays_admissions,
        todays_discharges=todays_discharges,
        available_doctors=available_docs,
        available_nurses=total_nurses,
        total_beds=100,
        occupied_beds=total_patients,
        emergency_cases=emergency_cases,
        icu_patients=icu_patients,
        departments=[{
            "id": d.id,
            "name": d.name,
            "floor": d.floor,
            "bed_count": d.bed_count,
        } for d in departments],
    )
