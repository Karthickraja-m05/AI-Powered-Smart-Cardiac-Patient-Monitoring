import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { dashboardAPI } from '../../services/api';
import type { DoctorDashboardData } from '../../types';

const fadeIn = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };

const statusBadges: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  available: { label: 'Available for Consults', dot: 'bg-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-400' },
  busy: { label: 'In Consultation', dot: 'bg-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-400' },
  in_surgery: { label: 'In Surgery (OR)', dot: 'bg-rose-400', bg: 'bg-rose-500/10 border-rose-500/20', text: 'text-rose-400' },
  emergency: { label: 'Emergency Duty', dot: 'bg-red-500', bg: 'bg-red-500/15 border-red-500/30', text: 'text-red-400' },
  meeting: { label: 'In Meeting', dot: 'bg-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', text: 'text-blue-400' },
  off_duty: { label: 'Off Duty', dot: 'bg-slate-400', bg: 'bg-slate-500/10 border-slate-500/20', text: 'text-slate-400' },
  vacation: { label: 'On Leave', dot: 'bg-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', text: 'text-purple-400' },
};

const mockInpatients = [
  { id: 1, name: 'Ramesh Kumar', patient_uid: 'PAT-2026-001', age: 62, gender: 'Male', ward: 'Cardiac ICU', room: 'Bed ICU-03', risk_level: 'critical', risk_score: 91, heart_rate: 118, spo2: 92, bp: '165/102', primary_diagnosis: 'Acute Myocardial Infarction', admission_time: 'Today, 04:15 AM' },
  { id: 2, name: 'Ananya Sharma', patient_uid: 'PAT-2026-004', age: 48, gender: 'Female', ward: 'CCU Wing A', room: 'Room 204-B', risk_level: 'high', risk_score: 74, heart_rate: 96, spo2: 95, bp: '142/90', primary_diagnosis: 'Unstable Angina & Arrhythmia', admission_time: 'Yesterday, 08:30 PM' },
  { id: 3, name: 'Vikram Sethi', patient_uid: 'PAT-2026-007', age: 55, gender: 'Male', ward: 'Step-Down CCU', room: 'Room 112', risk_level: 'medium', risk_score: 48, heart_rate: 78, spo2: 98, bp: '128/82', primary_diagnosis: 'Post-PTCA Follow-up', admission_time: '2 days ago' },
  { id: 4, name: 'Kavita Menon', patient_uid: 'PAT-2026-012', age: 71, gender: 'Female', ward: 'General Ward 2', room: 'Bed 214', risk_level: 'low', risk_score: 22, heart_rate: 72, spo2: 99, bp: '120/78', primary_diagnosis: 'Hypertensive Heart Disease', admission_time: '3 days ago' },
];

const mockConsultationQueue = [
  { id: 101, time: '09:30 AM', patient_name: 'Harish Patel', age: 59, type: 'Follow-Up Visit', mode: 'In-Person', status: 'In Waiting', reason: 'Post-discharge Holter monitor review' },
  { id: 102, time: '10:15 AM', patient_name: 'Sunita Reddy', age: 44, type: 'Initial Cardiac Consult', mode: 'In-Person', status: 'Upcoming', reason: 'Exertional dyspnea & chest tightness' },
  { id: 103, time: '11:00 AM', patient_name: 'David Joseph', age: 66, type: 'Tele-Consultation', mode: 'Remote Video', status: 'Upcoming', reason: 'Lipid profile & Statin titration review' },
  { id: 104, time: '11:45 AM', patient_name: 'Meenakshi Sundaram', age: 52, type: 'Emergency Referral', mode: 'In-Person', status: 'Priority', reason: 'Abnormal ECG T-wave inversion' },
];

const mockClinicalAlerts = [
  { id: 201, patient_name: 'Ramesh Kumar (ICU-03)', title: 'Sustained Ventricular Tachycardia Alert', severity: 'emergency', time: '12 mins ago', metric: 'HR: 142 bpm • SpO2: 91%' },
  { id: 202, patient_name: 'Ananya Sharma (Room 204-B)', title: 'Systolic Blood Pressure Spike', severity: 'critical', time: '38 mins ago', metric: 'BP: 178/104 mmHg' },
  { id: 203, patient_name: 'Vikram Sethi (Room 112)', title: 'Missed Morning Antiplatelet Dose', severity: 'warning', time: '1 hr ago', metric: 'Clopidogrel 75mg' },
];

const mockActivityLog = [
  { id: 301, time: '08:45 AM', action: 'Approved Medication', detail: 'Amiodarone IV drip for Ramesh Kumar (ICU-03)' },
  { id: 302, time: '08:15 AM', action: 'ECG Review Completed', detail: '12-lead ECG signed off for Ananya Sharma — Sinus tachycardia with ST elevation' },
  { id: 303, time: '07:30 AM', action: 'Morning Rounds Handover', detail: 'Received 8 CCU patient handovers from Dr. Rajesh Kumar' },
];

export default function DoctorDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [data, setData] = useState<DoctorDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('available');

  useEffect(() => {
    dashboardAPI.getDoctorDashboard()
      .then(res => {
        setData(res.data);
        if (res.data.availability_status) {
          setStatus(res.data.availability_status);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const d = data;
  const currentBadge = statusBadges[status] || statusBadges.available;
  const patientsList = d?.patients && d.patients.length > 0 ? d.patients : mockInpatients;
  const alertsList = d?.recent_alerts && d.recent_alerts.length > 0 ? d.recent_alerts : mockClinicalAlerts;

  const totalAppts = d?.todays_appointments || 6;
  const activePatients = d?.current_patients || patientsList.length;
  const criticalCount = d?.critical_alerts || alertsList.filter(a => a.severity === 'emergency' || a.severity === 'critical').length;
  const queueLength = d?.queue_length || mockConsultationQueue.length;

  return (
    <div className="space-y-6">
      {/* ── Clinical Header Banner ── */}
      <motion.div
        {...fadeIn}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-950/80 via-slate-900/90 to-surface-900 border border-blue-500/20 p-6 backdrop-blur-xl shadow-2xl"
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
                  Welcome, Dr. {user?.full_name?.replace(/^Dr\.\s*/i, '') || 'Doctor'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {user?.specialization || 'Cardiologist'}
                </span>
              </div>
              <p className="text-slate-400 text-xs mt-1 flex items-center gap-2">
                <span>🏥 Department: <strong className="text-slate-200">{user?.department || 'Cardiology & CCU'}</strong></span>
                <span>•</span>
                <span>📅 Today: {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start lg:self-auto">
            {/* Live Availability Status Chip */}
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

            {/* Quick Shift Badge */}
            <button
              onClick={() => navigate('/shifts')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-800/80 border border-white/10 hover:border-blue-500/30 text-slate-300 hover:text-white transition-all text-xs font-semibold cursor-pointer"
            >
              <span>🕐</span>
              <span>My Shift</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Key Clinical Metrics (KPI Grid) ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Today's Appointments",
            value: totalAppts,
            sub: `${queueLength} pending in queue`,
            icon: '📅',
            gradient: 'from-blue-500 to-sky-600',
            bg: 'bg-blue-500/5',
            border: 'border-blue-500/20',
            textColor: 'text-blue-400',
            onClick: () => navigate('/appointments'),
          },
          {
            label: 'Assigned Inpatients',
            value: activePatients,
            sub: '4 in ICU / Step-Down',
            icon: '🛏️',
            gradient: 'from-sky-500 to-teal-600',
            bg: 'bg-sky-500/5',
            border: 'border-sky-500/20',
            textColor: 'text-sky-400',
            onClick: () => navigate('/patients'),
          },
          {
            label: 'Critical Vitals Alerts',
            value: criticalCount,
            sub: criticalCount > 0 ? 'Requires immediate review' : 'All vitals stable',
            icon: '🚨',
            gradient: 'from-rose-500 to-red-600',
            bg: 'bg-rose-500/5',
            border: 'border-rose-500/20',
            textColor: 'text-rose-400',
            onClick: () => navigate('/monitoring'),
          },
          {
            label: 'Consultation Queue',
            value: queueLength,
            sub: 'Next: Harish Patel (09:30 AM)',
            icon: '⏱️',
            gradient: 'from-indigo-500 to-violet-600',
            bg: 'bg-indigo-500/5',
            border: 'border-indigo-500/20',
            textColor: 'text-indigo-400',
            onClick: () => navigate('/appointments'),
          },
        ].map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={kpi.onClick}
            className={`${kpi.bg} border ${kpi.border} rounded-2xl p-4.5 hover:border-white/20 transition-all duration-200 cursor-pointer group relative overflow-hidden`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className={`w-10 h-10 rounded-xl bg-gradient-to-br ${kpi.gradient} flex items-center justify-center text-lg shadow-lg group-hover:scale-110 transition-transform`}>
                {kpi.icon}
              </span>
              <span className="text-xs text-slate-500 group-hover:text-slate-300 transition-colors">View →</span>
            </div>
            <p className="text-2xl font-bold text-white tracking-tight">{kpi.value}</p>
            <p className={`text-xs font-semibold ${kpi.textColor} mt-1`}>{kpi.label}</p>
            <p className="text-[11px] text-slate-400 mt-0.5 truncate">{kpi.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Main Clinical Grid (2 Columns) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left 2 Columns: Patients & Critical Alerts ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Clinical Alerts Feed */}
          <motion.div
            {...fadeIn}
            transition={{ delay: 0.2 }}
            className="bg-surface-800/60 backdrop-blur-sm border border-rose-500/20 rounded-2xl p-5 shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 text-sm">
                  🔔
                </span>
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    Active Clinical Alerts & ECG Telemetry
                    {alertsList.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        {alertsList.length} Active
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-slate-400">Continuous AI patient risk monitoring & vital threshold triggers</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/monitoring')}
                className="text-xs font-semibold text-rose-400 hover:text-rose-300 transition-colors"
              >
                Live Telemetry →
              </button>
            </div>

            <div className="space-y-3">
              {alertsList.map((alert: any) => {
                const isEmergency = alert.severity === 'emergency';
                const isCritical = alert.severity === 'critical';
                return (
                  <div
                    key={alert.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isEmergency
                        ? 'bg-red-500/10 border-red-500/30 hover:border-red-500/50'
                        : isCritical
                        ? 'bg-orange-500/10 border-orange-500/30 hover:border-orange-500/50'
                        : 'bg-amber-500/10 border-amber-500/30 hover:border-amber-500/50'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <span className="text-base mt-0.5">{isEmergency ? '🚨' : isCritical ? '⚠️' : '⚡'}</span>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-white">{alert.title}</p>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${
                              isEmergency ? 'bg-red-500/20 text-red-400' : isCritical ? 'bg-orange-500/20 text-orange-400' : 'bg-amber-500/20 text-amber-400'
                            }`}>
                              {alert.severity}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 mt-0.5 font-medium">{alert.patient_name || alert.message}</p>
                          {alert.metric && (
                            <p className="text-xs text-rose-300/90 font-mono mt-1 bg-black/20 px-2 py-0.5 rounded inline-block">
                              Telemetry: {alert.metric}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <span className="text-[11px] text-slate-400 mr-1">{alert.time || 'Active'}</span>
                        <button
                          onClick={() => navigate('/monitoring')}
                          className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all cursor-pointer"
                        >
                          Review Vitals
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Assigned Inpatients Roster */}
          <motion.div
            {...fadeIn}
            transition={{ delay: 0.3 }}
            className="bg-surface-800/60 backdrop-blur-sm border border-white/[0.06] rounded-2xl p-5 shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-sm">
                  👥
                </span>
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
                    className="p-3.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] hover:border-blue-500/30 transition-all cursor-pointer group flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-xs font-bold shadow flex-shrink-0">
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
                        <div className="text-right hidden sm:block">
                          <p className="text-xs font-mono font-bold text-slate-200">{patient.heart_rate} bpm</p>
                          <p className="text-[10px] text-slate-400">SpO2: {patient.spo2}%</p>
                        </div>
                      )}

                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
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

        {/* ── Right Column: Consultation Queue & Recent Actions ── */}
        <div className="space-y-6">
          {/* Today's Consultation Schedule */}
          <motion.div
            {...fadeIn}
            transition={{ delay: 0.25 }}
            className="bg-surface-800/60 backdrop-blur-sm border border-white/[0.06] rounded-2xl p-5 shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">📋</span>
                <h2 className="text-base font-bold text-white">Consultation Queue</h2>
              </div>
              <button
                onClick={() => navigate('/appointments')}
                className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
              >
                Schedule →
              </button>
            </div>

            <div className="space-y-3">
              {mockConsultationQueue.map((appt) => (
                <div
                  key={appt.id}
                  className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-blue-500/20 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                      {appt.time}
                    </span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                      appt.status === 'In Waiting' ? 'bg-amber-500/20 text-amber-300' :
                      appt.status === 'Priority' ? 'bg-red-500/20 text-red-300' :
                      'bg-slate-500/20 text-slate-300'
                    }`}>
                      {appt.status}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-white mt-1.5">{appt.patient_name} <span className="text-xs text-slate-400 font-normal">({appt.age}y)</span></p>
                  <p className="text-xs text-slate-400 mt-0.5">{appt.reason}</p>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/[0.04] text-[11px] text-slate-500">
                    <span>{appt.type}</span>
                    <span className="text-slate-400">📍 {appt.mode}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Recent Clinical Orders & Activity Stream */}
          <motion.div
            {...fadeIn}
            transition={{ delay: 0.35 }}
            className="bg-surface-800/60 backdrop-blur-sm border border-white/[0.06] rounded-2xl p-5 shadow-xl"
          >
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">⚡</span>
              <h2 className="text-base font-bold text-white">Recent Clinical Activity</h2>
            </div>

            <div className="relative pl-4 space-y-3.5 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/10">
              {mockActivityLog.map((log) => (
                <div key={log.id} className="relative">
                  <div className="absolute -left-[19px] top-1.5 w-2 h-2 rounded-full bg-blue-400 ring-4 ring-surface-900" />
                  <p className="text-xs font-semibold text-blue-300">{log.action}</p>
                  <p className="text-xs text-slate-300 mt-0.5">{log.detail}</p>
                  <p className="text-[10px] text-slate-500 mt-1">🕒 {log.time}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Fast Clinical Dispatcher */}
          <motion.div
            {...fadeIn}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-blue-900/30 to-surface-800/60 border border-blue-500/20 rounded-2xl p-4.5"
          >
            <p className="text-xs font-bold text-white uppercase tracking-wider mb-2.5">⚡ Fast Actions</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => navigate('/monitoring')}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-blue-500/20 border border-white/5 hover:border-blue-500/30 text-left transition-all cursor-pointer"
              >
                <span className="text-lg block">💓</span>
                <span className="text-xs font-semibold text-white block mt-1">Live Vitals</span>
                <span className="text-[10px] text-slate-400">ECG & telemetry</span>
              </button>
              <button
                onClick={() => navigate('/availability')}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-emerald-500/20 border border-white/5 hover:border-emerald-500/30 text-left transition-all cursor-pointer"
              >
                <span className="text-lg block">🟢</span>
                <span className="text-xs font-semibold text-white block mt-1">Availability</span>
                <span className="text-[10px] text-slate-400">Set duty status</span>
              </button>
              <button
                onClick={() => navigate('/shifts')}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-indigo-500/20 border border-white/5 hover:border-indigo-500/30 text-left transition-all cursor-pointer"
              >
                <span className="text-lg block">🕐</span>
                <span className="text-xs font-semibold text-white block mt-1">My Shifts</span>
                <span className="text-[10px] text-slate-400">Roster & Wards</span>
              </button>
              <button
                onClick={() => navigate('/appointments')}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-sky-500/20 border border-white/5 hover:border-sky-500/30 text-left transition-all cursor-pointer"
              >
                <span className="text-lg block">📅</span>
                <span className="text-xs font-semibold text-white block mt-1">Calendar</span>
                <span className="text-[10px] text-slate-400">Slots & Booking</span>
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
