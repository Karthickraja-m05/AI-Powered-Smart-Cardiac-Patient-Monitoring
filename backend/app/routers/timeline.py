# -*- coding: utf-8 -*-
"""
Patient Timeline Router
========================
Chronological timeline of all events in a patient's care journey.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.user import User
from ..models.patient_timeline import TimelineEvent
from ..schemas.hip_schemas import TimelineEventResponse
from ..services.auth_service import get_current_user

router = APIRouter(prefix="/api/timeline", tags=["Patient Timeline"])


@router.get("/{patient_id}", response_model=list[TimelineEventResponse])
def get_patient_timeline(
    patient_id: int,
    event_type: str = Query(None),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get chronological timeline for a patient."""
    q = db.query(TimelineEvent).filter(TimelineEvent.patient_id == patient_id)
    if event_type:
        q = q.filter(TimelineEvent.event_type == event_type)
    events = q.order_by(TimelineEvent.event_at.desc()).limit(limit).all()
    return [TimelineEventResponse.model_validate(e) for e in events]
