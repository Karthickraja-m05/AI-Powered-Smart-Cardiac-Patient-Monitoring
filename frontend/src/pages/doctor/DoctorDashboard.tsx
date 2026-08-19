import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { dashboardAPI, doctorAvailabilityAPI } from '../../services/api';
import type { DoctorDashboardData } from '../../types';

const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
  available: { label: 'Available', color: 'bg-emerald-500', icon: '🟢' },
  busy: { label: "I'm Busy", color: 'bg-amber-500', icon: '🟡' },
  in_surgery: { label: 'In Surgery', color: 'bg-red-500', icon: '🔴' },
  emergency: { label: 'Emergency Duty', color: 'bg-red-600', icon: '🚨' },
  meeting: { label: 'In Meeting', color: 'bg-blue-500', icon: '🔵' },
  off_duty: { label: 'Off Duty', color: 'bg-slate-500', icon: '⚪' },
  vacation: { label: 'Vacation', color: 'bg-purple-500', icon: '🟣' },
};

export default function DoctorDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [data, setData] = useState<DoctorDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('available');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    dashboardAPI.getDoctorDashboard().then(res => {
      setData(res.data);
      setStatus(res.data.availability_status);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const updateStatus = async (newStatus: string) => {
    if (!user) return;
    setUpdatingStatus(true);
    try {
      await doctorAvailabilityAPI.update(user.id, { status: newStatus });
      setStatus(newStatus);
    } catch (e) { console.error(e); }
    setUpdatingStatus(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full" /></div>;

  const d = data;

  return (
    <div className="space-y-6">
      {/* Header with Status */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Dr. {user?.full_name?.split(' ').slice(1).join(' ') || user?.full_name}</h1>
          <p className="text-blue-400 text-sm mt-1">{user?.specialization} • {user?.department}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${statusConfig[status]?.color || 'bg-emerald-500'} animate-pulse`} />
          <span className="text-sm text-slate-300">{statusConfig[status]?.label || 'Available'}</span>
        </div>
      </motion.div>

      {/* Status Buttons */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-surface-800/50 border border-white/5 rounded-2xl p-4">
        <p className="text-xs text-slate-400 mb-3 uppercase tracking-wider font-semibold">Quick Status</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(statusConfig).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => updateStatus(key)}
              disabled={updatingStatus}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                status === key
                  ? `${cfg.color} text-white shadow-lg scale-105`
                  : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/5'
              }`}
            >
              <span>{cfg.icon}</span>
              <span>{cfg.label}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Today's Appointments", value: d?.todays_appointments || 0, icon: '📅', color: 'from-blue-500 to-blue-700' },
          { label: 'Current Patients', value: d?.current_patients || 0, icon: '👥', color: 'from-sky-500 to-sky-700' },
          { label: 'Critical Alerts', value: d?.critical_alerts || 0, icon: '🚨', color: 'from-red-500 to-red-700' },
          { label: 'Patient Queue', value: d?.queue_length || 0, icon: '📋', color: 'from-indigo-500 to-indigo-700' },
        ].map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.05 }}
            className="bg-surface-800/50 border border-white/5 rounded-2xl p-4 hover:border-blue-500/20 transition-all"
          >
            <span className={`w-10 h-10 rounded-xl bg-gradient-to-br ${kpi.color} flex items-center justify-center text-lg shadow-lg mb-3`}>
              {kpi.icon}
            </span>
            <p className="text-2xl font-bold text-white">{kpi.value}</p>
            <p className="text-xs text-slate-400 mt-1">{kpi.label}</p>
          </motion.div>
        ))}
      </div>

      {/* My Patients List */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
        className="bg-surface-800/50 border border-white/5 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">👥 My Patients</h3>
        <div className="space-y-2">
          {(d?.patients || []).map((p: any) => (
            <div
              key={p.id}
              onClick={() => navigate(`/patients/${p.id}`)}
              className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-blue-500/20 cursor-pointer transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-sky-500 flex items-center justify-center text-white text-sm font-bold">
                  {p.name?.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <p className="text-sm font-medium text-white group-hover:text-blue-300 transition-colors">{p.name}</p>
                  <p className="text-xs text-slate-400">{p.patient_uid} • {p.ward} • {p.room}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-1 rounded-lg text-[10px] font-semibold uppercase ${
                  p.risk_level === 'critical' ? 'bg-red-500/20 text-red-400' :
                  p.risk_level === 'high' ? 'bg-orange-500/20 text-orange-400' :
                  p.risk_level === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-emerald-500/20 text-emerald-400'
                }`}>{p.risk_level || 'N/A'}</span>
                <span className="text-slate-500 group-hover:text-blue-400 transition-colors">→</span>
              </div>
            </div>
          ))}
          {(!d?.patients || d.patients.length === 0) && (
            <p className="text-slate-500 text-sm text-center py-6">No patients assigned</p>
          )}
        </div>
      </motion.div>

      {/* Recent Alerts */}
      {(d?.recent_alerts?.length || 0) > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="bg-surface-800/50 border border-red-500/20 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-red-300 mb-4">🔔 Active Alerts</h3>
          <div className="space-y-2">
            {(d?.recent_alerts || []).slice(0, 5).map((a: any) => (
              <div key={a.id} className={`p-3 rounded-xl border ${
                a.severity === 'emergency' ? 'bg-red-500/10 border-red-500/30' :
                a.severity === 'critical' ? 'bg-orange-500/10 border-orange-500/30' :
                'bg-amber-500/10 border-amber-500/30'
              }`}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-white">{a.title}</p>
                  <span className={`text-[10px] uppercase font-bold ${
                    a.severity === 'emergency' ? 'text-red-400' : a.severity === 'critical' ? 'text-orange-400' : 'text-amber-400'
                  }`}>{a.severity}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{a.message}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
