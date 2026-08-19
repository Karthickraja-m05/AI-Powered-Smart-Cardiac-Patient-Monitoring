import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { doctorAvailabilityAPI } from '../../services/api';
import type { DoctorSearchResult } from '../../types';

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  available: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-500' },
  busy: { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-500' },
  in_surgery: { bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-500' },
  emergency: { bg: 'bg-red-600/10', text: 'text-red-400', dot: 'bg-red-600' },
  meeting: { bg: 'bg-blue-500/10', text: 'text-blue-400', dot: 'bg-blue-500' },
  off_duty: { bg: 'bg-slate-500/10', text: 'text-slate-400', dot: 'bg-slate-500' },
  vacation: { bg: 'bg-purple-500/10', text: 'text-purple-400', dot: 'bg-purple-500' },
};

export default function DoctorSearchComponent() {
  const [doctors, setDoctors] = useState<DoctorSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [specialization, setSpecialization] = useState('');
  const [sortBy, setSortBy] = useState<'workload' | 'rating' | 'experience'>('workload');

  const search = async () => {
    setLoading(true);
    try {
      const res = await doctorAvailabilityAPI.searchAvailable({
        specialization: specialization || undefined,
        sort_by: sortBy,
      });
      setDoctors(res.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { search(); }, [sortBy]);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white">🔍 Smart Doctor Search</h1>
        <p className="text-slate-400 text-sm mt-1">Find available doctors by specialization, workload, and rating</p>
      </motion.div>

      {/* Search Bar */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        className="flex gap-3">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search by specialization (e.g., Cardiology, Surgery...)"
            value={specialization}
            onChange={(e) => setSpecialization(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            className="w-full px-4 py-3 pl-10 bg-surface-800/50 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all"
          />
          <span className="absolute left-3 top-3.5 text-slate-500">🔍</span>
        </div>
        <button onClick={search} disabled={loading}
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all disabled:opacity-50">
          {loading ? '...' : 'Search'}
        </button>
      </motion.div>

      {/* Sort Options */}
      <div className="flex gap-2">
        {[
          { key: 'workload' as const, label: '📊 Least Busy', desc: 'Sort by workload' },
          { key: 'rating' as const, label: '⭐ Top Rated', desc: 'Sort by rating' },
          { key: 'experience' as const, label: '🏆 Most Experienced', desc: 'Sort by experience' },
        ].map(opt => (
          <button key={opt.key} onClick={() => setSortBy(opt.key)}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
              sortBy === opt.key
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10'
            }`}>
            {opt.label}
          </button>
        ))}
      </div>

      {/* Results */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full" />
          </motion.div>
        ) : (
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="space-y-3">
            {doctors.map((doc, i) => {
              const sc = statusColors[doc.availability_status] || statusColors.available;
              return (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-surface-800/50 border border-white/5 rounded-2xl p-5 hover:border-blue-500/20 transition-all group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-sky-500 flex items-center justify-center text-white text-lg font-bold shadow-lg">
                        {doc.full_name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-white group-hover:text-blue-300 transition-colors">{doc.full_name}</h3>
                        <p className="text-sm text-blue-400">{doc.specialization || 'General'}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{doc.department}</p>

                        <div className="flex items-center gap-4 mt-3">
                          <div className="flex items-center gap-1">
                            <span className="text-amber-400 text-sm">★</span>
                            <span className="text-sm text-slate-300">{doc.rating_avg?.toFixed(1) || 'N/A'}</span>
                            <span className="text-xs text-slate-500">({doc.rating_count})</span>
                          </div>
                          <span className="text-xs text-slate-500">|</span>
                          <span className="text-xs text-slate-400">{doc.experience_years || 0} yrs experience</span>
                          <span className="text-xs text-slate-500">|</span>
                          <span className="text-xs text-slate-400">{doc.current_workload} patients</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${sc.bg} ${sc.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot} animate-pulse`} />
                        {doc.availability_status.replace('_', ' ')}
                      </span>
                      <div className="text-right mt-1">
                        <p className="text-xs text-slate-400">Est. wait</p>
                        <p className={`text-lg font-bold ${doc.estimated_wait_minutes > 30 ? 'text-red-400' : doc.estimated_wait_minutes > 15 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {doc.estimated_wait_minutes} min
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
            {doctors.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <span className="text-4xl block mb-3">🔍</span>
                <p className="text-sm">No doctors found matching your criteria</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
