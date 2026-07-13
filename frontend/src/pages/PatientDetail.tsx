import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts';
import { patientsAPI, vitalsAPI, predictionsAPI, medicationsAPI, symptomsAPI } from '../services/api';
import type { Patient, VitalSign, Prediction, Medication } from '../types';

const TABS = ['Overview', 'Vitals', 'AI Predictions', 'Medications', 'Symptoms'];

export default function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState('Overview');
  const [patient, setPatient] = useState<Patient | null>(null);
  const [vitals, setVitals] = useState<VitalSign[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadAll(+id);
  }, [id]);

  async function loadAll(patientId: number) {
    setLoading(true);
    try {
      const [pRes, vRes, prRes, mRes] = await Promise.all([
        patientsAPI.get(patientId),
        vitalsAPI.getHistory(patientId, 72),
        predictionsAPI.getHistory(patientId),
        medicationsAPI.getForPatient(patientId),
      ]);
      setPatient(pRes.data);
      setVitals(vRes.data.reverse());
      setPredictions(prRes.data);
      setMedications(mRes.data);
    } catch {
      toast.error('Failed to load patient');
      navigate('/patients');
    } finally {
      setLoading(false);
    }
  }

  if (loading || !patient) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-10 h-10 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  const latestVital = vitals[vitals.length - 1];
  const latestPrediction = predictions[0];

  const riskColor = {
    critical: 'text-red-400', high: 'text-orange-400',
    medium: 'text-amber-400', low: 'text-emerald-400',
  }[patient.current_risk_level || 'low'] || 'text-slate-400';

  // Chart data
  const vitalChartData = vitals.map((v) => ({
    time: new Date(v.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    hr: v.heart_rate, spo2: v.spo2, temp: v.temperature,
    sys: v.bp_systolic, dia: v.bp_diastolic, resp: v.respiratory_rate,
  }));

  const predChartData = [...predictions].reverse().map((p) => ({
    time: new Date(p.predicted_at).toLocaleDateString([], { month: 'short', day: 'numeric' }),
    risk: p.risk_percentage,
  }));

  return (
    <div className="space-y-5">
      {/* Back Button + Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => navigate('/patients')} className="btn-icon mt-1">←</button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-emerald-500 flex items-center justify-center text-white text-lg font-bold">
              {patient.first_name[0]}{patient.last_name[0]}
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-white">
                {patient.first_name} {patient.last_name}
              </h1>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                <span className="font-mono">{patient.patient_uid}</span>
                <span>•</span>
                <span>{patient.age} yrs / {patient.gender}</span>
                {patient.blood_group && <><span>•</span><span>{patient.blood_group}</span></>}
                {patient.ward && <><span>•</span><span>Ward: {patient.ward}</span></>}
                {patient.bed_number && <><span>•</span><span>Bed: {patient.bed_number}</span></>}
              </div>
            </div>
          </div>
        </div>
        <div className={`text-right ${riskColor}`}>
          <p className="text-3xl font-bold">{patient.current_risk_score ?? '—'}%</p>
          <p className="text-xs uppercase tracking-wider">{patient.current_risk_level || 'N/A'} Risk</p>
        </div>
      </div>

      {/* Quick Vitals Bar */}
      {latestVital && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Heart Rate', value: latestVital.heart_rate ? `${Math.round(latestVital.heart_rate)} bpm` : '—', icon: '💓', ok: latestVital.heart_rate && latestVital.heart_rate >= 60 && latestVital.heart_rate <= 100 },
            { label: 'SpO₂', value: latestVital.spo2 ? `${latestVital.spo2.toFixed(1)}%` : '—', icon: '🫁', ok: latestVital.spo2 && latestVital.spo2 >= 95 },
            { label: 'Temperature', value: latestVital.temperature ? `${latestVital.temperature}°C` : '—', icon: '🌡️', ok: latestVital.temperature && latestVital.temperature < 37.5 },
            { label: 'Blood Pressure', value: latestVital.bp_systolic ? `${latestVital.bp_systolic}/${latestVital.bp_diastolic}` : '—', icon: '🩺', ok: latestVital.bp_systolic && latestVital.bp_systolic < 140 },
            { label: 'Resp. Rate', value: latestVital.respiratory_rate ? `${latestVital.respiratory_rate.toFixed(0)}/min` : '—', icon: '🌬️', ok: latestVital.respiratory_rate && latestVital.respiratory_rate >= 12 && latestVital.respiratory_rate <= 20 },
            { label: 'Pain Level', value: latestVital.pain_level != null ? `${latestVital.pain_level}/10` : '—', icon: '😣', ok: latestVital.pain_level != null && latestVital.pain_level <= 3 },
          ].map((v, i) => (
            <motion.div
              key={v.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`stat-card border ${v.ok ? 'border-emerald-500/10' : 'border-red-500/15'}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-lg">{v.icon}</span>
                <span className={`w-2 h-2 rounded-full ${v.ok ? 'bg-emerald-400' : 'bg-red-400 animate-pulse'}`} />
              </div>
              <p className="text-xl font-bold text-white">{v.value}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{v.label}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-surface-800/50 rounded-xl border border-white/5 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all
              ${tab === t ? 'bg-brand-500/15 text-brand-400 border border-brand-500/20' : 'text-slate-400 hover:text-slate-200'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'Overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Patient Info */}
          <div className="glass-card p-5 space-y-4">
            <h3 className="section-title">📋 Patient Information</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Phone', patient.phone],
                ['Email', patient.email],
                ['Status', patient.status?.toUpperCase()],
                ['Emergency Contact', patient.emergency_contact_name],
                ['Admission', patient.admission_date ? new Date(patient.admission_date).toLocaleDateString() : '—'],
                ['Reason', patient.admission_reason],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="text-slate-200 truncate">{(value as string) || '—'}</p>
                </div>
              ))}
            </div>
            {/* Risk Factors */}
            <div>
              <p className="text-xs text-slate-500 mb-2">Risk Factors</p>
              <div className="flex flex-wrap gap-2">
                {patient.has_hypertension && <span className="vital-badge-red">Hypertension</span>}
                {patient.has_diabetes && <span className="vital-badge-yellow">Diabetes</span>}
                {patient.has_previous_heart_disease && <span className="vital-badge-red">Previous Heart Disease</span>}
                {patient.has_kidney_disease && <span className="vital-badge-yellow">Kidney Disease</span>}
                {patient.is_smoker && <span className="vital-badge-yellow">Smoker</span>}
                {patient.alcohol_use && <span className="vital-badge-yellow">Alcohol Use</span>}
                {patient.allergies && <span className="vital-badge-blue">Allergies: {patient.allergies}</span>}
              </div>
            </div>
          </div>

          {/* AI Risk Card */}
          <div className="glass-card p-5">
            <h3 className="section-title">🤖 AI Risk Assessment</h3>
            {latestPrediction ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className={`text-5xl font-bold ${riskColor}`}>
                    {latestPrediction.risk_percentage}%
                  </div>
                  <div>
                    <p className={`text-lg font-semibold ${riskColor} uppercase`}>{latestPrediction.risk_level}</p>
                    <p className="text-xs text-slate-500">Confidence: {latestPrediction.confidence}%</p>
                    <p className="text-xs text-slate-500">Model: {latestPrediction.model_name}</p>
                  </div>
                </div>
                {/* Top risk factors */}
                {latestPrediction.top_risk_factors && (
                  <div>
                    <p className="text-xs text-slate-500 mb-2">Top Risk Factors</p>
                    <div className="space-y-1.5">
                      {latestPrediction.top_risk_factors.map((f, i) => (
                        <div key={f} className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">{i + 1}.</span>
                          <span className="text-sm text-slate-300">{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Feature importances bar chart */}
                {latestPrediction.shap_values && (
                  <div className="h-48">
                    <ResponsiveContainer>
                      <BarChart
                        data={Object.entries(latestPrediction.shap_values)
                          .sort((a, b) => (b[1] as number) - (a[1] as number))
                          .slice(0, 8)
                          .map(([k, v]) => ({ name: k, importance: +(v as number).toFixed(3) }))}
                        layout="vertical"
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis type="number" stroke="#64748b" fontSize={10} />
                        <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={10} width={80} />
                        <Tooltip contentStyle={{ backgroundColor: 'rgba(17,24,39,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                        <Bar dataKey="importance" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <p className="disclaimer-bar text-[10px]">
                  <span>⚕️</span>
                  <span>AI-assisted risk assessment only. Does not constitute a diagnosis. Must be reviewed by clinicians.</span>
                </p>
              </div>
            ) : (
              <p className="text-slate-500 text-sm py-4 text-center">No predictions yet</p>
            )}
          </div>
        </div>
      )}

      {tab === 'Vitals' && (
        <div className="space-y-4">
          {/* Heart Rate & SpO2 */}
          <div className="glass-card p-5">
            <h3 className="section-title">💓 Heart Rate & SpO₂ Trends</h3>
            <div className="h-64">
              <ResponsiveContainer>
                <LineChart data={vitalChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(17,24,39,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                  <Line type="monotone" dataKey="hr" stroke="#ef4444" strokeWidth={2} dot={false} name="Heart Rate" />
                  <Line type="monotone" dataKey="spo2" stroke="#06b6d4" strokeWidth={2} dot={false} name="SpO₂" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          {/* Blood Pressure */}
          <div className="glass-card p-5">
            <h3 className="section-title">🩺 Blood Pressure</h3>
            <div className="h-48">
              <ResponsiveContainer>
                <AreaChart data={vitalChartData}>
                  <defs>
                    <linearGradient id="bpGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(17,24,39,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                  <Area type="monotone" dataKey="sys" stroke="#3b82f6" fill="url(#bpGrad)" strokeWidth={2} name="Systolic" />
                  <Line type="monotone" dataKey="dia" stroke="#8b5cf6" strokeWidth={1.5} dot={false} name="Diastolic" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {tab === 'AI Predictions' && (
        <div className="space-y-4">
          <div className="glass-card p-5">
            <h3 className="section-title">📈 Risk Score Trend</h3>
            <div className="h-56">
              <ResponsiveContainer>
                <AreaChart data={predChartData}>
                  <defs>
                    <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(17,24,39,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                  <Area type="monotone" dataKey="risk" stroke="#ef4444" fill="url(#riskGrad)" strokeWidth={2.5} name="Risk %" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="glass-card p-5">
            <h3 className="section-title">📋 Prediction History</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="table-header text-left px-3 py-2">Date</th>
                    <th className="table-header text-left px-3 py-2">Risk</th>
                    <th className="table-header text-left px-3 py-2">Level</th>
                    <th className="table-header text-left px-3 py-2">Confidence</th>
                    <th className="table-header text-left px-3 py-2">Model</th>
                  </tr>
                </thead>
                <tbody>
                  {predictions.map((p) => (
                    <tr key={p.id} className="table-row">
                      <td className="table-cell text-xs">{new Date(p.predicted_at).toLocaleString()}</td>
                      <td className="table-cell font-bold">{p.risk_percentage}%</td>
                      <td className="table-cell">
                        <span className={p.risk_level === 'critical' || p.risk_level === 'high' ? 'vital-badge-red' : p.risk_level === 'medium' ? 'vital-badge-yellow' : 'vital-badge-green'}>
                          {p.risk_level.toUpperCase()}
                        </span>
                      </td>
                      <td className="table-cell">{p.confidence}%</td>
                      <td className="table-cell text-xs text-slate-400">{p.model_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'Medications' && (
        <div className="glass-card p-5">
          <h3 className="section-title">💊 Active Medications</h3>
          {medications.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-6">No medications prescribed</p>
          ) : (
            <div className="space-y-3">
              {medications.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-4 rounded-xl bg-surface-900/50 border border-white/5">
                  <div>
                    <p className="font-semibold text-white">{m.medicine_name}</p>
                    <p className="text-xs text-slate-400">{m.dose} • {m.frequency} • {m.route}</p>
                    {m.instructions && <p className="text-xs text-slate-500 mt-1">{m.instructions}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono text-brand-400">{m.doses_given}/{m.doses_total || '∞'}</p>
                    <p className="text-[10px] text-slate-500">{m.doses_missed > 0 ? `${m.doses_missed} missed` : 'No misses'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'Symptoms' && (
        <div className="glass-card p-5">
          <h3 className="section-title">🩺 Symptom History</h3>
          <p className="text-slate-500 text-sm text-center py-6">Symptom tracking view — record symptoms via the API</p>
        </div>
      )}
    </div>
  );
}
