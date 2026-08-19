# -*- coding: utf-8 -*-
"""
Load Balancer Models
=====================
Track doctor-patient assignment history, load balancer configuration,
and round-robin state for fair distribution.
"""

import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Enum, Text, ForeignKey, JSON
)
from ..database import Base


class LBAlgorithm(str, enum.Enum):
    WEIGHTED_SCORE = "weighted_score"
    LEAST_CONNECTIONS = "least_connections"
    ROUND_ROBIN = "round_robin"
    PRIORITY_BASED = "priority_based"


class DoctorAssignmentLog(Base):
    """Audit trail of every load-balanced doctor-patient assignment."""
    __tablename__ = "doctor_assignment_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # ── Algorithm & Scoring ──
    algorithm_used = Column(Enum(LBAlgorithm), nullable=False, default=LBAlgorithm.WEIGHTED_SCORE)
    total_score = Column(Float, nullable=True)
    score_breakdown = Column(JSON, nullable=True)  # {"workload": 0.85, "availability": 1.0, ...}

    # ── Context ──
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=True)
    specialization_requested = Column(String(255), nullable=True)
    urgency_level = Column(String(20), default="normal")  # normal, urgent, emergency, critical
    candidates_evaluated = Column(Integer, default=0)  # how many doctors were in the pool

    # ── Result ──
    was_auto_assigned = Column(Boolean, default=True)
    assigned_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # null = system

    # ── Timestamps ──
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<AssignmentLog patient={self.patient_id} -> doctor={self.doctor_id} ({self.algorithm_used.value})>"


class LoadBalancerConfig(Base):
    """Per-hospital configurable weights and algorithm selection."""
    __tablename__ = "load_balancer_configs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=True, unique=True, index=True)

    # ── Algorithm ──
    algorithm = Column(Enum(LBAlgorithm), default=LBAlgorithm.WEIGHTED_SCORE, nullable=False)

    # ── Weights (must sum to 1.0) ──
    weight_workload = Column(Float, default=0.40)
    weight_availability = Column(Float, default=0.25)
    weight_rating = Column(Float, default=0.15)
    weight_experience = Column(Float, default=0.10)
    weight_wait_time = Column(Float, default=0.10)

    # ── Thresholds ──
    max_patients_per_doctor = Column(Integer, default=15)
    rebalance_threshold = Column(Float, default=0.3)  # trigger rebalance when load variance > 30%
    enable_auto_assign = Column(Boolean, default=True)

    # ── Timestamps ──
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<LBConfig hospital={self.hospital_id} algo={self.algorithm.value}>"


class LoadBalancerRoundRobinState(Base):
    """Tracks the round-robin pointer per hospital/department combination."""
    __tablename__ = "lb_round_robin_state"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=True, index=True)
    department = Column(String(255), nullable=True)
    specialization = Column(String(255), nullable=True)

    # ── Pointer ──
    last_assigned_doctor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    assignment_count = Column(Integer, default=0)

    # ── Timestamps ──
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<RRState hospital={self.hospital_id} last_doctor={self.last_assigned_doctor_id}>"
