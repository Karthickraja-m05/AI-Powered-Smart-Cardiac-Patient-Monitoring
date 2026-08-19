import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { dashboardAPI } from '../../services/api';
import type { HospitalAdminDashboardData } from '../../types';

export default function HospitalAdminDashboard() {
  const [data, setData] = useState<HospitalAdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardAPI.getHospitalAdminDashboard().then(res => { setData(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full" /></div>;

  const d = data;
  const kpis = [
    { label: 'Total Patients', value: d?.total_patients || 0, icon: '👥', color: 'from-teal-500 to-teal-700' },
    { label: "Today's Admissions", value: d?.todays_admissions || 0, icon: '📥', color: 'from-emerald-500 to-emerald-700' },
    { label: "Today's Discharges", value: d?.todays_discharges || 0, icon: '📤', color: 'from-green-500 to-green-700' },
    { label: 'Available Doctors', value: d?.available_doctors || 0, icon: '⚕️', color: 'from-blue-500 to-blue-700' },
    { label: 'Available Nurses', value: d?.available_nurses || 0, icon: '💉', color: 'from-cyan-500 to-cyan-700' },
    { label: 'Emergency Cases', value: d?.emergency_cases || 0, icon: '🚑', color: 'from-red-500 to-red-700' },
    { label: 'ICU Patients', value: d?.icu_patients || 0, icon: '🚨', color: 'from-rose-500 to-rose-700' },
    { label: 'Beds Available', value: (d?.total_beds || 100) - (d?.occupied_beds || 0), icon: '🛏️', color: 'from-amber-500 to-amber-700' },
  ];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white">Hospital Admin Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Hospital overview, admissions, discharges, and resource management</p>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-surface-800/50 backdrop-blur-sm border border-white/5 rounded-2xl p-4 hover:border-emerald-500/20 transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-3">
              <span className={`w-10 h-10 rounded-xl bg-gradient-to-br ${kpi.color} flex items-center justify-center text-lg shadow-lg`}>
                {kpi.icon}
              </span>
            </div>
            <p className="text-2xl font-bold text-white">{kpi.value}</p>
            <p className="text-xs text-slate-400 mt-1">{kpi.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Departments */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
        className="bg-surface-800/50 border border-white/5 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">🏢 Departments</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {(d?.departments || []).map((dept: any) => (
            <div key={dept.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-emerald-500/20 transition-all">
              <div>
                <p className="text-sm font-medium text-white">{dept.name}</p>
                <p className="text-xs text-slate-400">Floor: {dept.floor || 'N/A'}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-emerald-400">{dept.bed_count}</p>
                <p className="text-[10px] text-slate-500">beds</p>
              </div>
            </div>
          ))}
          {(!d?.departments || d.departments.length === 0) && (
            <p className="text-slate-500 text-sm col-span-full text-center py-4">No departments configured</p>
          )}
        </div>
      </motion.div>

      {/* Bed Allocation */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
        className="bg-surface-800/50 border border-white/5 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">🛏️ Bed Allocation</h3>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="h-4 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all"
                style={{ width: `${((d?.occupied_beds || 0) / (d?.total_beds || 100)) * 100}%` }} />
            </div>
            <div className="flex justify-between mt-2 text-xs text-slate-400">
              <span>Occupied: {d?.occupied_beds || 0}</span>
              <span>Total: {d?.total_beds || 100}</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
