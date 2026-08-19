import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { dashboardAPI } from '../../services/api';
import type { PatientDashboardData } from '../../types';

export default function PatientDashboard() {
  const [data, setData] = useState<PatientDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardAPI.getPatientDashboard().then(res => { setData(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full" /></div>;

  const d = data;
  const v = d?.current_vitals;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-slate-800">My Health Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Track your vitals, medications, and care team</p>
      </motion.div>

      {/* Emergency Button */}
      <motion.button
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold text-lg shadow-lg shadow-red-500/30 hover:shadow-red-500/40 transition-all"
      >
        🚨 Emergency Alert
      </motion.button>

      {/* Current Vitals */}
      {v && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">💓 Current Vitals</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Heart Rate', value: `${Math.round(v.heart_rate || 0)} bpm`, icon: '❤️', ok: (v.heart_rate || 0) >= 60 && (v.heart_rate || 0) <= 100 },
              { label: 'SpO₂', value: `${Math.round(v.spo2 || 0)}%`, icon: '🫁', ok: (v.spo2 || 0) >= 95 },
              { label: 'Temperature', value: `${v.temperature || 0}°C`, icon: '🌡️', ok: (v.temperature || 0) <= 37.5 },
              { label: 'Blood Pressure', value: `${v.bp_systolic || 0}/${v.bp_diastolic || 0}`, icon: '🩺', ok: (v.bp_systolic || 0) < 140 },
            ].map(vital => (
              <div key={vital.label} className={`p-4 rounded-xl border ${vital.ok ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{vital.icon}</span>
                  <span className="text-xs text-slate-500">{vital.label}</span>
                </div>
                <p className={`text-xl font-bold ${vital.ok ? 'text-emerald-700' : 'text-red-700'}`}>{vital.value}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Risk Level */}
      {d?.risk_level && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className={`rounded-2xl border p-4 flex items-center gap-4 ${
            d.risk_level === 'critical' ? 'bg-red-50 border-red-200' :
            d.risk_level === 'high' ? 'bg-orange-50 border-orange-200' :
            d.risk_level === 'medium' ? 'bg-amber-50 border-amber-200' :
            'bg-emerald-50 border-emerald-200'
          }`}>
          <span className="text-3xl">{d.risk_level === 'critical' ? '🔴' : d.risk_level === 'high' ? '🟠' : d.risk_level === 'medium' ? '🟡' : '🟢'}</span>
          <div>
            <p className="text-sm font-semibold text-slate-700">Risk Level: {d.risk_level.charAt(0).toUpperCase() + d.risk_level.slice(1)}</p>
            <p className="text-xs text-slate-500">Score: {d.risk_score?.toFixed(1)}%</p>
          </div>
        </motion.div>
      )}

      {/* Care Team */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {d?.assigned_doctor && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-500 mb-3">👨‍⚕️ Your Doctor</h3>
            <p className="text-lg font-bold text-slate-800">{d.assigned_doctor.name}</p>
            <p className="text-sm text-sky-600">{d.assigned_doctor.specialization}</p>
            {d.assigned_doctor.phone && <p className="text-xs text-slate-400 mt-1">{d.assigned_doctor.phone}</p>}
          </motion.div>
        )}
        {d?.assigned_nurse && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-500 mb-3">👩‍⚕️ Your Nurse</h3>
            <p className="text-lg font-bold text-slate-800">{d.assigned_nurse.name}</p>
          </motion.div>
        )}
      </div>

      {/* Medications */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
        className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">💊 Active Medications</h3>
        <div className="space-y-3">
          {(d?.medications || []).map((m: any) => (
            <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div>
                <p className="text-sm font-medium text-slate-800">{m.medicine_name} — {m.dose}</p>
                <p className="text-xs text-slate-500">{m.frequency}</p>
              </div>
              <span className="text-lg">💊</span>
            </div>
          ))}
          {(!d?.medications || d.medications.length === 0) && (
            <p className="text-slate-400 text-sm text-center py-4">No active medications</p>
          )}
        </div>
      </motion.div>

      {/* Health Tips */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
        className="bg-gradient-to-br from-sky-50 to-blue-50 rounded-2xl border border-sky-200 p-6">
        <h3 className="text-lg font-semibold text-sky-800 mb-3">📚 Health Tips</h3>
        <ul className="space-y-2 text-sm text-sky-700">
          <li className="flex items-start gap-2"><span>💧</span> Stay hydrated — drink at least 8 glasses of water daily</li>
          <li className="flex items-start gap-2"><span>🚶</span> Light walking can improve heart health</li>
          <li className="flex items-start gap-2"><span>😴</span> Get 7-8 hours of quality sleep</li>
          <li className="flex items-start gap-2"><span>🧘</span> Practice deep breathing for stress management</li>
        </ul>
      </motion.div>
    </div>
  );
}
