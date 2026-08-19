import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { timelineAPI } from '../../services/api';
import type { TimelineEvent } from '../../types';

const eventIcons: Record<string, string> = {
  admission: '🏥',
  discharge: '🚪',
  vitals: '💓',
  medication: '💊',
  injection: '💉',
  doctor_visit: '👨‍⚕️',
  nurse_check: '👩‍⚕️',
  ecg: '📈',
  lab_report: '🔬',
  surgery: '🏥',
  transfer: '🔄',
  diagnosis: '📋',
  treatment_plan: '📝',
  alert: '🚨',
  note: '📌',
  document_upload: '📄',
  rating: '⭐',
};

const eventColors: Record<string, { bg: string; border: string; dot: string }> = {
  admission: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', dot: 'bg-blue-500' },
  discharge: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', dot: 'bg-emerald-500' },
  vitals: { bg: 'bg-pink-500/10', border: 'border-pink-500/20', dot: 'bg-pink-500' },
  medication: { bg: 'bg-orange-500/10', border: 'border-orange-500/20', dot: 'bg-orange-500' },
  alert: { bg: 'bg-red-500/10', border: 'border-red-500/20', dot: 'bg-red-500' },
  surgery: { bg: 'bg-violet-500/10', border: 'border-violet-500/20', dot: 'bg-violet-500' },
};

const defaultColor = { bg: 'bg-slate-500/10', border: 'border-slate-500/20', dot: 'bg-slate-500' };

interface Props {
  patientId: number;
}

export default function PatientTimeline({ patientId }: Props) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');

  useEffect(() => {
    timelineAPI.getForPatient(patientId, filter || undefined).then(res => {
      setEvents(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [patientId, filter]);

  if (loading) return <div className="flex items-center justify-center h-32"><div className="animate-spin w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full" /></div>;

  const filters = ['', 'admission', 'vitals', 'medication', 'doctor_visit', 'nurse_check', 'alert', 'lab_report', 'ecg'];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">📅 Patient Timeline</h3>
      </div>

      {/* Filter Tags */}
      <div className="flex flex-wrap gap-2">
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              filter === f
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10'
            }`}>
            {f ? `${eventIcons[f] || '📋'} ${f.replace('_', ' ')}` : '📋 All'}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="relative ml-4">
        {/* Vertical line */}
        <div className="absolute left-2 top-0 bottom-0 w-px bg-white/10" />

        {events.map((evt, i) => {
          const color = eventColors[evt.event_type] || defaultColor;
          const time = new Date(evt.event_at);

          return (
            <motion.div
              key={evt.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="relative pl-10 pb-6 last:pb-0"
            >
              {/* Dot */}
              <div className={`absolute left-0 top-1.5 w-4 h-4 rounded-full ${color.dot} border-2 border-surface-900 shadow-lg z-10`} />

              {/* Card */}
              <div className={`${color.bg} border ${color.border} rounded-xl p-4 hover:scale-[1.01] transition-transform`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{evt.icon || eventIcons[evt.event_type] || '📋'}</span>
                      <h4 className="text-sm font-semibold text-white">{evt.title}</h4>
                    </div>
                    {evt.description && (
                      <p className="text-xs text-slate-400 mt-1">{evt.description}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px] text-slate-500">{time.toLocaleDateString()}</p>
                    <p className="text-[10px] text-slate-500">{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}

        {events.length === 0 && (
          <div className="text-center py-8 text-slate-500 text-sm">No timeline events found</div>
        )}
      </div>
    </div>
  );
}
