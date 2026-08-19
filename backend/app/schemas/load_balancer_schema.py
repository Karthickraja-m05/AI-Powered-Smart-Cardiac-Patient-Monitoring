# -*- coding: utf-8 -*-
"""Schemas for Load Balancer — Doctor-Patient Assignment System."""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


# ═══════════════════════════════════════════
# REQUEST SCHEMAS
# ═══════════════════════════════════════════

class AssignDoctorRequest(BaseModel):
    """Request to auto-assign the best doctor to a patient."""
    patient_id: int
    hospital_id: Optional[int] = None
    specialization: Optional[str] = None
    department: Optional[str] = None
    urgency_level: str = Field(default="normal", pattern="^(normal|urgent|emergency|critical)$")
    algorithm: Optional[str] = None  # override: weighted_score, least_connections, round_robin, priority_based


class LoadBalancerConfigUpdate(BaseModel):
    """Admin request to update load balancer weights and algorithm."""
    hospital_id: Optional[int] = None
    algorithm: Optional[str] = None
    weight_workload: Optional[float] = Field(None, ge=0.0, le=1.0)
    weight_availability: Optional[float] = Field(None, ge=0.0, le=1.0)
    weight_rating: Optional[float] = Field(None, ge=0.0, le=1.0)
    weight_experience: Optional[float] = Field(None, ge=0.0, le=1.0)
    weight_wait_time: Optional[float] = Field(None, ge=0.0, le=1.0)
    max_patients_per_doctor: Optional[int] = Field(None, ge=1, le=100)
    rebalance_threshold: Optional[float] = Field(None, ge=0.0, le=1.0)
    enable_auto_assign: Optional[bool] = None


class RebalanceApplyRequest(BaseModel):
    """Request to apply a specific rebalance suggestion."""
    patient_id: int
    from_doctor_id: int
    to_doctor_id: int
    reason: Optional[str] = None


# ═══════════════════════════════════════════
# RESPONSE SCHEMAS
# ═══════════════════════════════════════════

class ScoreBreakdown(BaseModel):
    """Detailed breakdown of a doctor's load-balancer score."""
    workload_score: float = 0.0
    availability_score: float = 0.0
    rating_score: float = 0.0
    experience_score: float = 0.0
    wait_time_score: float = 0.0
    total_score: float = 0.0


class CandidateDoctor(BaseModel):
    """A doctor evaluated by the load balancer with their score."""
    doctor_id: int
    full_name: str
    specialization: Optional[str] = None
    department: Optional[str] = None
    current_workload: int = 0
    max_capacity: int = 15
    availability_status: str = "available"
    rating_avg: Optional[float] = None
    experience_years: Optional[int] = None
    estimated_wait_minutes: int = 0
    score: ScoreBreakdown
    profile_photo: Optional[str] = None


class AssignDoctorResponse(BaseModel):
    """Response from the load balancer after assigning a doctor."""
    success: bool
    assignment_id: int
    patient_id: int
    assigned_doctor: CandidateDoctor
    algorithm_used: str
    candidates_evaluated: int
    alternative_candidates: List[CandidateDoctor] = []
    message: str


class DoctorLoadInfo(BaseModel):
    """Load information for a single doctor."""
    doctor_id: int
    full_name: str
    specialization: Optional[str] = None
    department: Optional[str] = None
    hospital_id: Optional[int] = None
    current_patients: int = 0
    max_capacity: int = 15
    utilization_pct: float = 0.0  # 0.0 to 100.0
    availability_status: str = "available"
    rating_avg: Optional[float] = None
    estimated_wait_minutes: int = 0
    profile_photo: Optional[str] = None


class LoadDistributionResponse(BaseModel):
    """Overview of load distribution across all doctors."""
    total_doctors: int = 0
    available_doctors: int = 0
    total_active_patients: int = 0
    avg_utilization_pct: float = 0.0
    max_utilization_pct: float = 0.0
    min_utilization_pct: float = 0.0
    load_variance: float = 0.0  # standard deviation of utilization
    doctors: List[DoctorLoadInfo] = []
    algorithm_in_use: str = "weighted_score"
    hospital_id: Optional[int] = None


class RebalanceSuggestion(BaseModel):
    """A suggested reassignment to balance load."""
    patient_id: int
    patient_name: str
    current_doctor_id: int
    current_doctor_name: str
    current_doctor_load: int
    suggested_doctor_id: int
    suggested_doctor_name: str
    suggested_doctor_load: int
    reason: str
    impact_score: float = 0.0  # how much this improves balance (0-1)


class RebalanceResponse(BaseModel):
    """Response from rebalance analysis."""
    needs_rebalance: bool
    current_variance: float
    threshold: float
    suggestions: List[RebalanceSuggestion] = []
    message: str


class AssignmentLogResponse(BaseModel):
    """A single assignment log entry."""
    id: int
    patient_id: int
    doctor_id: int
    algorithm_used: str
    total_score: Optional[float] = None
    score_breakdown: Optional[dict] = None
    hospital_id: Optional[int] = None
    specialization_requested: Optional[str] = None
    urgency_level: str = "normal"
    candidates_evaluated: int = 0
    was_auto_assigned: bool = True
    assigned_by: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class LoadBalancerConfigResponse(BaseModel):
    """Current load balancer configuration."""
    id: int
    hospital_id: Optional[int] = None
    algorithm: str
    weight_workload: float
    weight_availability: float
    weight_rating: float
    weight_experience: float
    weight_wait_time: float
    max_patients_per_doctor: int
    rebalance_threshold: float
    enable_auto_assign: bool
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
