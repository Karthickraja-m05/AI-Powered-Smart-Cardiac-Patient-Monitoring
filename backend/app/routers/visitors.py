# -*- coding: utf-8 -*-
"""
Visitor Management Router
===========================
Visitor registration, QR generation, check-in/out, and scheduling.
"""

import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.user import User
from ..models.visitor import Visitor, VisitorStatus
from ..schemas.hip_schemas import VisitorCreate, VisitorResponse
from ..services.auth_service import get_current_user

router = APIRouter(prefix="/api/visitors", tags=["Visitor Management"])


@router.post("", response_model=VisitorResponse, status_code=201)
def register_visitor(
    data: VisitorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Register a visitor and generate QR token."""
    qr_token = str(uuid.uuid4())[:12].upper()
    visitor = Visitor(
        **data.model_dump(),
        qr_token=qr_token,
        registered_by=current_user.id,
    )
    db.add(visitor)
    db.commit()
    db.refresh(visitor)
    return VisitorResponse.model_validate(visitor)


@router.get("/{patient_id}", response_model=list[VisitorResponse])
def get_visitors(
    patient_id: int,
    status: str = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get visitors for a patient."""
    q = db.query(Visitor).filter(Visitor.patient_id == patient_id)
    if status:
        q = q.filter(Visitor.status == VisitorStatus(status))
    visitors = q.order_by(Visitor.created_at.desc()).all()
    return [VisitorResponse.model_validate(v) for v in visitors]


@router.post("/{visitor_id}/check-in", response_model=VisitorResponse)
def check_in_visitor(
    visitor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Check in a visitor."""
    visitor = db.query(Visitor).filter(Visitor.id == visitor_id).first()
    if not visitor:
        raise HTTPException(status_code=404, detail="Visitor not found")
    if visitor.is_blocked:
        raise HTTPException(status_code=403, detail="Visitor is blocked")
    visitor.status = VisitorStatus.CHECKED_IN
    visitor.check_in_at = datetime.utcnow()
    db.commit()
    db.refresh(visitor)
    return VisitorResponse.model_validate(visitor)


@router.post("/{visitor_id}/check-out", response_model=VisitorResponse)
def check_out_visitor(
    visitor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Check out a visitor."""
    visitor = db.query(Visitor).filter(Visitor.id == visitor_id).first()
    if not visitor:
        raise HTTPException(status_code=404, detail="Visitor not found")
    visitor.status = VisitorStatus.CHECKED_OUT
    visitor.check_out_at = datetime.utcnow()
    db.commit()
    db.refresh(visitor)
    return VisitorResponse.model_validate(visitor)


@router.post("/verify/{qr_token}", response_model=VisitorResponse)
def verify_visitor_qr(
    qr_token: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Verify a visitor by QR token."""
    visitor = db.query(Visitor).filter(Visitor.qr_token == qr_token).first()
    if not visitor:
        raise HTTPException(status_code=404, detail="Invalid QR code")
    if visitor.is_blocked:
        raise HTTPException(status_code=403, detail="Visitor is blocked")
    return VisitorResponse.model_validate(visitor)
