# -*- coding: utf-8 -*-
"""Dashboard Schemas — Admin and role-based dashboard statistics."""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class DashboardStats(BaseModel):
    total_patients: int = 0
    total_doctors: int = 0
    total_nurses: int = 0
    todays_admissions: int = 0
    icu_patients: int = 0
    critical_patients: int = 0
    high_risk_patients: int = 0
    medium_risk_patients: int = 0
    low_risk_patients: int = 0
    patients_with_chest_pain: int = 0
    patients_with_breathing_problems: int = 0
    patients_with_fever: int = 0
    patients_with_abnormal_ecg: int = 0
    patients_missing_medication: int = 0
    emergency_cases_today: int = 0
    discharged_patients: int = 0
    total_beds: int = 100
    occupied_beds: int = 0
    bed_occupancy_percentage: float = 0.0


class ChartDataPoint(BaseModel):
    label: str
    value: float


class DashboardCharts(BaseModel):
    admissions_trend: List[ChartDataPoint] = []
    risk_distribution: List[ChartDataPoint] = []
    hourly_emergencies: List[ChartDataPoint] = []
    monthly_trends: List[ChartDataPoint] = []


class DoctorDashboard(BaseModel):
    assigned_patients: int = 0
    critical_patients: int = 0
    pending_reviews: int = 0
    todays_appointments: int = 0
    recent_predictions: List[Dict[str, Any]] = []
    patient_list: List[Dict[str, Any]] = []


class NurseDashboard(BaseModel):
    assigned_patients: int = 0
    pending_vitals: int = 0
    pending_medications: int = 0
    alerts_count: int = 0
    patient_list: List[Dict[str, Any]] = []
