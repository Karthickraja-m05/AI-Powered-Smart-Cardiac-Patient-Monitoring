# -*- coding: utf-8 -*-
"""
Doctor Rating Router
=====================
Post-discharge doctor ratings and rating summaries.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..database import get_db
from ..models.user import User, UserRole
from ..models.doctor_rating import DoctorRating
from ..schemas.hip_schemas import RatingCreate, RatingResponse, DoctorRatingSummary
from ..services.auth_service import get_current_user

router = APIRouter(prefix="/api/ratings", tags=["Doctor Ratings"])


@router.post("", response_model=RatingResponse, status_code=201)
def create_rating(
    data: RatingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Rate a doctor after discharge."""
    # Verify doctor exists
    doctor = db.query(User).filter(User.id == data.doctor_id, User.role == UserRole.DOCTOR).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    rating = DoctorRating(**data.model_dump())
    db.add(rating)

    # Update doctor's average rating
    all_ratings = db.query(DoctorRating).filter(DoctorRating.doctor_id == data.doctor_id).all()
    total = len(all_ratings) + 1
    avg = (sum(r.overall for r in all_ratings) + data.overall) / total
    doctor.rating_avg = round(avg, 2)
    doctor.rating_count = total

    db.commit()
    db.refresh(rating)
    return RatingResponse.model_validate(rating)


@router.get("/doctor/{doctor_id}", response_model=list[RatingResponse])
def get_doctor_ratings(
    doctor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all ratings for a doctor."""
    ratings = db.query(DoctorRating).filter(
        DoctorRating.doctor_id == doctor_id
    ).order_by(DoctorRating.created_at.desc()).all()
    return [RatingResponse.model_validate(r) for r in ratings]


@router.get("/doctor/{doctor_id}/summary", response_model=DoctorRatingSummary)
def get_rating_summary(
    doctor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get rating summary for a doctor."""
    doctor = db.query(User).filter(User.id == doctor_id, User.role == UserRole.DOCTOR).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    ratings = db.query(DoctorRating).filter(DoctorRating.doctor_id == doctor_id).all()
    n = len(ratings)
    if n == 0:
        return DoctorRatingSummary(
            doctor_id=doctor_id, doctor_name=doctor.full_name,
            total_ratings=0, avg_communication=0, avg_treatment=0,
            avg_availability=0, avg_kindness=0, avg_overall=0,
        )

    return DoctorRatingSummary(
        doctor_id=doctor_id,
        doctor_name=doctor.full_name,
        total_ratings=n,
        avg_communication=round(sum(r.communication for r in ratings) / n, 2),
        avg_treatment=round(sum(r.treatment for r in ratings) / n, 2),
        avg_availability=round(sum(r.availability for r in ratings) / n, 2),
        avg_kindness=round(sum(r.kindness for r in ratings) / n, 2),
        avg_overall=round(sum(r.overall for r in ratings) / n, 2),
    )
