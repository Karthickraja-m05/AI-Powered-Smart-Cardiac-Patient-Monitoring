import axios from 'axios';
import type {
  User, Patient, VitalSign, Prediction, Alert, DashboardStats, DashboardCharts,
  Medication, SymptomRecord, Hospital, Department, DoctorAvailability,
  DoctorSearchResult, DoctorReassignment, PatientTransfer, ChatMessage,
  Visitor, Appointment, DoctorRating, DoctorRatingSummary, AuditLogEntry, TimelineEvent,
  PatientDocument, DoctorShift, NurseShift, WaitingTime,
  DoctorDashboardData, NurseDashboardData, ReceptionistDashboardData,
  PatientDashboardData, CaregiverDashboardData, HospitalAdminDashboardData,
} from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('carebridge_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('carebridge_token');
      localStorage.removeItem('carebridge_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

// ─── Auth ───
export const authAPI = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
  getProfile: () => api.get<User>('/auth/me'),
  updateProfile: (data: Partial<User>) => api.put<User>('/auth/profile', data),
  register: (data: any) => api.post<User>('/auth/register', data),
  getUsers: (role?: string) => api.get<User[]>('/auth/users', { params: { role } }),
};

// ─── Patients ───
export const patientsAPI = {
  list: (params?: any) => api.get<{ patients: Patient[]; total: number }>('/patients', { params }),
  get: (id: number) => api.get<Patient>(`/patients/${id}`),
  create: (data: any) => api.post<Patient>('/patients', data),
  update: (id: number, data: any) => api.put<Patient>(`/patients/${id}`, data),
  delete: (id: number) => api.delete(`/patients/${id}`),
  discharge: (id: number) => api.post<Patient>(`/patients/${id}/discharge`),
};

// ─── Vitals ───
export const vitalsAPI = {
  record: (data: any) => api.post<VitalSign>('/vitals', data),
  getHistory: (patientId: number, hours?: number) =>
    api.get<VitalSign[]>(`/vitals/${patientId}`, { params: { hours } }),
  getLatest: (patientId: number) => api.get<VitalSign | null>(`/vitals/${patientId}/latest`),
};

// ─── Predictions ───
export const predictionsAPI = {
  create: (data: any) => api.post<Prediction>('/predictions', data),
  getHistory: (patientId: number) => api.get<Prediction[]>(`/predictions/${patientId}`),
  getLatest: (patientId: number) => api.get<Prediction | null>(`/predictions/${patientId}/latest`),
};

// ─── Symptoms ───
export const symptomsAPI = {
  record: (data: any) => api.post<SymptomRecord>('/symptoms', data),
  getHistory: (patientId: number) => api.get<SymptomRecord[]>(`/symptoms/${patientId}`),
};

// ─── Medications ───
export const medicationsAPI = {
  create: (data: any) => api.post<Medication>('/medications', data),
  getForPatient: (patientId: number, activeOnly?: boolean) =>
    api.get<Medication[]>(`/medications/${patientId}`, { params: { active_only: activeOnly } }),
  update: (id: number, data: any) => api.put<Medication>(`/medications/${id}`, data),
  administer: (id: number) => api.post(`/medications/${id}/administer`),
};

// ─── Dashboard ───
export const dashboardAPI = {
  getStats: () => api.get<DashboardStats>('/dashboard/stats'),
  getCharts: () => api.get<DashboardCharts>('/dashboard/charts'),
  getAlerts: (limit?: number) => api.get<Alert[]>('/dashboard/alerts', { params: { limit } }),
  acknowledgeAlert: (id: number) => api.post(`/dashboard/alerts/${id}/acknowledge`),
  // Role-specific dashboards
  getDoctorDashboard: () => api.get<DoctorDashboardData>('/dashboard/doctor'),
  getNurseDashboard: () => api.get<NurseDashboardData>('/dashboard/nurse'),
  getReceptionistDashboard: () => api.get<ReceptionistDashboardData>('/dashboard/receptionist'),
  getPatientDashboard: () => api.get<PatientDashboardData>('/dashboard/patient'),
  getCaregiverDashboard: () => api.get<CaregiverDashboardData>('/dashboard/caregiver'),
  getHospitalAdminDashboard: () => api.get<HospitalAdminDashboardData>('/dashboard/hospital-admin'),
};

// ─── Hospitals ───
export const hospitalsAPI = {
  list: () => api.get<Hospital[]>('/hospitals'),
  get: (id: number) => api.get<Hospital>(`/hospitals/${id}`),
  create: (data: any) => api.post<Hospital>('/hospitals', data),
  update: (id: number, data: any) => api.put<Hospital>(`/hospitals/${id}`, data),
  listDepartments: (hospitalId: number) => api.get<Department[]>(`/hospitals/${hospitalId}/departments`),
  createDepartment: (data: any) => api.post<Department>('/hospitals/departments', data),
};

// ─── Doctor Availability ───
export const doctorAvailabilityAPI = {
  get: (doctorId: number) => api.get<DoctorAvailability>(`/doctors/${doctorId}/availability`),
  update: (doctorId: number, data: any) => api.put<DoctorAvailability>(`/doctors/${doctorId}/availability`, data),
  searchAvailable: (params?: any) => api.get<DoctorSearchResult[]>('/doctors/available', { params }),
  requestReassignment: (data: any) => api.post<DoctorReassignment>('/doctors/reassign', data),
  getReassignmentHistory: (patientId: number) => api.get<DoctorReassignment[]>(`/doctors/reassignments/${patientId}`),
  getWaitingTime: (doctorId: number) => api.get<WaitingTime>(`/doctors/${doctorId}/waiting-time`),
};

// ─── Shifts ───
export const shiftsAPI = {
  createDoctorShift: (doctorId: number, data: any) => api.post<DoctorShift>(`/shifts/doctor/${doctorId}`, data),
  getDoctorShifts: (doctorId: number, params?: any) => api.get<DoctorShift[]>(`/shifts/doctor/${doctorId}`, { params }),
  getAllDoctorShifts: (params?: any) => api.get<DoctorShift[]>('/shifts/doctor', { params }),
  createNurseShift: (nurseId: number, data: any) => api.post<NurseShift>(`/shifts/nurse/${nurseId}`, data),
  getNurseShifts: (nurseId: number, params?: any) => api.get<NurseShift[]>(`/shifts/nurse/${nurseId}`, { params }),
  getAllNurseShifts: (params?: any) => api.get<NurseShift[]>('/shifts/nurse', { params }),
};

// ─── Transfers ───
export const transfersAPI = {
  create: (data: any) => api.post<PatientTransfer>('/transfers', data),
  getHistory: (patientId: number) => api.get<PatientTransfer[]>(`/transfers/${patientId}`),
};

// ─── Chat ───
export const chatAPI = {
  sendMessage: (data: any) => api.post<ChatMessage>('/chat/messages', data),
  getMessages: (patientId: number, limit?: number) =>
    api.get<ChatMessage[]>(`/chat/messages/${patientId}`, { params: { limit } }),
};

// ─── Visitors ───
export const visitorsAPI = {
  register: (data: any) => api.post<Visitor>('/visitors', data),
  listAll: (params?: { status?: string; limit?: number }) => api.get<Visitor[]>('/visitors', { params }),
  getForPatient: (patientId: number, status?: string) =>
    api.get<Visitor[]>(`/visitors/${patientId}`, { params: { status } }),
  checkIn: (visitorId: number) => api.post<Visitor>(`/visitors/${visitorId}/check-in`),
  checkOut: (visitorId: number) => api.post<Visitor>(`/visitors/${visitorId}/check-out`),
  verifyQR: (qrToken: string) => api.post<Visitor>(`/visitors/verify/${qrToken}`),
};

// ─── Appointments ───
export const appointmentsAPI = {
  list: (params?: { patient_id?: number; doctor_id?: number; status?: string; limit?: number }) =>
    api.get<Appointment[]>('/appointments', { params }),
  get: (id: number) => api.get<Appointment>(`/appointments/${id}`),
  create: (data: {
    patient_id: number;
    doctor_id: number;
    scheduled_at: string;
    duration_minutes?: number;
    appointment_type?: string;
    reason?: string;
    doctor_notes?: string;
  }) => api.post<Appointment>('/appointments', data),
  update: (id: number, data: Partial<Appointment>) => api.put<Appointment>(`/appointments/${id}`, data),
  cancel: (id: number) => api.delete(`/appointments/${id}`),
};

// ─── Ratings ───
export const ratingsAPI = {
  create: (data: any) => api.post<DoctorRating>('/ratings', data),
  getDoctorRatings: (doctorId: number) => api.get<DoctorRating[]>(`/ratings/doctor/${doctorId}`),
  getDoctorSummary: (doctorId: number) => api.get<DoctorRatingSummary>(`/ratings/doctor/${doctorId}/summary`),
};

// ─── Audit ───
export const auditAPI = {
  getLogs: (params?: any) => api.get<AuditLogEntry[]>('/audit', { params }),
};

// ─── Documents ───
export const documentsAPI = {
  upload: (patientId: number, formData: FormData) =>
    api.post<PatientDocument>(`/documents/${patientId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getForPatient: (patientId: number, docType?: string) =>
    api.get<PatientDocument[]>(`/documents/${patientId}`, { params: { doc_type: docType } }),
  delete: (docId: number) => api.delete(`/documents/${docId}`),
};

// ─── Timeline ───
export const timelineAPI = {
  getForPatient: (patientId: number, eventType?: string) =>
    api.get<TimelineEvent[]>(`/timeline/${patientId}`, { params: { event_type: eventType } }),
};

export default api;
