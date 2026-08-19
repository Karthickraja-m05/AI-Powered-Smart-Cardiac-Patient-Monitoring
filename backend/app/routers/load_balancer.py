# -*- coding: utf-8 -*-
"""
Load Balancer Router
=====================
API endpoints for intelligent doctor-patient assignment using
load-balancing algorithms.

Endpoints:
    POST  /api/load-balancer/assign              — Auto-assign best doctor
    GET   /api/load-balancer/distribution         — Global load distribution
    GET   /api/load-balancer/distribution/{id}    — Hospital-specific distribution
    POST  /api/load-balancer/rebalance            — Rebalance analysis
    POST  /api/load-balancer/rebalance/apply      — Apply rebalance suggestion
    GET   /api/load-balancer/assignments/{id}     — Assignment history for patient
    GET   /api/load-balancer/config               — Get current config
    PUT   /api/load-balancer/config               — Update config (admin)
"""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.user import User, UserRole
from ..models.load_balancer import (
    DoctorAssignmentLog, LoadBalancerConfig, LBAlgorithm,
)
from ..schemas.load_balancer_schema import (
    AssignDoctorRequest, AssignDoctorResponse,
    LoadDistributionResponse,
    RebalanceResponse, RebalanceApplyRequest,
    AssignmentLogResponse,
    LoadBalancerConfigUpdate, LoadBalancerConfigResponse,
)
from ..services.auth_service import get_current_user
from ..services.load_balancer_service import DoctorLoadBalancer

router = APIRouter(prefix="/api/load-balancer", tags=["Load Balancer"])


# ═══════════════════════════════════════════
# ASSIGN DOCTOR
# ═══════════════════════════════════════════

@router.post("/assign", response_model=AssignDoctorResponse)
def assign_doctor(
    data: AssignDoctorRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Auto-assign the best available doctor to a patient using load balancing.

    The system evaluates all eligible doctors based on:
    - Current workload (active patient count)
    - Availability status (available, busy, etc.)
    - Doctor rating (patient feedback scores)
    - Years of experience
    - Estimated wait time

    Supports 4 algorithms: weighted_score, least_connections, round_robin, priority_based.
    """
    lb = DoctorLoadBalancer(db)

    try:
        result = lb.assign_doctor(
            patient_id=data.patient_id,
            hospital_id=data.hospital_id,
            specialization=data.specialization,
            department=data.department,
            urgency_level=data.urgency_level,
            algorithm_override=data.algorithm,
            assigned_by=current_user.id,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return AssignDoctorResponse(
        success=True,
        assignment_id=result["assignment_log"].id,
        patient_id=data.patient_id,
        assigned_doctor=result["assigned_doctor"],
        algorithm_used=result["algorithm_used"],
        candidates_evaluated=result["candidates_evaluated"],
        alternative_candidates=result["alternatives"],
        message=(
            f"Doctor {result['assigned_doctor'].full_name} assigned to patient "
            f"(score: {result['assigned_doctor'].score.total_score:.3f}, "
            f"algorithm: {result['algorithm_used']})"
        ),
    )


# ═══════════════════════════════════════════
# LOAD DISTRIBUTION
# ═══════════════════════════════════════════

@router.get("/distribution", response_model=LoadDistributionResponse)
def get_load_distribution(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get current load distribution across all doctors (global view)."""
    lb = DoctorLoadBalancer(db)
    data = lb.get_load_distribution()
    return LoadDistributionResponse(**data)


@router.get("/distribution/{hospital_id}", response_model=LoadDistributionResponse)
def get_hospital_load_distribution(
    hospital_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get current load distribution for a specific hospital."""
    lb = DoctorLoadBalancer(db)
    data = lb.get_load_distribution(hospital_id=hospital_id)
    return LoadDistributionResponse(**data)


# ═══════════════════════════════════════════
# REBALANCE
# ═══════════════════════════════════════════

@router.post("/rebalance", response_model=RebalanceResponse)
def analyze_rebalance(
    hospital_id: int = Query(None, description="Hospital ID to analyze, or None for global"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Analyze current load distribution and suggest reassignments
    when load variance exceeds the configured threshold.

    Only admins and doctors can trigger rebalance analysis.
    """
    if current_user.role not in [
        UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.DOCTOR
    ]:
        raise HTTPException(status_code=403, detail="Only admins and doctors can analyze rebalance")

    lb = DoctorLoadBalancer(db)
    result = lb.rebalance(hospital_id=hospital_id)
    return RebalanceResponse(**result)


@router.post("/rebalance/apply")
def apply_rebalance(
    data: RebalanceApplyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Apply a specific rebalance suggestion by reassigning a patient.

    Only admins can apply rebalance suggestions.
    """
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN]:
        raise HTTPException(status_code=403, detail="Only admins can apply rebalance")

    lb = DoctorLoadBalancer(db)
    try:
        log = lb.apply_rebalance(
            patient_id=data.patient_id,
            from_doctor_id=data.from_doctor_id,
            to_doctor_id=data.to_doctor_id,
            applied_by=current_user.id,
            reason=data.reason,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {
        "success": True,
        "assignment_id": log.id,
        "message": f"Patient {data.patient_id} reassigned from doctor {data.from_doctor_id} to {data.to_doctor_id}",
    }


# ═══════════════════════════════════════════
# ASSIGNMENT HISTORY
# ═══════════════════════════════════════════

@router.get("/assignments/{patient_id}", response_model=list[AssignmentLogResponse])
def get_assignment_history(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the full assignment history for a patient (audit trail)."""
    logs = db.query(DoctorAssignmentLog).filter(
        DoctorAssignmentLog.patient_id == patient_id
    ).order_by(DoctorAssignmentLog.created_at.desc()).all()

    return [AssignmentLogResponse.model_validate(log) for log in logs]


# ═══════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════

@router.get("/config", response_model=LoadBalancerConfigResponse)
def get_config(
    hospital_id: int = Query(None, description="Hospital ID, or None for global config"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get current load balancer configuration."""
    config = None
    if hospital_id:
        config = db.query(LoadBalancerConfig).filter(
            LoadBalancerConfig.hospital_id == hospital_id
        ).first()

    if not config:
        config = db.query(LoadBalancerConfig).filter(
            LoadBalancerConfig.hospital_id == None
        ).first()

    if not config:
        # Return default
        config = LoadBalancerConfig(
            id=0,
            hospital_id=None,
            algorithm=LBAlgorithm.WEIGHTED_SCORE,
        )

    return LoadBalancerConfigResponse.model_validate(config)


@router.put("/config", response_model=LoadBalancerConfigResponse)
def update_config(
    data: LoadBalancerConfigUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update load balancer configuration (weights, algorithm, thresholds).

    Only admins can update configuration. Weights should ideally sum to 1.0
    for meaningful scoring, but this is not strictly enforced.
    """
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN]:
        raise HTTPException(status_code=403, detail="Only admins can update load balancer config")

    config = None
    if data.hospital_id is not None:
        config = db.query(LoadBalancerConfig).filter(
            LoadBalancerConfig.hospital_id == data.hospital_id
        ).first()

    if not config:
        config = db.query(LoadBalancerConfig).filter(
            LoadBalancerConfig.hospital_id == None
        ).first()

    if not config:
        config = LoadBalancerConfig(hospital_id=data.hospital_id)
        db.add(config)

    # Apply updates
    update_fields = data.model_dump(exclude_unset=True)
    for field, value in update_fields.items():
        if field == "algorithm" and value:
            setattr(config, field, LBAlgorithm(value))
        else:
            setattr(config, field, value)

    config.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(config)

    return LoadBalancerConfigResponse.model_validate(config)
