# -*- coding: utf-8 -*-
"""Schemas for Hospital Intelligence Platform — New Features."""

from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, Field


# ═══════════════════════════════════════════
# HOSPITAL & DEPARTMENT
# ═══════════════════════════════════════════

class HospitalCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    code: str = Field(..., min_length=2, max_length=20)
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: str = "India"
    pincode: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    total_beds: int = 100
    icu_beds: int = 10
    emergency_beds: int = 15


class HospitalResponse(BaseModel):
    id: int
    name: str
    code: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    total_beds: int
    icu_beds: int
    emergency_beds: int
    carbon_savings_kg: float = 0.0
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class DepartmentCreate(BaseModel):
    hospital_id: int
    name: str = Field(..., min_length=2, max_length=255)
    code: Optional[str] = None
    floor: Optional[str] = None
    wing: Optional[str] = None
    bed_count: int = 0
    head_doctor_id: Optional[int] = None


class DepartmentResponse(BaseModel):
    id: int
    hospital_id: int
    name: str
    code: Optional[str] = None
    floor: Optional[str] = None
    wing: Optional[str] = None
    bed_count: int
    head_doctor_id: Optional[int] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ═══════════════════════════════════════════
# DOCTOR AVAILABILITY
# ═══════════════════════════════════════════

class AvailabilityUpdate(BaseModel):
    status: str  # available, busy, in_surgery, emergency, meeting, off_duty, vacation
    status_message: Optional[str] = None
    expected_available_at: Optional[datetime] = None


class AvailabilityResponse(BaseModel):
    id: int
    doctor_id: int
    status: str
    status_message: Optional[str] = None
    expected_available_at: Optional[datetime] = None
    updated_at: datetime

    class Config:
        from_attributes = True


class DoctorSearchResult(BaseModel):
    id: int
    full_name: str
    specialization: Optional[str] = None
    department: Optional[str] = None
    experience_years: Optional[int] = None
    rating_avg: Optional[float] = None
    rating_count: int = 0
    current_workload: int = 0
    consultation_time_avg: int = 15
    availability_status: str = "available"
    estimated_wait_minutes: int = 0
    profile_photo: Optional[str] = None


class ReassignmentRequest(BaseModel):
    patient_id: int
    from_doctor_id: int
    to_doctor_id: Optional[int] = None
    reason: Optional[str] = None


class ReassignmentResponse(BaseModel):
    id: int
    patient_id: int
    from_doctor_id: int
    to_doctor_id: Optional[int] = None
    reason: Optional[str] = None
    requested_by: int
    status: str
    created_at: datetime
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ═══════════════════════════════════════════
# SHIFTS
# ═══════════════════════════════════════════

class ShiftCreate(BaseModel):
    shift_type: str  # morning, afternoon, night, emergency
    shift_date: date
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    hospital_id: Optional[int] = None
    department: Optional[str] = None
    ward: Optional[str] = None


class DoctorShiftResponse(BaseModel):
    id: int
    doctor_id: int
    hospital_id: Optional[int] = None
    department: Optional[str] = None
    shift_type: str
    shift_date: date
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    is_active: bool
    checked_in: bool
    created_at: datetime

    class Config:
        from_attributes = True


class NurseShiftResponse(BaseModel):
    id: int
    nurse_id: int
    hospital_id: Optional[int] = None
    ward: Optional[str] = None
    shift_type: str
    shift_date: date
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    patient_count: int = 0
    max_patients: int = 8
    is_active: bool
    checked_in: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ═══════════════════════════════════════════
# PATIENT TRANSFER
# ═══════════════════════════════════════════

class TransferCreate(BaseModel):
    patient_id: int
    transfer_type: str  # doctor, ward, room, hospital
    to_doctor_id: Optional[int] = None
    to_ward: Optional[str] = None
    to_room: Optional[str] = None
    to_bed: Optional[str] = None
    to_hospital_id: Optional[int] = None
    reason: Optional[str] = None


class TransferResponse(BaseModel):
    id: int
    patient_id: int
    transfer_type: str
    from_doctor_id: Optional[int] = None
    from_ward: Optional[str] = None
    from_room: Optional[str] = None
    from_hospital_id: Optional[int] = None
    to_doctor_id: Optional[int] = None
    to_ward: Optional[str] = None
    to_room: Optional[str] = None
    to_hospital_id: Optional[int] = None
    reason: Optional[str] = None
    status: str
    transferred_by: int
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ═══════════════════════════════════════════
# CHAT
# ═══════════════════════════════════════════

class ChatMessageCreate(BaseModel):
    patient_id: int
    message: str = Field(..., min_length=1)
    message_type: str = "text"
    is_urgent: bool = False


class ChatMessageResponse(BaseModel):
    id: int
    patient_id: int
    sender_id: int
    sender_name: Optional[str] = None
    sender_role: Optional[str] = None
    message: str
    message_type: str
    is_urgent: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


# ═══════════════════════════════════════════
# VISITOR
# ═══════════════════════════════════════════

class VisitorCreate(BaseModel):
    patient_id: int
    visitor_name: str = Field(..., min_length=2, max_length=255)
    phone: Optional[str] = None
    email: Optional[str] = None
    relation: Optional[str] = None
    id_proof_type: Optional[str] = None
    id_proof_number: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    scheduled_start: Optional[str] = None
    scheduled_end: Optional[str] = None


class VisitorResponse(BaseModel):
    id: int
    patient_id: int
    visitor_name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    relation: Optional[str] = None
    qr_code: Optional[str] = None
    qr_token: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    scheduled_start: Optional[str] = None
    scheduled_end: Optional[str] = None
    status: str
    check_in_at: Optional[datetime] = None
    check_out_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ═══════════════════════════════════════════
# APPOINTMENTS
# ═══════════════════════════════════════════

class AppointmentCreate(BaseModel):
    patient_id: int
    doctor_id: int
    scheduled_at: datetime
    duration_minutes: int = 30
    appointment_type: Optional[str] = "checkup"
    reason: Optional[str] = None
    doctor_notes: Optional[str] = None


class AppointmentUpdate(BaseModel):
    scheduled_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    appointment_type: Optional[str] = None
    status: Optional[str] = None
    reason: Optional[str] = None
    doctor_notes: Optional[str] = None
    diagnosis: Optional[str] = None
    treatment_plan: Optional[str] = None


class AppointmentResponse(BaseModel):
    id: int
    patient_id: int
    patient_name: Optional[str] = None
    patient_uid: Optional[str] = None
    doctor_id: int
    doctor_name: Optional[str] = None
    doctor_specialization: Optional[str] = None
    scheduled_at: datetime
    duration_minutes: int = 30
    appointment_type: Optional[str] = "checkup"
    status: str
    reason: Optional[str] = None
    doctor_notes: Optional[str] = None
    diagnosis: Optional[str] = None
    treatment_plan: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ═══════════════════════════════════════════
# DOCTOR RATING
# ═══════════════════════════════════════════

class RatingCreate(BaseModel):
    doctor_id: int
    patient_id: int
    communication: float = Field(..., ge=1.0, le=5.0)
    treatment: float = Field(..., ge=1.0, le=5.0)
    availability: float = Field(..., ge=1.0, le=5.0)
    kindness: float = Field(..., ge=1.0, le=5.0)
    overall: float = Field(..., ge=1.0, le=5.0)
    comment: Optional[str] = None
    is_anonymous: int = 0


class RatingResponse(BaseModel):
    id: int
    doctor_id: int
    patient_id: int
    communication: float
    treatment: float
    availability: float
    kindness: float
    overall: float
    comment: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class DoctorRatingSummary(BaseModel):
    doctor_id: int
    doctor_name: str
    total_ratings: int
    avg_communication: float
    avg_treatment: float
    avg_availability: float
    avg_kindness: float
    avg_overall: float


# ═══════════════════════════════════════════
# AUDIT LOG
# ═══════════════════════════════════════════

class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    username: Optional[str] = None
    action: str
    entity_type: str
    entity_id: Optional[int] = None
    description: Optional[str] = None
    old_value: Optional[dict] = None
    new_value: Optional[dict] = None
    ip_address: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True



# ═══════════════════════════════════════════
# DOCUMENT
# ═══════════════════════════════════════════

class DocumentResponse(BaseModel):
    id: int
    patient_id: int
    doc_type: str
    title: str
    description: Optional[str] = None
    file_path: str
    file_name: Optional[str] = None
    file_size_bytes: Optional[int] = None
    uploaded_by: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ═══════════════════════════════════════════
# TIMELINE
# ═══════════════════════════════════════════

class TimelineEventResponse(BaseModel):
    id: int
    patient_id: int
    event_type: str
    title: str
    description: Optional[str] = None
    icon: Optional[str] = None
    metadata_json: Optional[dict] = None
    created_by: Optional[int] = None
    event_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True


# ═══════════════════════════════════════════
# ROLE-SPECIFIC DASHBOARDS
# ═══════════════════════════════════════════

class DoctorDashboardData(BaseModel):
    todays_appointments: int = 0
    current_patients: int = 0
    critical_alerts: int = 0
    queue_length: int = 0
    pending_lab_reports: int = 0
    pending_med_approvals: int = 0
    upcoming_surgeries: int = 0
    availability_status: str = "available"
    patients: List[dict] = []
    recent_alerts: List[dict] = []
    todays_appointments_list: List[AppointmentResponse] = []
    upcoming_appointments_list: List[AppointmentResponse] = []
    consultation_queue: List[dict] = []
    activity_log: List[dict] = []


class NurseDashboardData(BaseModel):
    assigned_patients: int = 0
    pending_medications: int = 0
    pending_injections: int = 0
    pending_vitals: int = 0
    emergency_alerts: int = 0
    shift_info: Optional[dict] = None
    patients: List[dict] = []
    medication_schedule: List[dict] = []


class ReceptionistDashboardData(BaseModel):
    todays_admissions: int = 0
    todays_discharges: int = 0
    pending_appointments: int = 0
    available_beds: int = 0
    available_doctors: int = 0
    waiting_patients: int = 0
    recent_registrations: List[dict] = []


class PatientDashboardData(BaseModel):
    current_vitals: Optional[dict] = None
    medications: List[dict] = []
    upcoming_appointments: List[dict] = []
    recent_reports: List[dict] = []
    assigned_doctor: Optional[dict] = None
    assigned_nurse: Optional[dict] = None
    risk_level: Optional[str] = None
    risk_score: Optional[float] = None


class CaregiverDashboardData(BaseModel):
    patient_status: Optional[str] = None
    patient_name: Optional[str] = None
    room_number: Optional[str] = None
    ward: Optional[str] = None
    assigned_doctor: Optional[dict] = None
    assigned_nurse: Optional[dict] = None
    doctor_available: bool = True
    current_vitals: Optional[dict] = None
    medications: List[dict] = []
    upcoming_appointments: List[dict] = []
    visitor_schedule: List[dict] = []


class HospitalAdminDashboardData(BaseModel):
    total_patients: int = 0
    todays_admissions: int = 0
    todays_discharges: int = 0
    available_doctors: int = 0
    available_nurses: int = 0
    total_beds: int = 0
    occupied_beds: int = 0
    emergency_cases: int = 0
    icu_patients: int = 0
    departments: List[dict] = []
    equipment_status: List[dict] = []


class WaitingTimeResponse(BaseModel):
    doctor_id: int
    doctor_name: str
    current_patients: int = 0
    avg_consultation_minutes: int = 15
    queue_length: int = 0
    estimated_wait_minutes: int = 0
