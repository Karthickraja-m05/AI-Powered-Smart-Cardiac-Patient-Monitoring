import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { dashboardAPI } from '../../services/api';
import type { DashboardStats, DashboardCharts } from '../../types';

const fadeIn = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardAPI.getStats().then(res => { setStats(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full" /></div>;

  const s = stats;
  const kpis = [
    { label: 'Total Patients', value: s?.total_patients || 0, icon: '👥', color: 'from-blue-500 to-blue-700' },
    { label: 'Doctors', value: s?.total_doctors || 0, icon: '⚕️', color: 'from-emerald-500 to-emerald-700' },
    { label: 'Nurses', value: s?.total_nurses || 0, icon: '💉', color: 'from-green-500 to-green-700' },
    { label: "Today's Admissions", value: s?.todays_admissions || 0, icon: '🏥', color: 'from-violet-500 to-violet-700' },
    { label: 'ICU Patients', value: s?.icu_patients || 0, icon: '🚨', color: 'from-red-500 to-red-700' },
    { label: 'Critical Risk', value: s?.critical_patients || 0, icon: '⚠️', color: 'from-rose-500 to-rose-700' },
    { label: 'Bed Occupancy', value: `${s?.bed_occupancy_percentage || 0}%`, icon: '🛏️', color: 'from-amber-500 to-amber-700' },
    { label: 'Emergencies Today', value: s?.emergency_cases_today || 0, icon: '🚑', color: 'from-orange-500 to-orange-700' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div {...fadeIn} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Super Admin Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Hospital Intelligence Platform — Executive Overview</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-emerald-400 text-sm font-medium">System Online</span>
        </div>
      </motion.div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-surface-800/50 backdrop-blur-sm border border-white/5 rounded-2xl p-4 hover:border-white/10 transition-all duration-300 group"
          >
            <div className="flex items-center justify-between mb-3">
              <span className={`w-10 h-10 rounded-xl bg-gradient-to-br ${kpi.color} flex items-center justify-center text-lg shadow-lg group-hover:scale-110 transition-transform`}>
                {kpi.icon}
              </span>
            </div>
            <p className="text-2xl font-bold text-white">{kpi.value}</p>
            <p className="text-xs text-slate-400 mt-1">{kpi.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Risk Distribution & Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Risk Summary */}
        <motion.div {...fadeIn} transition={{ delay: 0.3 }} className="lg:col-span-2 bg-surface-800/50 backdrop-blur-sm border border-white/5 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Risk Distribution</h3>
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Low Risk', value: s?.low_risk_patients || 0, color: 'bg-emerald-500', textColor: 'text-emerald-400' },
              { label: 'Medium Risk', value: s?.medium_risk_patients || 0, color: 'bg-amber-500', textColor: 'text-amber-400' },
              { label: 'High Risk', value: s?.high_risk_patients || 0, color: 'bg-orange-500', textColor: 'text-orange-400' },
              { label: 'Critical', value: s?.critical_patients || 0, color: 'bg-red-500', textColor: 'text-red-400' },
            ].map(r => (
              <div key={r.label} className="text-center p-4 rounded-xl bg-white/5">
                <div className={`w-3 h-3 rounded-full ${r.color} mx-auto mb-2`} />
                <p className={`text-2xl font-bold ${r.textColor}`}>{r.value}</p>
                <p className="text-xs text-slate-400 mt-1">{r.label}</p>
              </div>
            ))}
          </div>
          {/* Progress bar */}
          <div className="mt-4 h-3 rounded-full bg-white/5 overflow-hidden flex">
            {(() => {
              const total = (s?.low_risk_patients || 0) + (s?.medium_risk_patients || 0) + (s?.high_risk_patients || 0) + (s?.critical_patients || 0) || 1;
              return <>
                <div className="bg-emerald-500 transition-all" style={{ width: `${((s?.low_risk_patients || 0) / total) * 100}%` }} />
                <div className="bg-amber-500 transition-all" style={{ width: `${((s?.medium_risk_patients || 0) / total) * 100}%` }} />
                <div className="bg-orange-500 transition-all" style={{ width: `${((s?.high_risk_patients || 0) / total) * 100}%` }} />
                <div className="bg-red-500 transition-all" style={{ width: `${((s?.critical_patients || 0) / total) * 100}%` }} />
              </>;
            })()}
          </div>
        </motion.div>

        {/* Carbon Savings Card */}
        <motion.div {...fadeIn} transition={{ delay: 0.4 }} className="bg-gradient-to-br from-emerald-900/50 to-green-900/30 border border-emerald-500/20 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-emerald-300 mb-2">🌱 Sustainability</h3>
          <p className="text-3xl font-bold text-white mt-4">1,250 kg</p>
          <p className="text-sm text-emerald-400 mt-1">Carbon Savings This Month</p>
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-300">Solar Panels</span>
              <span className="text-emerald-400">Active ✓</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-300">Green Rating</span>
              <span className="text-emerald-400 font-bold">A</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-300">IoT Devices</span>
              <span className="text-emerald-400">12 Active</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bed Occupancy & Clinical Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div {...fadeIn} transition={{ delay: 0.5 }} className="bg-surface-800/50 border border-white/5 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">🛏️ Bed Occupancy</h3>
          <div className="flex items-center gap-6">
            <div className="relative w-24 h-24">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none" stroke="#f59e0b" strokeWidth="3"
                  strokeDasharray={`${s?.bed_occupancy_percentage || 0}, 100`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold text-white">{s?.bed_occupancy_percentage || 0}%</span>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-slate-300"><span className="text-white font-semibold">{s?.occupied_beds || 0}</span> / {s?.total_beds || 100} beds occupied</p>
              <p className="text-sm text-slate-300">ICU: <span className="text-red-400 font-semibold">{s?.icu_patients || 0}</span></p>
              <p className="text-sm text-slate-300">Available: <span className="text-emerald-400 font-semibold">{(s?.total_beds || 100) - (s?.occupied_beds || 0)}</span></p>
            </div>
          </div>
        </motion.div>

        <motion.div {...fadeIn} transition={{ delay: 0.6 }} className="bg-surface-800/50 border border-white/5 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">🔔 Clinical Indicators</h3>
          <div className="space-y-3">
            {[
              { label: 'Chest Pain Cases', value: s?.patients_with_chest_pain || 0, icon: '💔', color: 'text-red-400' },
              { label: 'Breathing Problems', value: s?.patients_with_breathing_problems || 0, icon: '🫁', color: 'text-orange-400' },
              { label: 'Fever Cases', value: s?.patients_with_fever || 0, icon: '🌡️', color: 'text-amber-400' },
              { label: 'Missed Medications', value: s?.patients_missing_medication || 0, icon: '💊', color: 'text-rose-400' },
              { label: 'Discharged Today', value: s?.discharged_patients || 0, icon: '✅', color: 'text-emerald-400' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-2">
                  <span>{item.icon}</span>
                  <span className="text-sm text-slate-300">{item.label}</span>
                </div>
                <span className={`text-lg font-bold ${item.color}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
