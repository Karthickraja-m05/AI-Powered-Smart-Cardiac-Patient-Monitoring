# -*- coding: utf-8 -*-
"""
Patient Document Router
========================
Upload, list, and download patient documents.
"""

import os
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.user import User
from ..models.document import PatientDocument, DocumentType
from ..schemas.hip_schemas import DocumentResponse
from ..services.auth_service import get_current_user

router = APIRouter(prefix="/api/documents", tags=["Patient Documents"])


UPLOAD_BASE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads", "documents")
os.makedirs(UPLOAD_BASE, exist_ok=True)


@router.post("/{patient_id}", response_model=DocumentResponse, status_code=201)
async def upload_document(
    patient_id: int,
    doc_type: str = Form(...),
    title: str = Form(...),
    description: str = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload a patient document."""
    # Create patient-specific directory
    patient_dir = os.path.join(UPLOAD_BASE, str(patient_id))
    os.makedirs(patient_dir, exist_ok=True)

    # Generate unique filename
    ext = os.path.splitext(file.filename)[1] if file.filename else ".pdf"
    unique_name = f"{uuid.uuid4().hex[:8]}_{file.filename or 'document'}"
    file_path = os.path.join(patient_dir, unique_name)

    # Save file
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    doc = PatientDocument(
        patient_id=patient_id,
        doc_type=DocumentType(doc_type),
        title=title,
        description=description,
        file_path=file_path,
        file_name=file.filename,
        file_size_bytes=len(content),
        mime_type=file.content_type,
        uploaded_by=current_user.id,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return DocumentResponse.model_validate(doc)


@router.get("/{patient_id}", response_model=list[DocumentResponse])
def get_patient_documents(
    patient_id: int,
    doc_type: str = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all documents for a patient."""
    q = db.query(PatientDocument).filter(PatientDocument.patient_id == patient_id)
    if doc_type:
        q = q.filter(PatientDocument.doc_type == DocumentType(doc_type))
    docs = q.order_by(PatientDocument.created_at.desc()).all()
    return [DocumentResponse.model_validate(d) for d in docs]


@router.delete("/{doc_id}")
def delete_document(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a patient document."""
    doc = db.query(PatientDocument).filter(PatientDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    db.delete(doc)
    db.commit()
    return {"message": "Document deleted"}
