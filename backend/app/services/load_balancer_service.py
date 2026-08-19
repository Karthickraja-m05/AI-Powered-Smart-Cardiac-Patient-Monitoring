# -*- coding: utf-8 -*-
"""
Load Balancer Service
======================
Core engine for intelligent doctor-patient assignment using multiple
load-balancing algorithms: Weighted Score, Least Connections, Round Robin,
and Priority-Based.

System Design Pattern:
    This follows a Weighted Least-Connections model adapted for healthcare.
    Each doctor is treated as a "server" with capacity (max patients),
    current load (active patients), and quality-of-service metrics
    (rating, experience, availability).
"""

import math
import statistics
from datetime import datetime, date
from typing import Optional

from sqlalchemy.orm import Session
from sqlalchemy import func

from ..models.user import User, UserRole
from ..models.patient import Patient, PatientStatus
from ..models.doctor_availability import DoctorAvailability, AvailabilityStatus
from ..models.shift import DoctorShift
from ..models.load_balancer import (
    DoctorAssignmentLog, LoadBalancerConfig, LoadBalancerRoundRobinState, LBAlgorithm,
)
from ..schemas.load_balancer_schema import (
    ScoreBreakdown, CandidateDoctor, DoctorLoadInfo,
)


# ═══════════════════════════════════════════════════════════
# DEFAULT CONFIGURATION
# ═══════════════════════════════════════════════════════════

DEFAULT_WEIGHTS = {
    "workload": 0.40,
    "availability": 0.25,
    "rating": 0.15,
    "experience": 0.10,
    "wait_time": 0.10,
}

AVAILABILITY_SCORES = {
    AvailabilityStatus.AVAILABLE: 1.0,
    AvailabilityStatus.BUSY: 0.4,
    AvailabilityStatus.IN_SURGERY: 0.0,
    AvailabilityStatus.EMERGENCY: 0.1,
    AvailabilityStatus.MEETING: 0.3,
    AvailabilityStatus.OFF_DUTY: 0.0,
    AvailabilityStatus.VACATION: 0.0,
}

# Priority-based algorithm adjusts weights based on urgency
PRIORITY_WEIGHT_OVERRIDES = {
    "critical": {"workload": 0.15, "availability": 0.35, "rating": 0.25, "experience": 0.20, "wait_time": 0.05},
    "emergency": {"workload": 0.20, "availability": 0.35, "rating": 0.20, "experience": 0.15, "wait_time": 0.10},
    "urgent": {"workload": 0.30, "availability": 0.30, "rating": 0.15, "experience": 0.15, "wait_time": 0.10},
    "normal": DEFAULT_WEIGHTS,
}


# ═══════════════════════════════════════════════════════════
# DOCTOR LOAD BALANCER
# ═══════════════════════════════════════════════════════════

class DoctorLoadBalancer:
    """
    Stateless service that computes optimal doctor-patient assignments.

    Algorithms:
        - weighted_score:    Multi-factor scoring (default)
        - least_connections: Fewest active patients
        - round_robin:       Cycle through doctors sequentially
        - priority_based:    Weight adjustment by patient acuity
    """

    def __init__(self, db: Session):
        self.db = db

    # ───────────────────────────────────────────────────
    # PUBLIC: Main assignment entry point
    # ───────────────────────────────────────────────────

    def assign_doctor(
        self,
        patient_id: int,
        hospital_id: Optional[int] = None,
        specialization: Optional[str] = None,
        department: Optional[str] = None,
        urgency_level: str = "normal",
        algorithm_override: Optional[str] = None,
        assigned_by: Optional[int] = None,
    ) -> dict:
        """
        Assign the optimal doctor to a patient using load balancing.

        Returns dict with keys:
            - assigned_doctor: CandidateDoctor
            - alternatives: List[CandidateDoctor]
            - algorithm_used: str
            - assignment_log: DoctorAssignmentLog
        """
        # 1. Get configuration
        config = self._get_config(hospital_id)
        algorithm = LBAlgorithm(algorithm_override) if algorithm_override else config.algorithm

        # 2. Get eligible doctor pool
        eligible_doctors = self._get_eligible_doctors(
            hospital_id=hospital_id,
            specialization=specialization,
            department=department,
            max_patients=config.max_patients_per_doctor,
        )

        if not eligible_doctors:
            raise ValueError("No eligible doctors available for assignment")

        # 3. Get weights
        weights = self._get_weights(config, urgency_level, algorithm)

        # 4. Score all candidates
        candidates = []
        for doctor in eligible_doctors:
            candidate = self._build_candidate(doctor, weights, config.max_patients_per_doctor)
            candidates.append(candidate)

        # 5. Select best doctor based on algorithm
        if algorithm == LBAlgorithm.LEAST_CONNECTIONS:
            ranked = self._least_connections(candidates)
        elif algorithm == LBAlgorithm.ROUND_ROBIN:
            ranked = self._round_robin(candidates, hospital_id, department, specialization)
        elif algorithm == LBAlgorithm.PRIORITY_BASED:
            ranked = self._priority_based(candidates, urgency_level)
        else:
            # Default: weighted_score
            ranked = sorted(candidates, key=lambda c: c.score.total_score, reverse=True)

        best = ranked[0]
        alternatives = ranked[1:5]  # top 4 alternatives

        # 6. Apply assignment
        patient = self.db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            raise ValueError(f"Patient {patient_id} not found")

        patient.assigned_doctor_id = best.doctor_id
        patient.updated_at = datetime.utcnow()

        # 7. Update doctor workload counter
        doctor_user = self.db.query(User).filter(User.id == best.doctor_id).first()
        if doctor_user:
            doctor_user.current_workload = best.current_workload + 1

        # 8. Log assignment
        log = DoctorAssignmentLog(
            patient_id=patient_id,
            doctor_id=best.doctor_id,
            algorithm_used=algorithm,
            total_score=best.score.total_score,
            score_breakdown={
                "workload": best.score.workload_score,
                "availability": best.score.availability_score,
                "rating": best.score.rating_score,
                "experience": best.score.experience_score,
                "wait_time": best.score.wait_time_score,
            },
            hospital_id=hospital_id,
            specialization_requested=specialization,
            urgency_level=urgency_level,
            candidates_evaluated=len(candidates),
            was_auto_assigned=(assigned_by is None),
            assigned_by=assigned_by,
        )
        self.db.add(log)
        self.db.commit()
        self.db.refresh(log)

        return {
            "assigned_doctor": best,
            "alternatives": alternatives,
            "algorithm_used": algorithm.value,
            "assignment_log": log,
            "candidates_evaluated": len(candidates),
        }

    # ───────────────────────────────────────────────────
    # PUBLIC: Load distribution
    # ───────────────────────────────────────────────────

    def get_load_distribution(self, hospital_id: Optional[int] = None) -> dict:
        """
        Get current load distribution across all doctors.
        Returns stats and per-doctor load info for dashboard.
        """
        q = self.db.query(User).filter(User.role == UserRole.DOCTOR, User.is_active == True)
        if hospital_id:
            q = q.filter(User.hospital_id == hospital_id)

        doctors = q.all()
        config = self._get_config(hospital_id)

        doctor_loads = []
        utilizations = []

        for doc in doctors:
            active_patients = self._count_active_patients(doc.id)
            max_cap = config.max_patients_per_doctor
            utilization = (active_patients / max_cap * 100) if max_cap > 0 else 0.0

            avail = self.db.query(DoctorAvailability).filter(
                DoctorAvailability.doctor_id == doc.id
            ).first()
            status = avail.status.value if avail else "available"

            est_wait = active_patients * (doc.consultation_time_avg or 15)

            doctor_loads.append(DoctorLoadInfo(
                doctor_id=doc.id,
                full_name=doc.full_name,
                specialization=doc.specialization,
                department=doc.department,
                hospital_id=doc.hospital_id,
                current_patients=active_patients,
                max_capacity=max_cap,
                utilization_pct=round(utilization, 1),
                availability_status=status,
                rating_avg=doc.rating_avg,
                estimated_wait_minutes=est_wait,
                profile_photo=doc.profile_photo,
            ))
            utilizations.append(utilization)

        total_patients = sum(d.current_patients for d in doctor_loads)
        available_count = sum(1 for d in doctor_loads if d.availability_status == "available")

        avg_util = statistics.mean(utilizations) if utilizations else 0.0
        max_util = max(utilizations) if utilizations else 0.0
        min_util = min(utilizations) if utilizations else 0.0
        variance = statistics.stdev(utilizations) if len(utilizations) > 1 else 0.0

        return {
            "total_doctors": len(doctors),
            "available_doctors": available_count,
            "total_active_patients": total_patients,
            "avg_utilization_pct": round(avg_util, 1),
            "max_utilization_pct": round(max_util, 1),
            "min_utilization_pct": round(min_util, 1),
            "load_variance": round(variance, 2),
            "doctors": sorted(doctor_loads, key=lambda d: d.utilization_pct, reverse=True),
            "algorithm_in_use": config.algorithm.value,
            "hospital_id": hospital_id,
        }

    # ───────────────────────────────────────────────────
    # PUBLIC: Rebalance analysis
    # ───────────────────────────────────────────────────

    def rebalance(self, hospital_id: Optional[int] = None) -> dict:
        """
        Analyze current load distribution and suggest reassignments
        when load variance exceeds the configured threshold.
        """
        config = self._get_config(hospital_id)
        distribution = self.get_load_distribution(hospital_id)

        suggestions = []
        needs_rebalance = False

        # Check if variance exceeds threshold
        max_cap = config.max_patients_per_doctor
        if max_cap > 0 and distribution["load_variance"] > (config.rebalance_threshold * 100):
            needs_rebalance = True

            # Find overloaded and underloaded doctors
            overloaded = [d for d in distribution["doctors"]
                          if d.utilization_pct > 70 and d.availability_status != "off_duty"]
            underloaded = [d for d in distribution["doctors"]
                           if d.utilization_pct < 40 and d.availability_status == "available"]

            for over_doc in overloaded:
                for under_doc in underloaded:
                    if over_doc.current_patients <= under_doc.current_patients:
                        continue

                    # Find a transferable patient from the overloaded doctor
                    patient = self.db.query(Patient).filter(
                        Patient.assigned_doctor_id == over_doc.doctor_id,
                        Patient.status.in_(["admitted", "outpatient"]),
                        Patient.current_risk_level.in_([None, "low", "medium"]),
                    ).first()

                    if patient:
                        load_diff = over_doc.current_patients - under_doc.current_patients
                        impact = min(1.0, load_diff / max_cap)

                        suggestions.append({
                            "patient_id": patient.id,
                            "patient_name": patient.full_name,
                            "current_doctor_id": over_doc.doctor_id,
                            "current_doctor_name": over_doc.full_name,
                            "current_doctor_load": over_doc.current_patients,
                            "suggested_doctor_id": under_doc.doctor_id,
                            "suggested_doctor_name": under_doc.full_name,
                            "suggested_doctor_load": under_doc.current_patients,
                            "reason": (
                                f"Dr. {over_doc.full_name} has {over_doc.current_patients} patients "
                                f"({over_doc.utilization_pct:.0f}% utilization) while "
                                f"Dr. {under_doc.full_name} has {under_doc.current_patients} patients "
                                f"({under_doc.utilization_pct:.0f}% utilization)"
                            ),
                            "impact_score": round(impact, 2),
                        })

        # Sort by impact
        suggestions.sort(key=lambda s: s["impact_score"], reverse=True)

        message = "Load is balanced" if not needs_rebalance else (
            f"Load imbalance detected: variance={distribution['load_variance']:.1f}%, "
            f"threshold={config.rebalance_threshold * 100:.0f}%. "
            f"{len(suggestions)} reassignment(s) suggested."
        )

        return {
            "needs_rebalance": needs_rebalance,
            "current_variance": distribution["load_variance"],
            "threshold": config.rebalance_threshold * 100,
            "suggestions": suggestions[:10],  # top 10
            "message": message,
        }

    def apply_rebalance(
        self,
        patient_id: int,
        from_doctor_id: int,
        to_doctor_id: int,
        applied_by: Optional[int] = None,
        reason: Optional[str] = None,
    ) -> DoctorAssignmentLog:
        """Apply a rebalance suggestion by reassigning a patient."""
        patient = self.db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            raise ValueError(f"Patient {patient_id} not found")
        if patient.assigned_doctor_id != from_doctor_id:
            raise ValueError(f"Patient {patient_id} is not assigned to doctor {from_doctor_id}")

        # Reassign
        patient.assigned_doctor_id = to_doctor_id
        patient.updated_at = datetime.utcnow()

        # Update workload counters
        from_doc = self.db.query(User).filter(User.id == from_doctor_id).first()
        to_doc = self.db.query(User).filter(User.id == to_doctor_id).first()
        if from_doc and from_doc.current_workload > 0:
            from_doc.current_workload -= 1
        if to_doc:
            to_doc.current_workload += 1

        # Log
        log = DoctorAssignmentLog(
            patient_id=patient_id,
            doctor_id=to_doctor_id,
            algorithm_used=LBAlgorithm.WEIGHTED_SCORE,
            total_score=None,
            score_breakdown={"reason": reason or "rebalance"},
            urgency_level="normal",
            candidates_evaluated=1,
            was_auto_assigned=False,
            assigned_by=applied_by,
        )
        self.db.add(log)
        self.db.commit()
        self.db.refresh(log)
        return log

    # ───────────────────────────────────────────────────
    # PRIVATE: Filtering
    # ───────────────────────────────────────────────────

    def _get_eligible_doctors(
        self,
        hospital_id: Optional[int] = None,
        specialization: Optional[str] = None,
        department: Optional[str] = None,
        max_patients: int = 15,
    ) -> list:
        """
        Filter doctors by hospital, specialization, active shift,
        availability, and workload capacity.
        """
        q = self.db.query(User).filter(
            User.role == UserRole.DOCTOR,
            User.is_active == True,
        )

        if hospital_id:
            q = q.filter(User.hospital_id == hospital_id)
        if specialization:
            q = q.filter(User.specialization.ilike(f"%{specialization}%"))
        if department:
            q = q.filter(User.department.ilike(f"%{department}%"))

        doctors = q.all()

        eligible = []
        today = date.today()

        for doc in doctors:
            # Check availability — exclude off_duty, vacation, in_surgery
            avail = self.db.query(DoctorAvailability).filter(
                DoctorAvailability.doctor_id == doc.id
            ).first()

            if avail and avail.status in (
                AvailabilityStatus.OFF_DUTY,
                AvailabilityStatus.VACATION,
                AvailabilityStatus.IN_SURGERY,
            ):
                continue

            # Check active shift (if shift records exist)
            has_shifts = self.db.query(DoctorShift).filter(
                DoctorShift.doctor_id == doc.id,
            ).count() > 0

            if has_shifts:
                on_shift = self.db.query(DoctorShift).filter(
                    DoctorShift.doctor_id == doc.id,
                    DoctorShift.shift_date == today,
                    DoctorShift.is_active == True,
                ).first()
                if not on_shift:
                    continue

            # Check capacity
            active_patients = self._count_active_patients(doc.id)
            if active_patients >= max_patients:
                continue

            eligible.append(doc)

        return eligible

    # ───────────────────────────────────────────────────
    # PRIVATE: Scoring
    # ───────────────────────────────────────────────────

    def _build_candidate(self, doctor: User, weights: dict, max_capacity: int) -> CandidateDoctor:
        """Build a scored CandidateDoctor from a User model."""
        active_patients = self._count_active_patients(doctor.id)

        # Availability
        avail = self.db.query(DoctorAvailability).filter(
            DoctorAvailability.doctor_id == doctor.id
        ).first()
        avail_status = avail.status if avail else AvailabilityStatus.AVAILABLE
        avail_status_str = avail_status.value if isinstance(avail_status, AvailabilityStatus) else str(avail_status)

        # Component scores (all normalized 0.0 – 1.0)
        workload_score = max(0.0, 1.0 - (active_patients / max_capacity)) if max_capacity > 0 else 0.0
        availability_score = AVAILABILITY_SCORES.get(avail_status, 0.5)
        rating_score = (doctor.rating_avg or 3.0) / 5.0
        experience_score = min(1.0, (doctor.experience_years or 0) / 20.0)  # cap at 20 years

        est_wait = active_patients * (doctor.consultation_time_avg or 15)
        wait_time_score = max(0.0, 1.0 - (est_wait / 300.0))  # cap at 300 min (5 hours)

        # Weighted total
        total = (
            weights["workload"] * workload_score
            + weights["availability"] * availability_score
            + weights["rating"] * rating_score
            + weights["experience"] * experience_score
            + weights["wait_time"] * wait_time_score
        )

        score = ScoreBreakdown(
            workload_score=round(workload_score, 3),
            availability_score=round(availability_score, 3),
            rating_score=round(rating_score, 3),
            experience_score=round(experience_score, 3),
            wait_time_score=round(wait_time_score, 3),
            total_score=round(total, 3),
        )

        return CandidateDoctor(
            doctor_id=doctor.id,
            full_name=doctor.full_name,
            specialization=doctor.specialization,
            department=doctor.department,
            current_workload=active_patients,
            max_capacity=max_capacity,
            availability_status=avail_status_str,
            rating_avg=doctor.rating_avg,
            experience_years=doctor.experience_years,
            estimated_wait_minutes=est_wait,
            score=score,
            profile_photo=doctor.profile_photo,
        )

    # ───────────────────────────────────────────────────
    # PRIVATE: Algorithm implementations
    # ───────────────────────────────────────────────────

    def _least_connections(self, candidates: list) -> list:
        """Sort by fewest active patients (least connections)."""
        return sorted(candidates, key=lambda c: (c.current_workload, -c.score.total_score))

    def _round_robin(
        self,
        candidates: list,
        hospital_id: Optional[int],
        department: Optional[str],
        specialization: Optional[str],
    ) -> list:
        """
        Cycle through doctors in a deterministic order.
        Uses DB-backed state to track the last assigned doctor.
        """
        state = self.db.query(LoadBalancerRoundRobinState).filter(
            LoadBalancerRoundRobinState.hospital_id == hospital_id,
            LoadBalancerRoundRobinState.department == department,
            LoadBalancerRoundRobinState.specialization == specialization,
        ).first()

        # Sort candidates by ID for deterministic order
        sorted_candidates = sorted(candidates, key=lambda c: c.doctor_id)

        if state and state.last_assigned_doctor_id:
            # Find next doctor after the last assigned
            ids = [c.doctor_id for c in sorted_candidates]
            last_idx = -1
            for i, did in enumerate(ids):
                if did == state.last_assigned_doctor_id:
                    last_idx = i
                    break

            # Rotate the list so next doctor is first
            next_idx = (last_idx + 1) % len(sorted_candidates)
            sorted_candidates = sorted_candidates[next_idx:] + sorted_candidates[:next_idx]

        # Update state
        if sorted_candidates:
            if not state:
                state = LoadBalancerRoundRobinState(
                    hospital_id=hospital_id,
                    department=department,
                    specialization=specialization,
                )
                self.db.add(state)

            state.last_assigned_doctor_id = sorted_candidates[0].doctor_id
            state.assignment_count = (state.assignment_count or 0) + 1
            state.updated_at = datetime.utcnow()

        return sorted_candidates

    def _priority_based(self, candidates: list, urgency_level: str) -> list:
        """
        For priority-based, candidates are already scored with
        urgency-adjusted weights. Just sort by total score.
        """
        return sorted(candidates, key=lambda c: c.score.total_score, reverse=True)

    # ───────────────────────────────────────────────────
    # PRIVATE: Helpers
    # ───────────────────────────────────────────────────

    def _count_active_patients(self, doctor_id: int) -> int:
        """Count currently active patients assigned to a doctor."""
        return self.db.query(Patient).filter(
            Patient.assigned_doctor_id == doctor_id,
            Patient.status.in_([
                PatientStatus.ADMITTED,
                PatientStatus.ICU,
                PatientStatus.EMERGENCY,
                PatientStatus.OUTPATIENT,
            ]),
        ).count()

    def _get_config(self, hospital_id: Optional[int] = None) -> LoadBalancerConfig:
        """Get load balancer config for a hospital, or global default."""
        config = None
        if hospital_id:
            config = self.db.query(LoadBalancerConfig).filter(
                LoadBalancerConfig.hospital_id == hospital_id
            ).first()

        if not config:
            # Try global config (hospital_id = None)
            config = self.db.query(LoadBalancerConfig).filter(
                LoadBalancerConfig.hospital_id == None
            ).first()

        if not config:
            # Create default config
            config = LoadBalancerConfig(
                hospital_id=None,
                algorithm=LBAlgorithm.WEIGHTED_SCORE,
            )
            self.db.add(config)
            self.db.commit()
            self.db.refresh(config)

        return config

    def _get_weights(
        self,
        config: LoadBalancerConfig,
        urgency_level: str,
        algorithm: LBAlgorithm,
    ) -> dict:
        """Get scoring weights, adjusted for urgency if using priority_based."""
        if algorithm == LBAlgorithm.PRIORITY_BASED:
            return PRIORITY_WEIGHT_OVERRIDES.get(urgency_level, DEFAULT_WEIGHTS)

        return {
            "workload": config.weight_workload,
            "availability": config.weight_availability,
            "rating": config.weight_rating,
            "experience": config.weight_experience,
            "wait_time": config.weight_wait_time,
        }
