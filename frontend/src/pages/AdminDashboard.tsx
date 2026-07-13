import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart,
} from 'recharts';
import { dashboardAPI } from '../services/api';
import type { DashboardStats, DashboardCharts, Alert } from '../types';

const RISK_COLORS = {
  Low: '#10b981',
  Medium: '#f59e0b',
  High: '#f97316',
  Critical: '#ef4444',
};

const statCardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.05, duration: 0.4, ease: 'easeOut' },
  }),
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [charts, setCharts] = useState<DashboardCharts | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      const [statsRes, chartsRes, alertsRes] = await Promise.all([
        dashboardAPI.getStats(),
        dashboardAPI.getCharts(),
        dashboardAPI.getAlerts(10),
      ]);
      setStats(statsRes.data);
      setCharts(chartsRes.data);
      setAlerts(alertsRes.data);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Loading hospital data...</p>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    { label: 'Total Patients', value: stats.total_patients, icon: '👥', color: 'from-blue-500/20 to-blue-600/5', border: 'border-blue-500/20' },
    { label: 'Doctors', value: stats.total_doctors, icon: '🩺', color: 'from-emerald-500/20 to-emerald-600/5', border: 'border-emerald-500/20' },
    { label: 'Nurses', value: stats.total_nurses, icon: '👩‍⚕️', color: 'from-violet-500/20 to-violet-600/5', border: 'border-violet-500/20' },
    { label: "Today's Admissions", value: stats.todays_admissions, icon: '📋', color: 'from-cyan-500/20 to-cyan-600/5', border: 'border-cyan-500/20' },
    { label: 'ICU Patients', value: stats.icu_patients, icon: '🏥', color: 'from-red-500/20 to-red-600/5', border: 'border-red-500/20' },
    { label: 'Critical Risk', value: stats.critical_patients, icon: '🔴', color: 'from-red-500/20 to-red-600/5', border: 'border-red-500/20' },
    { label: 'High Risk', value: stats.high_risk_patients, icon: '🟠', color: 'from-orange-500/20 to-orange-600/5', border: 'border-orange-500/20' },
    { label: 'Medium Risk', value: stats.medium_risk_patients, icon: '🟡', color: 'from-amber-500/20 to-amber-600/5', border: 'border-amber-500/20' },
    { label: 'Low Risk', value: stats.low_risk_patients, icon: '🟢', color: 'from-emerald-500/20 to-emerald-600/5', border: 'border-emerald-500/20' },
    { label: 'Chest Pain', value: stats.patients_with_chest_pain, icon: '💔', color: 'from-rose-500/20 to-rose-600/5', border: 'border-rose-500/20' },
    { label: 'Breathing Issues', value: stats.patients_with_breathing_problems, icon: '🫁', color: 'from-sky-500/20 to-sky-600/5', border: 'border-sky-500/20' },
    { label: 'Emergencies Today', value: stats.emergency_cases_today, icon: '🚨', color: 'from-red-500/20 to-red-600/5', border: 'border-red-500/20' },
    { label: 'Missed Medications', value: stats.patients_missing_medication, icon: '💊', color: 'from-amber-500/20 to-amber-600/5', border: 'border-amber-500/20' },
    { label: 'Discharged', value: stats.discharged_patients, icon: '✅', color: 'from-green-500/20 to-green-600/5', border: 'border-green-500/20' },
    { label: 'Bed Occupancy', value: `${stats.bed_occupancy_percentage}%`, icon: '🛏️', color: 'from-indigo-500/20 to-indigo-600/5', border: 'border-indigo-500/20' },
    { label: 'Fever Patients', value: stats.patients_with_fever, icon: '🌡️', color: 'from-orange-500/20 to-orange-600/5', border: 'border-orange-500/20' },
  ];

  const riskPieData = charts?.risk_distribution?.map((d) => ({
    name: d.label,
    value: d.value,
  })) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Hospital Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">Real-time overview of hospital operations & patient monitoring</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="vital-badge-green">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            System Online
          </div>
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-8 gap-3">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            custom={i}
            initial="hidden"
            animate="visible"
            variants={statCardVariants}
            className={`stat-card border ${card.border} group cursor-default`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${card.color} rounded-2xl opacity-50`} />
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{card.icon}</span>
              </div>
              <p className="text-2xl font-bold text-white">{card.value}</p>
              <p className="text-[11px] text-slate-400 mt-1 leading-tight">{card.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* Admissions Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-5 lg:col-span-1 xl:col-span-2"
        >
          <h3 className="section-title">📈 Admissions Trend (7 Days)</h3>
          <div className="h-56">
            <ResponsiveContainer>
              <AreaChart data={charts?.admissions_trend || []}>
                <defs>
                  <linearGradient id="admGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(17,24,39,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  labelStyle={{ color: '#f1f5f9' }}
                  itemStyle={{ color: '#06b6d4' }}
                />
                <Area type="monotone" dataKey="value" stroke="#06b6d4" strokeWidth={2.5} fill="url(#admGrad)" name="Admissions" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Risk Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-5"
        >
          <h3 className="section-title">🎯 Risk Distribution</h3>
          <div className="h-56">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={riskPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {riskPieData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={RISK_COLORS[entry.name as keyof typeof RISK_COLORS] || '#64748b'}
                      stroke="transparent"
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(17,24,39,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                />
                <Legend
                  formatter={(value) => <span className="text-xs text-slate-400">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Emergency Alerts + Hourly Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Hourly Emergencies */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card p-5"
        >
          <h3 className="section-title">🚨 Hourly Emergency Alerts (24h)</h3>
          <div className="h-48">
            <ResponsiveContainer>
              <BarChart data={charts?.hourly_emergencies?.slice(-12) || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(17,24,39,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                />
                <Bar dataKey="value" fill="#ef4444" radius={[4, 4, 0, 0]} name="Emergencies" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Active Alerts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass-card p-5"
        >
          <h3 className="section-title">⚡ Active Alerts</h3>
          <div className="space-y-2 max-h-52 overflow-y-auto">
            {alerts.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No active alerts ✅</p>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border ${
                    alert.severity === 'emergency' ? 'bg-red-500/10 border-red-500/20' :
                    alert.severity === 'critical' ? 'bg-orange-500/10 border-orange-500/20' :
                    'bg-amber-500/10 border-amber-500/20'
                  }`}
                >
                  <span className="text-lg">
                    {alert.severity === 'emergency' ? '🚨' : alert.severity === 'critical' ? '⚠️' : '⚡'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{alert.title}</p>
                    <p className="text-xs text-slate-400 line-clamp-2">{alert.message}</p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {new Date(alert.triggered_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
