import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { visitorsAPI, patientsAPI } from '../../services/api';
import type { Visitor, Patient } from '../../types';

const statusBadges: Record<string, { bg: string; text: string; label: string }> = {
  registered: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Registered' },
  checked_in: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Checked In' },
  checked_out: { bg: 'bg-slate-500/10', text: 'text-slate-400', label: 'Checked Out' },
  denied: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Denied' },
  expired: { bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'Expired' },
};

interface Props {
  patientId?: number;
}

export default function VisitorManagement({ patientId }: Props) {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number>(patientId || 0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    patient_id: patientId || 0,
    visitor_name: '',
    phone: '',
    relation: '',
    id_proof_type: 'Aadhaar / National ID',
    id_proof_number: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchVisitors = async () => {
    try {
      if (selectedPatientId) {
        const res = await visitorsAPI.getForPatient(selectedPatientId);
        setVisitors(res.data);
      } else {
        const res = await visitorsAPI.listAll();
        setVisitors(res.data);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!patientId) {
      patientsAPI.list({ per_page: 100 }).then((res) => {
        setPatients(res.data.patients || []);
      }).catch(console.error);
    }
  }, [patientId]);

  useEffect(() => {
    fetchVisitors();
  }, [selectedPatientId]);

  const registerVisitor = async () => {
    const targetPatientId = selectedPatientId || form.patient_id;
    if (!targetPatientId) {
      toast.error('Please select a patient');
      return;
    }
    if (!form.visitor_name.trim()) {
      toast.error('Visitor name is required');
      return;
    }
    setSubmitting(true);
    try {
      const res = await visitorsAPI.register({
        patient_id: targetPatientId,
        visitor_name: form.visitor_name,
        phone: form.phone,
        relation: form.relation || 'Family',
        id_proof_type: form.id_proof_type,
        id_proof_number: form.id_proof_number,
      });
      toast.success(`Visitor pass issued! QR: ${res.data?.qr_token || 'OK'}`);
      setForm({
        patient_id: patientId || 0,
        visitor_name: '',
        phone: '',
        relation: '',
        id_proof_type: 'Aadhaar / National ID',
        id_proof_number: '',
      });
      setShowForm(false);
      await fetchVisitors();
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Failed to register visitor');
    }
    setSubmitting(false);
  };

  const handleCheckIn = async (id: number) => {
    try {
      await visitorsAPI.checkIn(id);
      toast.success('Checked In');
      await fetchVisitors();
    } catch (e) {
      toast.error('Check-in failed');
    }
  };

  const handleCheckOut = async (id: number) => {
    try {
      await visitorsAPI.checkOut(id);
      toast.success('Checked Out');
      await fetchVisitors();
    } catch (e) {
      toast.error('Check-out failed');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <span>🎫</span> Visitor Management
          </h3>
          <p className="text-xs text-slate-400">Issue visitor passes, check-in, check-out and verify QR passes</p>
        </div>
        <div className="flex items-center gap-2">
          {!patientId && (
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(Number(e.target.value))}
              className="px-3 py-2 bg-surface-800 border border-white/10 rounded-xl text-xs text-white"
            >
              <option value={0}>All Hospital Visitors</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.first_name} {p.last_name} ({p.ward || 'Ward'})
                </option>
              ))}
            </select>
          )}
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-400 hover:to-violet-400 text-white font-semibold text-xs rounded-xl shadow-lg hover:shadow-purple-500/30 transition-all"
          >
            {showForm ? '✕ Cancel' : '+ Register Visitor'}
          </button>
        </div>
      </div>

      {/* Registration Form */}
      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-surface-800/60 border border-purple-500/30 rounded-2xl p-5 shadow-xl">
          <h4 className="text-sm font-bold text-purple-300 mb-3">New Visitor Registration</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {!patientId && !selectedPatientId && (
              <div>
                <label className="block text-[11px] text-slate-300 font-semibold mb-1">Select Patient *</label>
                <select
                  value={form.patient_id}
                  onChange={(e) => setForm({ ...form, patient_id: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-surface-900 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value={0}>-- Select Patient --</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.first_name} {p.last_name} ({p.ward || 'Ward'})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-[11px] text-slate-300 font-semibold mb-1">Visitor Name *</label>
              <input
                placeholder="e.g. Anjali Verma"
                value={form.visitor_name}
                onChange={e => setForm(f => ({ ...f, visitor_name: e.target.value }))}
                className="w-full px-3 py-2 bg-surface-900 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-300 font-semibold mb-1">Phone</label>
              <input
                placeholder="e.g. +91 9876543210"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full px-3 py-2 bg-surface-900 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-300 font-semibold mb-1">Relation</label>
              <input
                placeholder="e.g. Spouse, Parent, Brother"
                value={form.relation}
                onChange={e => setForm(f => ({ ...f, relation: e.target.value }))}
                className="w-full px-3 py-2 bg-surface-900 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-300 font-semibold mb-1">ID Proof Type</label>
              <input
                placeholder="e.g. Aadhaar, Voter ID, PAN"
                value={form.id_proof_type}
                onChange={e => setForm(f => ({ ...f, id_proof_type: e.target.value }))}
                className="w-full px-3 py-2 bg-surface-900 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
          <button
            onClick={registerVisitor}
            disabled={submitting || !form.visitor_name}
            className="mt-4 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-sm rounded-xl shadow-lg disabled:opacity-50 transition-all cursor-pointer"
          >
            {submitting ? 'Registering...' : 'Register & Issue Pass'}
          </button>
        </motion.div>
      )}

      {/* Visitor List */}
      {loading ? (
        <div className="flex items-center justify-center py-8"><div className="animate-spin w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full" /></div>
      ) : (
        <div className="space-y-2.5">
          {visitors.map((v, i) => {
            const badge = statusBadges[v.status] || statusBadges.registered;
            return (
              <motion.div
                key={v.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="bg-surface-800/50 border border-white/5 rounded-xl p-4 hover:border-purple-500/30 transition-all"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center text-white text-sm font-bold shadow">
                      {v.visitor_name.split(' ').map(w => w[0]).join('').slice(0, 2) || 'VI'}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{v.visitor_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {v.relation && <span className="text-xs text-purple-300/80">{v.relation}</span>}
                        {v.phone && <span className="text-xs text-slate-400">{v.phone}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {v.qr_token && (
                      <span className="text-[10px] text-purple-300 bg-purple-500/20 border border-purple-500/30 px-2 py-1 rounded-lg font-mono">
                        QR: {v.qr_token}
                      </span>
                    )}
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${badge.bg} ${badge.text}`}>
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
            <div className="text-center py-10 text-slate-500 text-sm bg-white/[0.02] rounded-xl border border-dashed border-white/5">
              No visitors found for this view.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
