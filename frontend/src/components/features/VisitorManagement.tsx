import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { visitorsAPI } from '../../services/api';
import type { Visitor } from '../../types';

const statusBadges: Record<string, { bg: string; text: string; label: string }> = {
  registered: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Registered' },
  checked_in: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Checked In' },
  checked_out: { bg: 'bg-slate-500/10', text: 'text-slate-400', label: 'Checked Out' },
  denied: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Denied' },
  expired: { bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'Expired' },
};

interface Props {
  patientId: number;
}

export default function VisitorManagement({ patientId }: Props) {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    visitor_name: '', phone: '', relation: '', id_proof_type: '', id_proof_number: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchVisitors = async () => {
    try {
      const res = await visitorsAPI.getForPatient(patientId);
      setVisitors(res.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchVisitors(); }, [patientId]);

  const registerVisitor = async () => {
    if (!form.visitor_name) return;
    setSubmitting(true);
    try {
      await visitorsAPI.register({ patient_id: patientId, ...form });
      setForm({ visitor_name: '', phone: '', relation: '', id_proof_type: '', id_proof_number: '' });
      setShowForm(false);
      await fetchVisitors();
    } catch (e) { console.error(e); }
    setSubmitting(false);
  };

  const handleCheckIn = async (id: number) => {
    try {
      await visitorsAPI.checkIn(id);
      await fetchVisitors();
    } catch (e) { console.error(e); }
  };

  const handleCheckOut = async (id: number) => {
    try {
      await visitorsAPI.checkOut(id);
      await fetchVisitors();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">🎫 Visitor Management</h3>
        <button onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-gradient-to-r from-purple-500 to-violet-500 text-white font-semibold text-xs rounded-xl shadow-lg hover:shadow-purple-500/30 transition-all">
          {showForm ? '✕ Cancel' : '+ Register Visitor'}
        </button>
      </div>

      {/* Registration Form */}
      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-surface-800/50 border border-purple-500/20 rounded-2xl p-5">
          <h4 className="text-sm font-semibold text-purple-300 mb-4">New Visitor Registration</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input placeholder="Visitor Name *" value={form.visitor_name}
              onChange={e => setForm(f => ({...f, visitor_name: e.target.value}))}
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40" />
            <input placeholder="Phone" value={form.phone}
              onChange={e => setForm(f => ({...f, phone: e.target.value}))}
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40" />
            <input placeholder="Relation (e.g., Spouse, Parent)" value={form.relation}
              onChange={e => setForm(f => ({...f, relation: e.target.value}))}
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40" />
            <input placeholder="ID Proof Type (Aadhaar, PAN)" value={form.id_proof_type}
              onChange={e => setForm(f => ({...f, id_proof_type: e.target.value}))}
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40" />
          </div>
          <button onClick={registerVisitor} disabled={submitting || !form.visitor_name}
            className="mt-4 px-6 py-2 bg-purple-600 text-white font-semibold text-sm rounded-xl shadow-lg disabled:opacity-50 transition-all">
            {submitting ? 'Registering...' : 'Register & Generate QR'}
          </button>
        </motion.div>
      )}

      {/* Visitor List */}
      {loading ? (
        <div className="flex items-center justify-center py-8"><div className="animate-spin w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full" /></div>
      ) : (
        <div className="space-y-2">
          {visitors.map((v, i) => {
            const badge = statusBadges[v.status] || statusBadges.registered;
            return (
              <motion.div
                key={v.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-surface-800/50 border border-white/5 rounded-xl p-4 hover:border-purple-500/20 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center text-white text-sm font-bold">
                      {v.visitor_name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{v.visitor_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {v.relation && <span className="text-xs text-slate-400">{v.relation}</span>}
                        {v.phone && <span className="text-xs text-slate-500">{v.phone}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {v.qr_token && (
                      <span className="text-[10px] text-purple-400 bg-purple-500/10 px-2 py-1 rounded-lg font-mono">
                        QR: {v.qr_token}
                      </span>
                    )}
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold ${badge.bg} ${badge.text}`}>
                      {badge.label}
                    </span>
                    {v.status === 'registered' && (
                      <button onClick={() => handleCheckIn(v.id)}
                        className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-lg hover:bg-emerald-500/30 transition-all">
                        Check In
                      </button>
                    )}
                    {v.status === 'checked_in' && (
                      <button onClick={() => handleCheckOut(v.id)}
                        className="px-3 py-1 bg-amber-500/20 text-amber-400 text-xs font-semibold rounded-lg hover:bg-amber-500/30 transition-all">
                        Check Out
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
          {visitors.length === 0 && (
            <div className="text-center py-8 text-slate-500 text-sm">No visitors registered</div>
          )}
        </div>
      )}
    </div>
  );
}
