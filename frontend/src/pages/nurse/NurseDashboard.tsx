import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { dashboardAPI } from '../../services/api';
import type { NurseDashboardData } from '../../types';

export default function NurseDashboard() {
  const [data, setData] = useState<NurseDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardAPI.getNurseDashboard().then(res => { setData(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full" /></div>;

  const d = data;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white">Nurse Dashboard</h1>
        <p className="text-green-400 text-sm mt-1">
          {d?.shift_info ? `${d.shift_info.type.charAt(0).toUpperCase() + d.shift_info.type.slice(1)} Shift • ${d.shift_info.start || ''} - ${d.shift_info.end || ''}` : 'Shift info unavailable'}
        </p>
      </motion.div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Assigned Patients', value: d?.assigned_patients || 0, icon: '👥', color: 'from-green-500 to-green-700' },
          { label: 'Pending Medications', value: d?.pending_medications || 0, icon: '💊', color: 'from-emerald-500 to-emerald-700' },
          { label: 'Pending Injections', value: d?.pending_injections || 0, icon: '💉', color: 'from-teal-500 to-teal-700' },
          { label: 'Emergency Alerts', value: d?.emergency_alerts || 0, icon: '🚨', color: 'from-red-500 to-red-700' },
        ].map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-surface-800/50 border border-white/5 rounded-2xl p-4 hover:border-green-500/20 transition-all"
          >
            <span className={`w-10 h-10 rounded-xl bg-gradient-to-br ${kpi.color} flex items-center justify-center text-lg shadow-lg mb-3`}>{kpi.icon}</span>
            <p className="text-2xl font-bold text-white">{kpi.value}</p>
            <p className="text-xs text-slate-400 mt-1">{kpi.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Medication Schedule */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
        className="bg-surface-800/50 border border-white/5 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">💊 Today's Medication Schedule</h3>
        <div className="space-y-2">
          {(d?.medication_schedule || []).map((m: any) => (
            <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-green-500/20 transition-all">
              <div className="flex items-center gap-3">
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                  m.route === 'injection' ? 'bg-red-500/20 text-red-400' :
                  m.route === 'iv_fluid' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-green-500/20 text-green-400'
                }`}>{m.route === 'injection' ? '💉' : m.route === 'iv_fluid' ? '🩸' : '💊'}</span>
                <div>
                  <p className="text-sm font-medium text-white">{m.medicine_name} — {m.dose}</p>
                  <p className="text-xs text-slate-400">{m.frequency} • Patient #{m.patient_id}</p>
                </div>
              </div>
              <button className="px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 text-xs font-semibold hover:bg-green-500/30 transition-colors">
                Administer
              </button>
            </div>
          ))}
          {(!d?.medication_schedule || d.medication_schedule.length === 0) && (
            <p className="text-slate-500 text-sm text-center py-6">No pending medications</p>
          )}
        </div>
      </motion.div>

      {/* My Patients */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
        className="bg-surface-800/50 border border-white/5 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">👥 My Patients</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(d?.patients || []).map((p: any) => (
            <div key={p.id} className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-green-500/20 transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">{p.name}</p>
                  <p className="text-xs text-slate-400">{p.ward} • Room {p.room} • Bed {p.bed}</p>
                </div>
                <span className={`px-2 py-1 rounded-lg text-[10px] font-semibold uppercase ${
                  p.risk_level === 'critical' ? 'bg-red-500/20 text-red-400' :
                  p.risk_level === 'high' ? 'bg-orange-500/20 text-orange-400' :
                  'bg-emerald-500/20 text-emerald-400'
                }`}>{p.risk_level || 'N/A'}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
