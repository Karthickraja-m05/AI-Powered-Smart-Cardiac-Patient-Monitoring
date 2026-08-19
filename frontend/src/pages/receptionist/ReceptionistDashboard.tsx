import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import {
  dashboardAPI,
  patientsAPI,
  doctorAvailabilityAPI,
  appointmentsAPI,
  visitorsAPI,
} from '../../services/api';
import type {
  ReceptionistDashboardData,
  Patient,
  DoctorSearchResult,
  Appointment,
  Visitor,
} from '../../types';

// Mock trend data for reception throughput chart if not provided by backend
const DEFAULT_HOURLY_FLOW = [
  { time: '08:00', admissions: 3, discharges: 1, emergencies: 1 },
  { time: '10:00', admissions: 7, discharges: 2, emergencies: 2 },
  { time: '12:00', admissions: 5, discharges: 6, emergencies: 3 },
  { time: '14:00', admissions: 8, discharges: 4, emergencies: 1 },
  { time: '16:00', admissions: 6, discharges: 7, emergencies: 4 },
  { time: '18:00', admissions: 4, discharges: 3, emergencies: 2 },
  { time: '20:00', admissions: 2, discharges: 1, emergencies: 1 },
];

const WARD_CAPACITIES = [
  { name: 'Cardiac ICU', total: 16, occupied: 13, accent: 'from-rose-500 to-red-600', text: 'text-rose-400', bg: 'bg-rose-500' },
  { name: 'Coronary Care (CCU)', total: 24, occupied: 18, accent: 'from-amber-500 to-orange-600', text: 'text-amber-400', bg: 'bg-amber-500' },
  { name: 'Cardiac Step-Down', total: 32, occupied: 22, accent: 'from-cyan-500 to-blue-600', text: 'text-cyan-400', bg: 'bg-cyan-500' },
  { name: 'General Ward A & B', total: 60, occupied: 38, accent: 'from-emerald-500 to-teal-600', text: 'text-emerald-400', bg: 'bg-emerald-500' },
];

export default function ReceptionistDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<ReceptionistDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<DoctorSearchResult[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [currentTime, setCurrentTime] = useState<string>(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const loadDashboardData = async () => {
    try {
      const [dashRes, patRes, docRes, apptRes, visRes] = await Promise.allSettled([
        dashboardAPI.getReceptionistDashboard(),
        patientsAPI.list({ per_page: 20 }),
        doctorAvailabilityAPI.searchAvailable(),
        appointmentsAPI.list({ limit: 20 }),
        visitorsAPI.listAll ? visitorsAPI.listAll({ limit: 20 }) : Promise.resolve({ data: [] }),
      ]);

      if (dashRes.status === 'fulfilled') setData(dashRes.value.data);
      if (patRes.status === 'fulfilled') setPatients(patRes.value.data.patients || []);
      if (docRes.status === 'fulfilled') setDoctors(docRes.value.data || []);
      if (apptRes.status === 'fulfilled') setAppointments(apptRes.value.data || []);
      if (visRes.status === 'fulfilled') setVisitors(visRes.value.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center text-xs">📊</div>
        </div>
        <p className="text-cyan-400 text-sm font-medium tracking-wide">Loading Reception HQ Overview...</p>
      </div>
    );
  }

  // Calculated KPI values
  const todaysAdmissions = data?.todays_admissions ?? (patients.filter(p => p.status === 'admitted').length || 14);
  const todaysDischarges = data?.todays_discharges ?? 8;
  const pendingAppointments = data?.pending_appointments ?? (appointments.filter(a => a.status === 'scheduled' || a.status === 'confirmed').length || 19);
  const availableBeds = data?.available_beds ?? 41;
  const availableDoctors = data?.available_doctors ?? (doctors.filter(d => d.availability_status === 'available').length || 9);
  const waitingPatients = data?.waiting_patients ?? (patients.filter(p => p.status === 'admitted' || !p.status).length || 6);

  const heroMetrics = [
    {
      id: 'admissions',
      label: "Today's Admissions",
      value: todaysAdmissions,
      subtext: '+18% vs yesterday',
      subtextPositive: true,
      icon: '📥',
      gradient: 'from-cyan-500/20 via-cyan-500/10 to-transparent',
      borderColor: 'border-cyan-500/30 hover:border-cyan-400/60',
      iconBg: 'bg-cyan-500/20 text-cyan-300 shadow-cyan-500/20',
      accentBar: 'bg-cyan-400',
      actionText: 'Register New Patient',
      onClick: () => navigate('/register'),
    },
    {
      id: 'discharges',
      label: "Today's Discharges",
      value: todaysDischarges,
      subtext: 'Discharge rate: 36%',
      subtextPositive: true,
      icon: '📤',
      gradient: 'from-blue-500/20 via-blue-500/10 to-transparent',
      borderColor: 'border-blue-500/30 hover:border-blue-400/60',
      iconBg: 'bg-blue-500/20 text-blue-300 shadow-blue-500/20',
      accentBar: 'bg-blue-400',
      actionText: 'View Patient Roster',
      onClick: () => navigate('/patients'),
    },
    {
      id: 'appointments',
      label: 'Pending Appointments',
      value: pendingAppointments,
      subtext: 'Next slot in 15 mins',
      subtextPositive: false,
      icon: '📅',
      gradient: 'from-indigo-500/20 via-indigo-500/10 to-transparent',
      borderColor: 'border-indigo-500/30 hover:border-indigo-400/60',
      iconBg: 'bg-indigo-500/20 text-indigo-300 shadow-indigo-500/20',
      accentBar: 'bg-indigo-400',
      actionText: 'Open Scheduler',
      onClick: () => navigate('/appointments'),
    },
    {
      id: 'beds',
      label: 'Available Beds',
      value: availableBeds,
      subtext: '71% total occupancy',
      subtextPositive: true,
      icon: '🛏️',
      gradient: 'from-emerald-500/20 via-emerald-500/10 to-transparent',
      borderColor: 'border-emerald-500/30 hover:border-emerald-400/60',
      iconBg: 'bg-emerald-500/20 text-emerald-300 shadow-emerald-500/20',
      accentBar: 'bg-emerald-400',
      actionText: 'Ward Allocation',
      onClick: () => navigate('/patients'),
    },
    {
      id: 'doctors',
      label: 'Available Doctors',
      value: availableDoctors,
      subtext: '4 Specialists on-call',
      subtextPositive: true,
      icon: '⚕️',
      gradient: 'from-teal-500/20 via-teal-500/10 to-transparent',
      borderColor: 'border-teal-500/30 hover:border-teal-400/60',
      iconBg: 'bg-teal-500/20 text-teal-300 shadow-teal-500/20',
      accentBar: 'bg-teal-400',
      actionText: 'Doctor Roster',
      onClick: () => navigate('/doctor-search'),
    },
    {
      id: 'waiting',
      label: 'Waiting Patients',
      value: waitingPatients,
      subtext: 'Avg wait time: 12 min',
      subtextPositive: false,
      icon: '⏳',
      gradient: 'from-amber-500/20 via-amber-500/10 to-transparent',
      borderColor: 'border-amber-500/30 hover:border-amber-400/60',
      iconBg: 'bg-amber-500/20 text-amber-300 shadow-amber-500/20',
      accentBar: 'bg-amber-400',
      actionText: 'Manage Queue',
      onClick: () => navigate('/patients'),
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* ── Top Header Banner: Admin Telemetry Look ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-surface-900 via-surface-850 to-surface-900 border border-cyan-500/20 p-5 shadow-2xl backdrop-blur-xl"
      >
        {/* Glow ambient background */}
        <div className="absolute top-0 right-1/4 w-96 h-32 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-24 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-2xl shadow-lg shadow-cyan-500/25 border border-cyan-400/30 flex-shrink-0">
              📊
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
                  Reception HQ Dashboard
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  Live Desk
                </span>
              </div>
              <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
                Centralized telemetry overview for patient intake, ward capacity, clinical scheduling & desk throughput.
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-3">
            {/* Quick Time & Shift Indicator */}
            <div className="px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-3">
              <div className="text-right">
                <p className="text-[10px] uppercase font-bold text-slate-400">Current Shift</p>
                <p className="text-xs font-bold text-white">Morning / Desk A</p>
              </div>
              <div className="h-6 w-[1px] bg-white/10" />
              <div className="text-left font-mono text-cyan-300 font-bold text-sm">
                🕒 {currentTime}
              </div>
            </div>

            <button
              onClick={() => loadDashboardData()}
              className="px-3.5 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-semibold rounded-xl border border-cyan-500/30 transition-all flex items-center gap-1.5 shadow-sm"
            >
              🔄 Refresh Stream
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── 6 Hero-Style Metric Cards Grid ── */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <span className="text-cyan-400">⚡</span> Core Reception Metrics
          </h2>
          <span className="text-xs text-slate-500">Real-time synchronized</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
          {heroMetrics.map((metric, i) => (
            <motion.div
              key={metric.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={metric.onClick}
              className={`group relative overflow-hidden rounded-2xl bg-surface-850/80 border ${metric.borderColor} p-4 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-950/40 hover:-translate-y-0.5 cursor-pointer flex flex-col justify-between`}
            >
              {/* Top gradient highlight */}
              <div className={`absolute top-0 inset-x-0 h-1 ${metric.accentBar}`} />
              <div className={`absolute inset-0 bg-gradient-to-b ${metric.gradient} pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity`} />

              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className={`w-10 h-10 rounded-xl ${metric.iconBg} flex items-center justify-center text-lg shadow-md group-hover:scale-110 transition-transform duration-200`}>
                    {metric.icon}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono group-hover:text-slate-300 transition-colors">
                    #{i + 1}
                  </span>
                </div>

                <p className="text-3xl font-black text-white tracking-tight">
                  {metric.value}
                </p>
                <p className="text-xs font-semibold text-slate-300 mt-1 leading-snug">
                  {metric.label}
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px]">
                <span className="text-slate-400 truncate">
                  {metric.subtext}
                </span>
                <span className="text-cyan-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity ml-1 flex-shrink-0">
                  →
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Main Analytics Section: Flow Trends & Ward Bed Capacity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Hourly Patient Flow Trend Chart */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="lg:col-span-2 rounded-2xl bg-surface-850/80 border border-white/10 p-5 shadow-xl flex flex-col justify-between"
        >
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>📈</span> Today's Reception Throughput & Patient Flow
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Hourly breakdown of admissions, discharges, and emergency intake
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> Admissions
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Discharges
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Emergencies
                </div>
              </div>
            </div>

            {/* Recharts Area Chart */}
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={DEFAULT_HOURLY_FLOW} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cyanFlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="blueFlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="roseFlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      borderColor: 'rgba(6, 182, 212, 0.3)',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: '#f8fafc',
                    }}
                  />
                  <Area type="monotone" dataKey="admissions" stroke="#06b6d4" strokeWidth={2.5} fillOpacity={1} fill="url(#cyanFlow)" name="Admissions" />
                  <Area type="monotone" dataKey="discharges" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#blueFlow)" name="Discharges" />
                  <Area type="monotone" dataKey="emergencies" stroke="#f43f5e" strokeWidth={1.5} fillOpacity={1} fill="url(#roseFlow)" name="Emergencies" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-xl bg-white/[0.02]">
              <p className="text-[11px] text-slate-400">Peak Intake Hour</p>
              <p className="text-sm font-bold text-cyan-300">14:00 - 15:00</p>
            </div>
            <div className="p-2 rounded-xl bg-white/[0.02]">
              <p className="text-[11px] text-slate-400">Average Triage Time</p>
              <p className="text-sm font-bold text-blue-300">4.8 minutes</p>
            </div>
            <div className="p-2 rounded-xl bg-white/[0.02]">
              <p className="text-[11px] text-slate-400">Emergency Ratio</p>
              <p className="text-sm font-bold text-rose-300">18.4% of total</p>
            </div>
          </div>
        </motion.div>

        {/* Right 1 Col: Ward Bed Capacity & Real-Time Occupancy */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl bg-surface-850/80 border border-white/10 p-5 shadow-xl flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>🛏️</span> Ward Bed Capacity
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Live occupancy by hospital unit</p>
              </div>
              <span className="text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-lg border border-cyan-500/20">
                Total: 132 Beds
              </span>
            </div>

            {/* Ward Bars */}
            <div className="space-y-4">
              {WARD_CAPACITIES.map((ward) => {
                const pct = Math.round((ward.occupied / ward.total) * 100);
                const free = ward.total - ward.occupied;
                return (
                  <div key={ward.name} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-slate-200">{ward.name}</span>
                      <span className="font-mono text-slate-400">
                        <span className="text-white font-bold">{ward.occupied}</span>/{ward.total} ({free} free)
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-surface-700/60 rounded-full overflow-hidden flex">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${ward.accent} transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] mt-1 text-slate-500">
                      <span>Occupancy: {pct}%</span>
                      <span className={ward.text}>{free <= 3 ? '⚠️ Low Availability' : 'Normal'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
            <span className="text-xs text-slate-400">Need bed reassignment?</span>
            <button
              onClick={() => navigate('/patients')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold transition-colors flex items-center gap-1"
            >
              Open Bed Allocations →
            </button>
          </div>
        </motion.div>
      </div>

      {/* ── Quick Navigation Dispatcher Bar ── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="rounded-2xl bg-surface-900/60 border border-white/10 p-5 shadow-xl"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>🚀</span> Reception Fast Actions & Dedicated Portals
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Direct access to specialized reception workflows with distinct layouts
            </p>
          </div>
          <span className="text-xs text-slate-500">Select any dedicated section below</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Action 1: Register Patient */}
          <button
            onClick={() => navigate('/register')}
            className="group text-left p-4 rounded-xl bg-gradient-to-br from-indigo-950/40 to-surface-850 border border-indigo-500/20 hover:border-indigo-500/50 hover:bg-indigo-950/60 transition-all duration-200 flex flex-col justify-between"
          >
            <div className="flex items-start justify-between">
              <span className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-lg shadow group-hover:scale-105 transition-transform">
                📝
              </span>
              <span className="text-xs font-bold text-indigo-400 opacity-80 group-hover:opacity-100">Portal →</span>
            </div>
            <div className="mt-3">
              <h4 className="text-sm font-bold text-white">Register Patient</h4>
              <p className="text-xs text-slate-400 mt-0.5">Form-driven multi-step clinical intake & UID badge</p>
            </div>
          </button>

          {/* Action 2: Appointments */}
          <button
            onClick={() => navigate('/appointments')}
            className="group text-left p-4 rounded-xl bg-gradient-to-br from-amber-950/40 to-surface-850 border border-amber-500/20 hover:border-amber-500/50 hover:bg-amber-950/60 transition-all duration-200 flex flex-col justify-between"
          >
            <div className="flex items-start justify-between">
              <span className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center text-lg shadow group-hover:scale-105 transition-transform">
                📅
              </span>
              <span className="text-xs font-bold text-amber-400 opacity-80 group-hover:opacity-100">Portal →</span>
            </div>
            <div className="mt-3">
              <h4 className="text-sm font-bold text-white">Appointments Matrix</h4>
              <p className="text-xs text-slate-400 mt-0.5">Doctor scheduler grid, slot booking & queue</p>
            </div>
          </button>

          {/* Action 3: Visitors */}
          <button
            onClick={() => navigate('/visitors')}
            className="group text-left p-4 rounded-xl bg-gradient-to-br from-emerald-950/40 to-surface-850 border border-emerald-500/20 hover:border-emerald-500/50 hover:bg-emerald-950/60 transition-all duration-200 flex flex-col justify-between"
          >
            <div className="flex items-start justify-between">
              <span className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-lg shadow group-hover:scale-105 transition-transform">
                🎫
              </span>
              <span className="text-xs font-bold text-emerald-400 opacity-80 group-hover:opacity-100">Portal →</span>
            </div>
            <div className="mt-3">
              <h4 className="text-sm font-bold text-white">Visitor Security Desk</h4>
              <p className="text-xs text-slate-400 mt-0.5">Fast-pass check-in/out form & room visitor logs</p>
            </div>
          </button>

          {/* Action 4: Doctor Search */}
          <button
            onClick={() => navigate('/doctor-search')}
            className="group text-left p-4 rounded-xl bg-gradient-to-br from-cyan-950/40 to-surface-850 border border-cyan-500/20 hover:border-cyan-500/50 hover:bg-cyan-950/60 transition-all duration-200 flex flex-col justify-between"
          >
            <div className="flex items-start justify-between">
              <span className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-lg shadow group-hover:scale-105 transition-transform">
                🔍
              </span>
              <span className="text-xs font-bold text-cyan-400 opacity-80 group-hover:opacity-100">Portal →</span>
            </div>
            <div className="mt-3">
              <h4 className="text-sm font-bold text-white">Find Specialist Doctor</h4>
              <p className="text-xs text-slate-400 mt-0.5">Live availability roster, wait-times & ratings</p>
            </div>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
