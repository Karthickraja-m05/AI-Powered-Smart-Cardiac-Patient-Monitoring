# -*- coding: utf-8 -*-
"""
Patient Document Center Model
===============================
Stores metadata for uploaded patient documents (MRI, CT, ECG, reports, etc.).
"""

import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, DateTime, Enum, Text, ForeignKey
)
from ..database import Base


class DocumentType(str, enum.Enum):
    MRI = "mri"
    CT_SCAN = "ct_scan"
    ECG = "ecg"
    BLOOD_REPORT = "blood_report"
    XRAY = "xray"
    INSURANCE = "insurance"
    CONSENT = "consent"
    PRESCRIPTION = "prescription"
    DISCHARGE_SUMMARY = "discharge_summary"
    LAB_REPORT = "lab_report"
    OTHER = "other"


class PatientDocument(Base):
    __tablename__ = "patient_documents"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)

    # ── Document Info ──
    doc_type = Column(Enum(DocumentType), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    file_path = Column(String(500), nullable=False)
    file_name = Column(String(255), nullable=True)
    file_size_bytes = Column(Integer, nullable=True)
    mime_type = Column(String(100), nullable=True)

    # ── Metadata ──
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_confidential = Column(Integer, default=0)  # 0 = normal, 1 = confidential
    tags = Column(String(500), nullable=True)  # comma-separated tags

    # ── Timestamps ──
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<PatientDocument {self.doc_type.value}: {self.title} patient={self.patient_id}>"
