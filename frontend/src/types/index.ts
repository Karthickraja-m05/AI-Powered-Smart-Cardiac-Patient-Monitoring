// ─── TypeScript Interfaces ───

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  profile_photo?: string;
  specialization?: string;
  department?: string;
  hospital_id?: number;
  experience_years?: number;
  rating_avg?: number;
  rating_count?: number;
  current_workload?: number;
  consultation_time_avg?: number;
  linked_patient_id?: number;
  caregiver_relation?: string;
  is_active: boolean;
  created_at: string;
}

export type UserRole = 'super_admin' | 'hospital_admin' | 'doctor' | 'nurse' | 'receptionist' | 'patient' | 'caregiver';

export interface Patient {
  id: number;
  patient_uid: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  age?: number;
  gender: string;
  blood_group?: string;
  photo?: string;
  height_cm?: number;
  weight_kg?: number;
  bmi?: number;
  phone?: string;
  email?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  status?: string;
  ward?: string;
  room_number?: string;
  bed_number?: string;
  assigned_doctor_id?: number;
  assigned_nurse_id?: number;
  assigned_caregiver_id?: number;
  hospital_id?: number;
  admission_date?: string;
  discharge_date?: string;
  admission_reason?: string;
  medical_history?: string;
  allergies?: string;
  is_smoker: boolean;
  alcohol_use: boolean;
  has_hypertension: boolean;
  has_diabetes: boolean;
  has_kidney_disease: boolean;
  has_previous_heart_disease: boolean;
  current_risk_level?: string;
  current_risk_score?: number;
  icu_priority_level?: string;
  icu_priority_score?: number;
  created_at: string;
}

export interface VitalSign {
  id: number;
  patient_id: number;
  heart_rate?: number;
  spo2?: number;
  temperature?: number;
  bp_systolic?: number;
  bp_diastolic?: number;
  respiratory_rate?: number;
  pulse?: number;
  ecg_data?: number[];
  pain_level?: number;
  stress_level?: number;
  source: string;
  recorded_at: string;
}

export interface Prediction {
  id: number;
  patient_id: number;
  risk_score: number;
  risk_percentage: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  confidence?: number;
  model_name?: string;
  feature_values?: Record<string, number>;
  shap_values?: Record<string, number>;
  top_risk_factors?: string[];
  predicted_at: string;
}

export interface Alert {
  id: number;
  patient_id: number;
  alert_type: string;
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  title: string;
  message: string;
  is_acknowledged: boolean;
  triggered_at: string;
}

export interface SymptomRecord {
  id: number;
  patient_id: number;
  chest_pain: boolean;
  breathing_difficulty: boolean;
  shortness_of_breath: boolean;
  palpitations: boolean;
  dizziness: boolean;
  fatigue: boolean;
  sweating: boolean;
  fever: boolean;
  pain_score?: number;
  notes?: string;
  recorded_at: string;
}

export interface Medication {
  id: number;
  patient_id: number;
  medicine_name: string;
  dose: string;
  frequency: string;
  route: string;
  status: string;
  doses_given: number;
  doses_missed: number;
  doses_total?: number;
  instructions?: string;
  next_dose_at?: string;
  last_administered_at?: string;
  created_at: string;
}

export interface DashboardStats {
  total_patients: number;
  total_doctors: number;
  total_nurses: number;
  todays_admissions: number;
  icu_patients: number;
  critical_patients: number;
  high_risk_patients: number;
  medium_risk_patients: number;
  low_risk_patients: number;
  patients_with_chest_pain: number;
  patients_with_breathing_problems: number;
  patients_with_fever: number;
  patients_with_abnormal_ecg: number;
  patients_missing_medication: number;
  emergency_cases_today: number;
  discharged_patients: number;
  total_beds: number;
  occupied_beds: number;
  bed_occupancy_percentage: number;
}

export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface DashboardCharts {
  admissions_trend: ChartDataPoint[];
  risk_distribution: ChartDataPoint[];
  hourly_emergencies: ChartDataPoint[];
  monthly_trends: ChartDataPoint[];
}

// ═══════════════════════════════════════════
// New Hospital Intelligence Platform Types
// ═══════════════════════════════════════════

export interface Hospital {
  id: number;
  name: string;
  code: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
  total_beds: number;
  icu_beds: number;
  emergency_beds: number;
  carbon_savings_kg: number;
  is_active: boolean;
  created_at: string;
}

export interface Department {
  id: number;
  hospital_id: number;
  name: string;
  code?: string;
  floor?: string;
  wing?: string;
  bed_count: number;
  head_doctor_id?: number;
  is_active: boolean;
}

export interface DoctorAvailability {
  id: number;
  doctor_id: number;
  status: AvailabilityStatusType;
  status_message?: string;
  expected_available_at?: string;
  updated_at: string;
}

export type AvailabilityStatusType = 'available' | 'busy' | 'in_surgery' | 'emergency' | 'meeting' | 'off_duty' | 'vacation';

export interface DoctorSearchResult {
  id: number;
  full_name: string;
  specialization?: string;
  department?: string;
  experience_years?: number;
  rating_avg?: number;
  rating_count: number;
  current_workload: number;
  consultation_time_avg: number;
  availability_status: string;
  estimated_wait_minutes: number;
  profile_photo?: string;
}

export interface DoctorReassignment {
  id: number;
  patient_id: number;
  from_doctor_id: number;
  to_doctor_id?: number;
  reason?: string;
  requested_by: number;
  status: string;
  created_at: string;
}

export interface PatientTransfer {
  id: number;
  patient_id: number;
  transfer_type: string;
  from_doctor_id?: number;
  from_ward?: string;
  from_room?: string;
  to_doctor_id?: number;
  to_ward?: string;
  to_room?: string;
  reason?: string;
  status: string;
  transferred_by: number;
  created_at: string;
}

export interface ChatMessage {
  id: number;
  patient_id: number;
  sender_id: number;
  sender_name?: string;
  sender_role?: string;
  message: string;
  message_type: string;
  is_urgent: boolean;
  created_at: string;
}

export interface Visitor {
  id: number;
  patient_id: number;
  visitor_name: string;
  phone?: string;
  relation?: string;
  qr_token?: string;
  status: string;
  check_in_at?: string;
  check_out_at?: string;
  scheduled_date?: string;
  scheduled_start?: string;
  scheduled_end?: string;
  created_at: string;
}

export interface Appointment {
  id: number;
  patient_id: number;
  patient_name?: string;
  patient_uid?: string;
  doctor_id: number;
  doctor_name?: string;
  doctor_specialization?: string;
  scheduled_at: string;
  duration_minutes?: number;
  appointment_type?: string;
  status: string;
  reason?: string;
  doctor_notes?: string;
  diagnosis?: string;
  treatment_plan?: string;
  created_at: string;
}

export interface DoctorRating {
  id: number;
  doctor_id: number;
  patient_id: number;
  communication: number;
  treatment: number;
  availability: number;
  kindness: number;
  overall: number;
  comment?: string;
  created_at: string;
}

export interface DoctorRatingSummary {
  doctor_id: number;
  doctor_name: string;
  total_ratings: number;
  avg_communication: number;
  avg_treatment: number;
  avg_availability: number;
  avg_kindness: number;
  avg_overall: number;
}

export interface AuditLogEntry {
  id: number;
  user_id?: number;
  username?: string;
  action: string;
  entity_type: string;
  entity_id?: number;
  description?: string;
  old_value?: any;
  new_value?: any;
  ip_address?: string;
  created_at: string;
}


export interface TimelineEvent {
  id: number;
  patient_id: number;
  event_type: string;
  title: string;
  description?: string;
  icon?: string;
  metadata_json?: Record<string, any>;
  created_by?: number;
  event_at: string;
  created_at: string;
}

export interface PatientDocument {
  id: number;
  patient_id: number;
  doc_type: string;
  title: string;
  description?: string;
  file_path: string;
  file_name?: string;
  file_size_bytes?: number;
  uploaded_by?: number;
  created_at: string;
}

export interface DoctorShift {
  id: number;
  doctor_id: number;
  hospital_id?: number;
  department?: string;
  shift_type: string;
  shift_date: string;
  start_time?: string;
  end_time?: string;
  is_active: boolean;
  checked_in: boolean;
}

export interface NurseShift {
  id: number;
  nurse_id: number;
  hospital_id?: number;
  ward?: string;
  shift_type: string;
  shift_date: string;
  patient_count: number;
  max_patients: number;
  is_active: boolean;
  checked_in: boolean;
}

export interface WaitingTime {
  doctor_id: number;
  doctor_name: string;
  current_patients: number;
  avg_consultation_minutes: number;
  queue_length: number;
  estimated_wait_minutes: number;
}

export interface InAppNotification {
  id: number;
  recipient_id: number;
  title: string;
  message: string;
  channel: string;
  patient_id?: number;
  patient_name?: string;
  patient_uid?: string;
  alert_id?: number;
  is_read: boolean;
  created_at: string;
}

// Role-specific dashboard data
export interface DoctorDashboardData {
  todays_appointments: number;
  current_patients: number;
  critical_alerts: number;
  queue_length: number;
  pending_lab_reports: number;
  pending_med_approvals: number;
  upcoming_surgeries: number;
  availability_status: string;
  patients: any[];
  recent_alerts: any[];
  todays_appointments_list?: Appointment[];
  upcoming_appointments_list?: Appointment[];
  consultation_queue?: any[];
  activity_log?: any[];
}

export interface NurseDashboardData {
  assigned_patients: number;
  pending_medications: number;
  pending_injections: number;
  pending_vitals: number;
  emergency_alerts: number;
  shift_info?: { type: string; start?: string; end?: string };
  patients: any[];
  medication_schedule: any[];
}

export interface ReceptionistDashboardData {
  todays_admissions: number;
  todays_discharges: number;
  pending_appointments: number;
  available_beds: number;
  available_doctors: number;
  waiting_patients: number;
  recent_registrations: any[];
}

export interface PatientDashboardData {
  current_vitals?: any;
  medications: any[];
  upcoming_appointments: any[];
  recent_reports: any[];
  assigned_doctor?: any;
  assigned_nurse?: any;
  risk_level?: string;
  risk_score?: number;
}

export interface CaregiverDashboardData {
  patient_status?: string;
  patient_name?: string;
  room_number?: string;
  ward?: string;
  assigned_doctor?: any;
  assigned_nurse?: any;
  doctor_available: boolean;
  current_vitals?: any;
  medications: any[];
  upcoming_appointments: any[];
  visitor_schedule: any[];
}

export interface HospitalAdminDashboardData {
  total_patients: number;
  todays_admissions: number;
  todays_discharges: number;
  available_doctors: number;
  available_nurses: number;
  total_beds: number;
  occupied_beds: number;
  emergency_cases: number;
  icu_patients: number;
  departments: any[];
  equipment_status: any[];
}

// ─── Clinical Intelligence Types ───

export interface BaselineMetric {
  baseline_mean: number;
  baseline_std: number;
  normal_range_low: number;
  normal_range_high: number;
  unit: string;
  is_personalized: boolean;
  samples_used: number;
}

export interface VitalDeviation {
  current_value: number;
  z_score: number;
  status: 'NORMAL' | 'MILD_DEVIATION' | 'CRITICAL_DEVIATION';
  unit: string;
}

export interface PatientBaselineData {
  patient_id: number;
  window_size: number;
  total_historical_samples: number;
  is_model_trained: boolean;
  baselines: Record<string, BaselineMetric>;
  current_deviations: Record<string, VitalDeviation>;
  overall_instability_index: number;
  evaluated_at: string;
}

export interface VitalTrajectory {
  current: number;
  slope_per_min: number;
  forecast_5m: number;
  forecast_10m: number;
  forecast_15m: number;
}

export interface RiskForecastData {
  patient_id: number;
  status: string;
  current_risk_percentage: number;
  projected_risk_percentage_15m: number;
  risk_trajectory_delta: number;
  trend_velocity: 'RAPIDLY_WORSENING' | 'MILDLY_WORSENING' | 'STABLE' | 'IMPROVING';
  trajectories: Record<string, VitalTrajectory>;
  early_warning: string | null;
  computed_at: string;
}

export interface CounterfactualAction {
  biomarker: string;
  display_name: string;
  current_value: number;
  target_value: number;
  unit: string;
  projected_risk_with_intervention: number;
  projected_risk_level: string;
  risk_reduction_percentage: number;
  action_statement: string;
}

export interface CounterfactualData {
  current_risk_percentage: number;
  current_risk_level: string;
  counterfactual_actions: CounterfactualAction[];
  comprehensive_bundle: {
    projected_risk_percentage: number;
    projected_risk_level: string;
    total_possible_risk_reduction: number;
    summary: string;
  };
}

export interface SmartTransferRecommendation {
  patient_id: number;
  patient_name: string;
  current_ward: string;
  current_risk_score: number;
  projected_15m_risk_score: number;
  baseline_instability_index: number;
  recommended_action: 'MAINTAIN_WARD_MONITORING' | 'URGENT_DOCTOR_REVIEW' | 'ESCALATE_TO_CARDIOLOGY' | 'TRANSFER_TO_ICU' | 'PREPARE_DISCHARGE';
  urgency_level: 'ROUTINE' | 'ELEVATED' | 'HIGH' | 'IMMEDIATE';
  target_department: string;
  clinical_rationale: string;
  suggested_attending_doctor?: {
    doctor_id: number;
    doctor_name: string;
    specialization: string;
    match_score: number;
  };
  generated_at: string;
}

export interface PostDischargeData {
  patient_id: number;
  patient_name: string;
  discharge_status: string;
  medication_adherence_percentage: number;
  doses_missed: number;
  missed_appointments_count: number;
  upcoming_appointments_count: number;
  active_red_flags: string[];
  readmission_risk_score: number;
  follow_up_status: string;
  recommended_clinical_action: string;
  evaluated_at: string;
}

export interface PrivacyAuditSummary {
  data_processing_model: string;
  cloud_data_leakage_risk: string;
  encryption_at_rest: string;
  transport_security: string;
  rbac_enforcement: string;
  total_tamper_evident_audit_entries: number;
  recent_audit_events: Array<{
    id: number;
    action: string;
    entity: string;
    user_id: number;
    timestamp: string;
  }>;
  compliance_alignment: string[];
}
