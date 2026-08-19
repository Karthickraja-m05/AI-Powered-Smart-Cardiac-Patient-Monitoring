import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { patientsAPI } from '../../services/api';
import type { Patient } from '../../types';

const priorityConfig: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  critical: { color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', label: 'Critical', icon: '🔴' },
  urgent: { color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', label: 'Urgent', icon: '🟠' },
  stable: { color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', label: 'Stable', icon: '🟡' },
  waiting: { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', label: 'Waiting', icon: '🟢' },
};

export default function ICUPriorityBoard() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    patientsAPI.list({ status: 'icu', per_page: 50 }).then(res => {
      // Get all patients and sort by ICU priority
      const allPatients = res.data.patients || [];
      const sorted = allPatients.sort((a, b) => {
        const order = { critical: 0, urgent: 1, stable: 2, waiting: 3 };
        const aOrder = order[(a.icu_priority_level || 'waiting') as keyof typeof order] ?? 4;
        const bOrder = order[(b.icu_priority_level || 'waiting') as keyof typeof order] ?? 4;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return (b.icu_priority_score || 0) - (a.icu_priority_score || 0);
      });
      setPatients(sorted);
      setLoading(false);
    }).catch(() => {
      // Fallback: get all patients and filter ICU + high risk
      patientsAPI.list({ per_page: 50 }).then(res => {
        const icuPatients = (res.data.patients || []).filter((p: Patient) =>
          p.status === 'icu' || p.icu_priority_level
        );
        setPatients(icuPatients);
        setLoading(false);
      }).catch(() => setLoading(false));
    });
  }, []);

  if (loading) return <div className="flex items-center justify-center h-32"><div className="animate-spin w-6 h-6 border-2 border-red-400 border-t-transparent rounded-full" /></div>;

  // Group by priority
  const groups = ['critical', 'urgent', 'stable', 'waiting'];
  const grouped = groups.reduce<Record<string, Patient[]>>((acc, g) => {
    acc[g] = patients.filter(p => (p.icu_priority_level || 'waiting') === g);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">🏥 ICU Priority Board</h2>
          <p className="text-xs text-slate-400 mt-1">{patients.length} patients in ICU / Priority queue</p>
        </div>
        <div className="flex gap-2">
          {groups.map(g => {
            const cfg = priorityConfig[g];
            return (
              <div key={g} className="flex items-center gap-1 text-xs text-slate-400">
                <span>{cfg.icon}</span>
                <span>{grouped[g]?.length || 0}</span>
              </div>
            );
          })}
        </div>
      </div>

      {groups.map(group => {
        const cfg = priorityConfig[group];
        const pts = grouped[group] || [];
        if (pts.length === 0) return null;

        return (
          <motion.div key={group} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">{cfg.icon}</span>
              <h3 className={`text-sm font-semibold uppercase tracking-wider ${cfg.color}`}>{cfg.label}</h3>
              <span className="text-xs text-slate-500">({pts.length})</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {pts.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`border rounded-xl p-4 ${cfg.bg} hover:scale-[1.01] transition-transform`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">{p.first_name} {p.last_name}</p>
                      <p className="text-xs text-slate-400">{p.patient_uid} • Room {p.room_number} • Bed {p.bed_number}</p>
                      <p className="text-xs text-slate-500 mt-1">{p.admission_reason}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${cfg.color}`}>{p.icu_priority_score?.toFixed(0) || 'N/A'}</p>
                      <p className="text-[10px] text-slate-500">Score</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-3 text-xs text-slate-400">
                    {p.current_risk_level && (
                      <span className={`px-2 py-0.5 rounded-full ${
                        p.current_risk_level === 'critical' ? 'bg-red-500/20 text-red-400' :
                        p.current_risk_level === 'high' ? 'bg-orange-500/20 text-orange-400' :
                        'bg-amber-500/20 text-amber-400'
                      }`}>Risk: {p.current_risk_level}</span>
                    )}
                    <span>Age: {p.age}</span>
                    {p.has_hypertension && <span>⬆BP</span>}
                    {p.has_diabetes && <span>🩸DM</span>}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        );
      })}

      {patients.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <span className="text-3xl block mb-2">🏥</span>
          <p className="text-sm">No ICU patients found</p>
        </div>
      )}
    </div>
  );
}
