import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { patientsAPI, vitalsAPI } from '../services/api';
import type { Patient, VitalSign } from '../types';

interface MonitoredPatient {
  patient: Patient;
  latestVitals: VitalSign | null;
}

export default function LiveMonitoring() {
  const [patients, setPatients] = useState<MonitoredPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    loadMonitoredPatients();
    intervalRef.current = setInterval(loadMonitoredPatients, 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  async function loadMonitoredPatients() {
    try {
      const { data } = await patientsAPI.list({ per_page: 50, status: undefined });
      const monitored = await Promise.all(
        data.patients
          .filter((p) => p.status !== 'discharged')
          .map(async (patient) => {
            try {
              const vRes = await vitalsAPI.getLatest(patient.id);
              return { patient, latestVitals: vRes.data };
            } catch {
              return { patient, latestVitals: null };
            }
          })
      );
      setPatients(monitored);
    } catch (err) {
      console.error('Failed to load monitoring data', err);
    } finally {
      setLoading(false);
    }
  }

  const vitalStatus = (hr?: number, spo2?: number) => {
    if (!hr && !spo2) return 'unknown';
    if ((hr && (hr > 150 || hr < 40)) || (spo2 && spo2 < 85)) return 'critical';
    if ((hr && (hr > 120 || hr < 50)) || (spo2 && spo2 < 90)) return 'warning';
    return 'normal';
  };

  const statusColors = {
    critical: 'border-red-500/40 bg-red-500/5',
    warning: 'border-amber-500/30 bg-amber-500/5',
    normal: 'border-emerald-500/15 bg-emerald-500/5',
    unknown: 'border-white/5 bg-white/[0.02]',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Loading monitoring stations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">💓 Live Patient Monitoring</h1>
          <p className="text-sm text-slate-400">
            Monitoring {patients.length} patient{patients.length !== 1 ? 's' : ''} • Auto-refreshes every 5s
          </p>
        </div>
        <div className="vital-badge-green">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </div>
      </div>

      {/* Patient Monitor Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {patients.map((mp, i) => {
          const { patient, latestVitals: v } = mp;
          const status = vitalStatus(v?.heart_rate ?? undefined, v?.spo2 ?? undefined);
          const sc = statusColors[status];

          return (
            <motion.div
              key={patient.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => navigate(`/patients/${patient.id}`)}
              className={`glass-card border-2 ${sc} p-4 cursor-pointer hover:scale-[1.01] transition-transform duration-200`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-emerald-500 flex items-center justify-center text-white text-[10px] font-bold">
                    {patient.first_name[0]}{patient.last_name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{patient.first_name} {patient.last_name}</p>
                    <p className="text-[10px] text-slate-500">
                      {patient.ward || '—'} / Bed {patient.bed_number || '—'}
                    </p>
                  </div>
                </div>
                {status === 'critical' && (
                  <span className="vital-badge-red animate-pulse">🚨 CRITICAL</span>
                )}
                {status === 'warning' && (
                  <span className="vital-badge-yellow">⚠️ ALERT</span>
                )}
                {status === 'normal' && (
                  <span className="w-3 h-3 rounded-full bg-emerald-400" />
                )}
              </div>

              {/* Vital Signs Grid */}
              {v ? (
                <div className="grid grid-cols-3 gap-2">
                  <VitalItem icon="💓" label="HR" value={v.heart_rate ? `${Math.round(v.heart_rate)}` : '—'} unit="bpm"
                    alert={v.heart_rate != null && (v.heart_rate > 120 || v.heart_rate < 50)} />
                  <VitalItem icon="🫁" label="SpO₂" value={v.spo2 ? `${v.spo2.toFixed(0)}` : '—'} unit="%"
                    alert={v.spo2 != null && v.spo2 < 92} />
                  <VitalItem icon="🌡️" label="Temp" value={v.temperature ? `${v.temperature}` : '—'} unit="°C"
                    alert={v.temperature != null && v.temperature > 38} />
                  <VitalItem icon="🩺" label="BP" value={v.bp_systolic ? `${v.bp_systolic}/${v.bp_diastolic}` : '—'} unit=""
                    alert={v.bp_systolic != null && (v.bp_systolic > 160 || v.bp_systolic < 90)} />
                  <VitalItem icon="🌬️" label="Resp" value={v.respiratory_rate ? `${v.respiratory_rate.toFixed(0)}` : '—'} unit="/min"
                    alert={v.respiratory_rate != null && (v.respiratory_rate > 25 || v.respiratory_rate < 10)} />
                  <VitalItem icon="😣" label="Pain" value={v.pain_level != null ? `${v.pain_level}` : '—'} unit="/10"
                    alert={v.pain_level != null && v.pain_level > 6} />
                </div>
              ) : (
                <p className="text-xs text-slate-500 text-center py-4">No vital data available</p>
              )}

              {/* Risk Score */}
              {patient.current_risk_score != null && (
                <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">AI Risk Score</span>
                  <span className={`text-sm font-bold ${
                    (patient.current_risk_score ?? 0) >= 75 ? 'text-red-400' :
                    (patient.current_risk_score ?? 0) >= 50 ? 'text-orange-400' :
                    (patient.current_risk_score ?? 0) >= 25 ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {patient.current_risk_score}%
                  </span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {patients.length === 0 && (
        <div className="text-center py-20 text-slate-500">
          <p className="text-4xl mb-4">📡</p>
          <p className="text-lg">No patients being monitored</p>
          <p className="text-sm mt-1">Add patients and record vitals to see them here</p>
        </div>
      )}
    </div>
  );
}

function VitalItem({ icon, label, value, unit, alert }: {
  icon: string; label: string; value: string; unit: string; alert: boolean;
}) {
  return (
    <div className={`p-2 rounded-lg text-center ${alert ? 'bg-red-500/10' : 'bg-white/[0.02]'}`}>
      <p className="text-xs text-slate-500 mb-0.5">{icon} {label}</p>
      <p className={`text-base font-bold ${alert ? 'text-red-400' : 'text-white'}`}>
        {value}
        <span className="text-[10px] text-slate-500 font-normal"> {unit}</span>
      </p>
    </div>
  );
}
