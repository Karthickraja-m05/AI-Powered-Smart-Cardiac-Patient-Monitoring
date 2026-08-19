# -*- coding: utf-8 -*-
"""
Patient Timeline Model
=======================
Chronological timeline of all events in a patient's care journey.
"""

import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, DateTime, Enum, Text, ForeignKey, JSON
)
from ..database import Base


class TimelineEventType(str, enum.Enum):
    ADMISSION = "admission"
    DISCHARGE = "discharge"
    VITALS = "vitals"
    MEDICATION = "medication"
    INJECTION = "injection"
    DOCTOR_VISIT = "doctor_visit"
    NURSE_CHECK = "nurse_check"
    ECG = "ecg"
    LAB_REPORT = "lab_report"
    SURGERY = "surgery"
    TRANSFER = "transfer"
    DIAGNOSIS = "diagnosis"
    TREATMENT_PLAN = "treatment_plan"
    ALERT = "alert"
    NOTE = "note"
    DOCUMENT_UPLOAD = "document_upload"
    RATING = "rating"


class TimelineEvent(Base):
    __tablename__ = "timeline_events"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)

    # ── Event ──
    event_type = Column(Enum(TimelineEventType), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String(10), nullable=True)  # emoji icon for UI

    # ── Metadata ──
    metadata_json = Column(JSON, nullable=True)  # flexible extra data
    related_entity_type = Column(String(50), nullable=True)  # "vitals", "medication", etc.
    related_entity_id = Column(Integer, nullable=True)

    # ── Creator ──
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # ── Timestamps ──
    event_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<TimelineEvent {self.event_type.value}: {self.title} patient={self.patient_id}>"
