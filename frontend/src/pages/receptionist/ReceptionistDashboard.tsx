import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { dashboardAPI } from '../../services/api';
import type { ReceptionistDashboardData } from '../../types';

export default function ReceptionistDashboard() {
  const [data, setData] = useState<ReceptionistDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardAPI.getReceptionistDashboard().then(res => { setData(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full" /></div>;

  const d = data;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white">Reception Dashboard</h1>
        <p className="text-purple-400 text-sm mt-1">Patient registration, appointments, and doctor availability</p>
      </motion.div>

      {/* Quick Actions */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Register Patient', icon: '📝', color: 'from-purple-500 to-purple-700' },
          { label: 'Book Appointment', icon: '📅', color: 'from-violet-500 to-violet-700' },
          { label: 'Find Doctor', icon: '🔍', color: 'from-indigo-500 to-indigo-700' },
          { label: 'Manage Visitors', icon: '🎫', color: 'from-fuchsia-500 to-fuchsia-700' },
        ].map((action, i) => (
          <button key={action.label}
            className={`p-4 rounded-2xl bg-gradient-to-br ${action.color} text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 text-center`}>
            <span className="text-2xl block mb-2">{action.icon}</span>
            <span className="text-sm font-semibold">{action.label}</span>
          </button>
        ))}
      </motion.div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: "Today's Admissions", value: d?.todays_admissions || 0, icon: '📥', color: 'from-purple-500 to-purple-700' },
          { label: "Today's Discharges", value: d?.todays_discharges || 0, icon: '📤', color: 'from-violet-500 to-violet-700' },
          { label: 'Pending Appointments', value: d?.pending_appointments || 0, icon: '📅', color: 'from-indigo-500 to-indigo-700' },
          { label: 'Available Beds', value: d?.available_beds || 0, icon: '🛏️', color: 'from-emerald-500 to-emerald-700' },
          { label: 'Available Doctors', value: d?.available_doctors || 0, icon: '⚕️', color: 'from-blue-500 to-blue-700' },
          { label: 'Waiting Patients', value: d?.waiting_patients || 0, icon: '⏳', color: 'from-amber-500 to-amber-700' },
        ].map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.05 }}
            className="bg-surface-800/50 border border-white/5 rounded-2xl p-4 hover:border-purple-500/20 transition-all"
          >
            <span className={`w-10 h-10 rounded-xl bg-gradient-to-br ${kpi.color} flex items-center justify-center text-lg shadow-lg mb-3`}>{kpi.icon}</span>
            <p className="text-2xl font-bold text-white">{kpi.value}</p>
            <p className="text-xs text-slate-400 mt-1">{kpi.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Recent Registrations */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
        className="bg-surface-800/50 border border-white/5 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">📋 Recent Registrations</h3>
        <div className="space-y-2">
          {(d?.recent_registrations || []).map((p: any) => (
            <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-purple-500/20 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold">
                  {p.name?.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{p.name}</p>
                  <p className="text-xs text-slate-400">{p.patient_uid}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-lg text-[10px] font-semibold uppercase ${
                p.status === 'admitted' ? 'bg-emerald-500/20 text-emerald-400' :
                p.status === 'icu' ? 'bg-red-500/20 text-red-400' :
                'bg-slate-500/20 text-slate-400'
              }`}>{p.status}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
