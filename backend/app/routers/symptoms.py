# -*- coding: utf-8 -*-
"""
Symptoms Router
===============
Track and query patient symptoms.
"""

from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.user import User
from ..models.symptom import SymptomRecord
from ..schemas.symptom_schema import SymptomCreate, SymptomResponse
from ..services.auth_service import get_current_user
from ..services.alert_service import _create_alert
from ..models.alert import AlertType, AlertSeverity

router = APIRouter(prefix="/api/symptoms", tags=["Symptoms"])


@router.post("", response_model=SymptomResponse, status_code=201)
def record_symptoms(
    data: SymptomCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Record patient symptoms (doctors/nurses)."""
    record = SymptomRecord(
        **data.model_dump(),
        recorded_by=current_user.id,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    # Alert on severe symptoms
    if data.chest_pain and data.pain_score and data.pain_score >= 7:
        _create_alert(
            db, data.patient_id, AlertType.CHEST_PAIN, AlertSeverity.CRITICAL,
            "Severe Chest Pain Reported",
            f"Patient reports severe chest pain (pain score: {data.pain_score}/10). Immediate assessment required.",
        )

    return SymptomResponse.model_validate(record)


@router.get("/{patient_id}", response_model=List[SymptomResponse])
def get_symptom_history(
    patient_id: int,
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get symptom history for a patient."""
    records = (
        db.query(SymptomRecord)
        .filter(SymptomRecord.patient_id == patient_id)
        .order_by(SymptomRecord.recorded_at.desc())
        .limit(limit)
        .all()
    )
    return [SymptomResponse.model_validate(r) for r in records]
