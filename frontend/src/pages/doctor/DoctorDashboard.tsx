import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { dashboardAPI, appointmentsAPI } from '../../services/api';
import type { DoctorDashboardData, Appointment } from '../../types';
import toast from 'react-hot-toast';
import {
  Calendar, CheckCircle, AlertTriangle, ShieldAlert, Clock, User,
  Heart, Activity, ArrowRight, Play, Check, X, RefreshCw, Eye
} from 'lucide-react';

const fadeIn = { initial: { opacity: 0, y: 15 }, animate: { opacity: 1, y: 0 } };

const statusBadges: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  available: { label: 'Available for Consults', dot: 'bg-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-400' },
  busy: { label: 'In Consultation', dot: 'bg-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-400' },
  in_surgery: { label: 'In Surgery (OR)', dot: 'bg-rose-400', bg: 'bg-rose-500/10 border-rose-500/20', text: 'text-rose-400' },
  emergency: { label: 'Emergency Duty', dot: 'bg-red-500', bg: 'bg-red-500/15 border-red-500/30', text: 'text-red-400' },
  meeting: { label: 'In Meeting', dot: 'bg-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', text: 'text-blue-400' },
  off_duty: { label: 'Off Duty', dot: 'bg-slate-400', bg: 'bg-slate-500/10 border-slate-500/20', text: 'text-slate-400' },
};

export default function DoctorDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [data, setData] = useState<DoctorDashboardData | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('available');
  const [processingAlertId, setProcessingAlertId] = useState<number | null>(null);

  const fetchDashboardData = async () => {
    try {
      const [dashRes, apptRes] = await Promise.all([
        dashboardAPI.getDoctorDashboard(),
        appointmentsAPI.list({ doctor_id: user?.id }),
      ]);

      setData(dashRes.data);
      if (dashRes.data.availability_status) {
        setStatus(dashRes.data.availability_status);
      }
      setAppointments(apptRes.data || []);
    } catch (err) {
      console.warn('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Listen for real-time WebSocket events
    const handleSync = () => fetchDashboardData();
    window.addEventListener('carebridge:emergency_alert', handleSync);
    window.addEventListener('carebridge:alert_updated', handleSync);
    window.addEventListener('carebridge:appointment_synced', handleSync);

    return () => {
      window.removeEventListener('carebridge:emergency_alert', handleSync);
      window.removeEventListener('carebridge:alert_updated', handleSync);
      window.removeEventListener('carebridge:appointment_synced', handleSync);
    };
  }, [user?.id]);

  const handleAcknowledgeAlert = async (alertId: number) => {
    setProcessingAlertId(alertId);
    try {
      await dashboardAPI.acknowledgeAlert(alertId, 'Acknowledged by attending cardiologist from doctor dashboard');
      toast.success(`Alert #${alertId} acknowledged`);
      fetchDashboardData();
    } catch (err) {
      toast.error('Failed to acknowledge alert');
    } finally {
      setProcessingAlertId(null);
    }
  };

  const handleResolveAlert = async (alertId: number) => {
    setProcessingAlertId(alertId);
    try {
      await dashboardAPI.resolveAlert(alertId, 'Patient condition evaluated and stabilized under clinical care.');
      toast.success(`Alert #${alertId} resolved`);
      fetchDashboardData();
    } catch (err) {
      toast.error('Failed to resolve alert');
    } finally {
      setProcessingAlertId(null);
    }
  };

  const handleUpdateAppointmentStatus = async (apptId: number, newStatus: string) => {
    try {
      await appointmentsAPI.update(apptId, { status: newStatus as any });
      toast.success(`Appointment status updated to ${newStatus}`);
      fetchDashboardData();
    } catch (err) {
      toast.error('Failed to update appointment status');
    }
  };

  const d = data;
  const currentBadge = statusBadges[status] || statusBadges.available;
  const patientsList = d?.patients || [];
  const alertsList = d?.recent_alerts || [];
  const queueList = d?.consultation_queue && d.consultation_queue.length > 0 ? d.consultation_queue : (
    appointments.slice(0, 5).map(a => ({
      id: a.id,
      time: new Date(a.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      patient_name: a.patient_name || `Patient #${a.patient_id}`,
      patient_id: a.patient_id,
      age: 50,
      type: a.appointment_type || 'Consultation',
      mode: 'In-Person',
      status: a.status,
      reason: a.reason || 'Cardiac Follow-up',
    }))
  );

  return (
    <div className="space-y-6">
      {/* ── Clinical Header Banner ── */}
      <motion.div
        {...fadeIn}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-950/80 via-slate-900/90 to-surface-900 border border-blue-500/20 p-6 backdrop-blur-xl shadow-2xl"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-sky-600 flex items-center justify-center text-2xl text-white font-bold shadow-lg shadow-blue-500/30 border border-white/10 flex-shrink-0">
              ⚕️
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  Welcome, Dr. {user?.full_name?.replace(/^Dr\.\s*/i, '') || 'Priya Sharma'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {user?.specialization || 'Cardiology Specialist'}
                </span>
              </div>
              <p className="text-slate-400 text-xs mt-1 flex items-center gap-2">
                <span>🏥 Department: <strong className="text-slate-200">{user?.department || 'Cardiology & CCU'}</strong></span>
                <span>•</span>
                <span>📅 {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start lg:self-auto">
            {/* Live Availability Status */}
            <button
              onClick={() => navigate('/availability')}
              className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl border ${currentBadge.bg} transition-all duration-200 hover:scale-[1.02] cursor-pointer group`}
              title="Click to manage availability and slots"
            >
              <span className={`w-2.5 h-2.5 rounded-full ${currentBadge.dot} animate-pulse`} />
              <div className="text-left">
                <p className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 leading-none">Duty Status</p>
                <p className={`text-xs font-bold ${currentBadge.text} mt-0.5 flex items-center gap-1`}>
                  {currentBadge.label} <span className="text-[10px] opacity-70 group-hover:translate-x-0.5 transition-transform">⚙️</span>
                </p>
              </div>
            </button>

            {/* Quick Shift Button */}
            <button
              onClick={() => navigate('/shifts')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-800/80 border border-white/10 hover:border-blue-500/30 text-slate-300 hover:text-white transition-all text-xs font-semibold cursor-pointer"
            >
              <span>🕐</span>
              <span>My Shift</span>
            </button>

            <button
              onClick={fetchDashboardData}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
              title="Refresh Clinical State"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Key Clinical Metrics (KPI Grid) ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Today's Consultations",
            value: appointments.length || d?.todays_appointments || 4,
            sub: 'Synchronized with Reception',
            icon: '📅',
            color: 'from-blue-500/20 to-blue-600/5 text-blue-400 border-blue-500/20',
          },
          {
            label: 'Assigned Inpatients',
            value: patientsList.length || d?.current_patients || 6,
            sub: 'Under Active CCU Monitoring',
            icon: '👥',
            color: 'from-indigo-500/20 to-indigo-600/5 text-indigo-400 border-indigo-500/20',
          },
          {
            label: 'Emergency / Critical Alerts',
            value: d?.critical_alerts || alertsList.length || 1,
            sub: 'Immediate Triage Required',
            icon: '🚨',
            color: 'from-red-500/20 to-red-600/5 text-rose-400 border-red-500/30 animate-pulse',
          },
          {
            label: 'Consultation Queue',
            value: queueList.length,
            sub: 'Waiting in OPD / Telehealth',
            icon: '⏱️',
            color: 'from-teal-500/20 to-teal-600/5 text-teal-400 border-teal-500/20',
          },
        ].map((kpi, idx) => (
          <motion.div
            key={idx}
            {...fadeIn}
            transition={{ delay: idx * 0.05 }}
            className={`p-4.5 rounded-2xl bg-gradient-to-br ${kpi.color} border backdrop-blur-sm shadow-lg`}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-400 font-medium">{kpi.label}</p>
              <span className="text-lg">{kpi.icon}</span>
            </div>
            <h3 className="text-2xl font-bold text-white mt-1">{kpi.value}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">{kpi.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Main Two-Column Clinical Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Emergency Alerts & Inpatients Roster */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Clinical Emergency Alerts */}
          <motion.div
            {...fadeIn}
            transition={{ delay: 0.2 }}
            className="bg-slate-900/80 backdrop-blur-xl border border-red-500/30 rounded-3xl p-5 shadow-xl shadow-red-950/20"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Critical & Emergency Alerts</h2>
                  <p className="text-xs text-slate-400">Direct multi-channel triage and automated routing</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                {alertsList.length} Active
              </span>
            </div>

            <div className="space-y-3">
              {alertsList.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  <CheckCircle className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                  No unacknowledged emergency alerts. All patients stable.
                </div>
              ) : (
                alertsList.map((alert: any) => {
                  const isEmergency = alert.severity === 'emergency' || alert.severity === 'critical';
                  return (
                    <div
                      key={alert.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isEmergency
                          ? 'bg-red-500/10 border-red-500/40 hover:border-red-500/60'
                          : 'bg-amber-500/10 border-amber-500/30'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <span className="text-xl mt-0.5">{isEmergency ? '🚨' : '⚠️'}</span>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-bold text-white">{alert.title}</p>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${
                                isEmergency ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              }`}>
                                {alert.severity}
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 mt-1 font-medium">
                              Patient: <strong className="text-white">{alert.patient_name}</strong> • {alert.message}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-1">
                              Triggered: {alert.triggered_at ? new Date(alert.triggered_at).toLocaleTimeString() : 'Recently'}
                            </p>
                          </div>
                        </div>

                        {/* Fast Action Buttons */}
                        <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                          {!alert.is_acknowledged ? (
                            <button
                              disabled={processingAlertId === alert.id}
                              onClick={() => handleAcknowledgeAlert(alert.id)}
                              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 flex items-center gap-1.5 transition-all disabled:opacity-50"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Acknowledge
                            </button>
                          ) : (
                            <button
                              disabled={processingAlertId === alert.id}
                              onClick={() => handleResolveAlert(alert.id)}
                              className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-lg shadow-teal-950/40 flex items-center gap-1.5 transition-all disabled:opacity-50"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              Resolve
                            </button>
                          )}
                          <button
                            onClick={() => navigate(`/patients/${alert.patient_id}`)}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all"
                            title="Inspect Patient EMR"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>

          {/* Assigned Inpatients Roster with Live Telemetry */}
          <motion.div
            {...fadeIn}
            transition={{ delay: 0.3 }}
            className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-5 shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  <Heart className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Assigned Inpatients Roster</h2>
                  <p className="text-xs text-slate-400">Patients admitted under your primary cardiology care</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/patients')}
                className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
              >
                View All ({patientsList.length}) →
              </button>
            </div>

            <div className="space-y-2.5">
              {patientsList.map((patient: any) => {
                const isCrit = patient.risk_level === 'critical';
                const isHigh = patient.risk_level === 'high';
                const isMed = patient.risk_level === 'medium';
                return (
                  <div
                    key={patient.id}
                    onClick={() => navigate(`/patients/${patient.id}`)}
                    className="p-3.5 rounded-2xl bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/60 hover:border-blue-500/40 transition-all cursor-pointer group flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-xs font-bold shadow flex-shrink-0">
                        {patient.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || 'PT'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                            {patient.name}
                          </p>
                          <span className="text-xs text-slate-400">({patient.age || 50}y, {patient.gender || 'M'})</span>
                        </div>
                        <p className="text-xs text-slate-400">
                          <span className="text-slate-300 font-mono font-medium">{patient.patient_uid}</span> • {patient.ward || 'Cardiac Ward'} • <span className="text-blue-300 font-medium">{patient.room || 'Bed 01'}</span>
                        </p>
                        {patient.primary_diagnosis && (
                          <p className="text-[11px] text-slate-500 truncate max-w-xs mt-0.5">
                            Dx: {patient.primary_diagnosis}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Vitals & Risk Badge */}
                    <div className="flex items-center gap-3 self-end md:self-center">
                      {patient.heart_rate && (
                        <div className="text-right hidden sm:block font-mono">
                          <p className="text-xs font-bold text-slate-200">{patient.heart_rate} bpm</p>
                          <p className="text-[10px] text-slate-400">SpO2: {patient.spo2}%</p>
                        </div>
                      )}

                      <span className={`px-2.5 py-1 rounded-xl text-xs font-bold uppercase tracking-wider ${
                        isCrit ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                        isHigh ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                        isMed ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {patient.risk_level || 'Stable'}
                      </span>

                      <span className="text-slate-500 group-hover:text-blue-400 transition-colors text-sm">
                        →
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Right Column: Today's Consultation Schedule & Queue */}
        <div className="space-y-6">
          {/* Today's Consultation Schedule (Synced live with Reception) */}
          <motion.div
            {...fadeIn}
            transition={{ delay: 0.25 }}
            className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-5 shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Consultation Queue</h2>
                  <p className="text-xs text-slate-400">Today's booked appointments</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/appointments')}
                className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
              >
                Manage ({appointments.length}) →
              </button>
            </div>

            <div className="space-y-3">
              {queueList.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  No appointments booked for today yet.
                </div>
              ) : (
                queueList.map((appt: any) => (
                  <div
                    key={appt.id}
                    className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/60 hover:border-blue-500/30 transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-lg">
                        {appt.time}
                      </span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                        appt.status === 'in_progress' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                        appt.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                        appt.status === 'cancelled' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                        'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                      }`}>
                        {appt.status?.replace('_', ' ')}
                      </span>
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-white">{appt.patient_name}</p>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{appt.reason || 'Cardiac consultation'}</p>
                    </div>

                    {/* Quick Consultation Status Action Controls */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-700/60 text-xs">
                      <span className="text-slate-500 text-[11px]">{appt.type}</span>
                      <div className="flex items-center gap-1.5">
                        {appt.status !== 'completed' && (
                          <>
                            {appt.status !== 'in_progress' ? (
                              <button
                                onClick={() => handleUpdateAppointmentStatus(appt.id, 'in_progress')}
                                className="px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold flex items-center gap-1 transition-colors"
                              >
                                <Play className="w-3 h-3" /> Start
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUpdateAppointmentStatus(appt.id, 'completed')}
                                className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold flex items-center gap-1 transition-colors"
                              >
                                <Check className="w-3 h-3" /> Complete
                              </button>
                            )}
                          </>
                        )}
                        <button
                          onClick={() => navigate(`/patients/${appt.patient_id}`)}
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium border border-slate-700"
                        >
                          EMR
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>

          {/* Quick Doctor Dispatch Actions */}
          <motion.div
            {...fadeIn}
            transition={{ delay: 0.35 }}
            className="bg-gradient-to-br from-blue-900/30 to-slate-900/80 border border-blue-500/20 rounded-3xl p-5 shadow-xl"
          >
            <p className="text-xs font-bold text-white uppercase tracking-wider mb-3">⚡ Clinical Fast Actions</p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => navigate('/monitoring')}
                className="p-3 rounded-2xl bg-slate-800/60 hover:bg-blue-500/20 border border-slate-700 hover:border-blue-500/40 text-left transition-all cursor-pointer group"
              >
                <span className="text-xl block">💓</span>
                <span className="text-xs font-bold text-white block mt-1 group-hover:text-blue-300 transition-colors">Live Vitals</span>
                <span className="text-[10px] text-slate-400">Continuous telemetry</span>
              </button>
              <button
                onClick={() => navigate('/availability')}
                className="p-3 rounded-2xl bg-slate-800/60 hover:bg-emerald-500/20 border border-slate-700 hover:border-emerald-500/40 text-left transition-all cursor-pointer group"
              >
                <span className="text-xl block">🟢</span>
                <span className="text-xs font-bold text-white block mt-1 group-hover:text-emerald-300 transition-colors">Availability</span>
                <span className="text-[10px] text-slate-400">Set duty status</span>
              </button>
              <button
                onClick={() => navigate('/shifts')}
                className="p-3 rounded-2xl bg-slate-800/60 hover:bg-indigo-500/20 border border-slate-700 hover:border-indigo-500/40 text-left transition-all cursor-pointer group"
              >
                <span className="text-xl block">🕐</span>
                <span className="text-xs font-bold text-white block mt-1 group-hover:text-indigo-300 transition-colors">My Shifts</span>
                <span className="text-[10px] text-slate-400">Roster & Wards</span>
              </button>
              <button
                onClick={() => navigate('/appointments')}
                className="p-3 rounded-2xl bg-slate-800/60 hover:bg-sky-500/20 border border-slate-700 hover:border-sky-500/40 text-left transition-all cursor-pointer group"
              >
                <span className="text-xl block">📅</span>
                <span className="text-xs font-bold text-white block mt-1 group-hover:text-sky-300 transition-colors">Appointments</span>
                <span className="text-[10px] text-slate-400">Booking & queue</span>
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
