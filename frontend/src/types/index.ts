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
  is_active: boolean;
  created_at: string;
}

export type UserRole = 'super_admin' | 'hospital_admin' | 'doctor' | 'nurse' | 'receptionist' | 'patient';

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
