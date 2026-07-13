import axios from 'axios';
import type { User, Patient, VitalSign, Prediction, Alert, DashboardStats, DashboardCharts, Medication, SymptomRecord } from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cardiosense_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('cardiosense_token');
      localStorage.removeItem('cardiosense_user');
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
};

export default api;
