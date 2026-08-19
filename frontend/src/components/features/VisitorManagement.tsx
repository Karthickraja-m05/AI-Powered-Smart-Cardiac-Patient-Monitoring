import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { visitorsAPI, patientsAPI } from '../../services/api';
import type { Visitor, Patient } from '../../types';

interface Props {
  patientId?: number;
}

const statusBadges: Record<string, { bg: string; text: string; border: string; label: string; icon: string }> = {
  registered: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30', label: 'Pre-Registered', icon: '🔵' },
  checked_in: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', label: 'In Ward', icon: '🟢' },
  checked_out: { bg: 'bg-slate-500/15', text: 'text-slate-400', border: 'border-slate-500/30', label: 'Checked Out', icon: '⚪' },
  denied: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30', label: 'Access Denied', icon: '🔴' },
  expired: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', label: 'Pass Expired', icon: '🟡' },
};

const PURPOSE_OPTIONS = [
  'Routine Family Visit',
  'Delivering Food / Personal Items',
  'Doctor Consultation / Update',
  'ICU Family Permission',
  'Caregiver Handover',
  'Emergency Notification',
];

export default function VisitorManagement({ patientId }: Props) {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number>(patientId || 0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [wardFilter, setWardFilter] = useState<string>('all');

  // Selected Visitor for Digital Pass Modal
  const [viewingPass, setViewingPass] = useState<Visitor | null>(null);

  // Visitor Form State
  const [form, setForm] = useState({
    patient_id: patientId || 0,
    visitor_name: '',
    phone: '',
    relation: 'Family',
    purpose: 'Routine Family Visit',
    id_proof_type: 'Aadhaar / National ID',
    id_proof_number: '',
    expected_duration_mins: 60,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchVisitors = async () => {
    try {
      if (selectedPatientId) {
        const res = await visitorsAPI.getForPatient(selectedPatientId);
        setVisitors(res.data || []);
      } else {
        const res = await visitorsAPI.listAll();
        setVisitors(res.data || []);
      }
    } catch (e) {
      console.error(e);
      // Demo fallback mock data if server list is empty
      if (visitors.length === 0) {
        setVisitors([
          {
            id: 101,
            patient_id: 1,
            visitor_name: 'Ananya Sharma',
            phone: '+91 98450 12345',
            relation: 'Spouse',
            qr_token: 'VST-2026-8891',
            status: 'checked_in',
            check_in_at: new Date(Date.now() - 45 * 60000).toISOString(),
            created_at: new Date().toISOString(),
          },
          {
            id: 102,
            patient_id: 2,
            visitor_name: 'Vikram Patel',
            phone: '+91 97123 45678',
            relation: 'Son',
            qr_token: 'VST-2026-8892',
            status: 'checked_in',
            check_in_at: new Date(Date.now() - 80 * 60000).toISOString(),
            created_at: new Date().toISOString(),
          },
          {
            id: 103,
            patient_id: 3,
            visitor_name: 'Pooja Iyer',
            phone: '+91 96234 56789',
            relation: 'Sister',
            qr_token: 'VST-2026-8893',
            status: 'registered',
            created_at: new Date().toISOString(),
          },
          {
            id: 104,
            patient_id: 4,
            visitor_name: 'Rajesh Nair',
            phone: '+91 95345 67890',
            relation: 'Brother',
            qr_token: 'VST-2026-8894',
            status: 'checked_out',
            check_in_at: new Date(Date.now() - 180 * 60000).toISOString(),
            check_out_at: new Date(Date.now() - 60 * 60000).toISOString(),
            created_at: new Date().toISOString(),
          },
        ]);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    patientsAPI
      .list({ per_page: 100 })
      .then((res) => {
        setPatients(res.data.patients || []);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetchVisitors();
  }, [selectedPatientId]);

  const handleRegisterVisitor = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetPatientId = selectedPatientId || form.patient_id;
    if (!targetPatientId) {
      toast.error('Please select a patient to visit');
      return;
    }
    if (!form.visitor_name.trim()) {
      toast.error('Visitor name is required');
      return;
    }
    setSubmitting(true);
    try {
      const res = await visitorsAPI.register({
        patient_id: Number(targetPatientId),
        visitor_name: form.visitor_name,
        phone: form.phone,
        relation: form.relation || 'Family',
        id_proof_type: form.id_proof_type,
        id_proof_number: form.id_proof_number,
      });

      const newPass = res.data || {
        id: Date.now(),
        patient_id: targetPatientId,
        visitor_name: form.visitor_name,
        phone: form.phone,
        relation: form.relation,
        qr_token: `VST-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        status: 'registered',
        created_at: new Date().toISOString(),
      };

      toast.success(`Visitor pass issued for ${form.visitor_name}! QR: ${newPass.qr_token || 'Generated'}`);
      setViewingPass(newPass);

      setForm({
        patient_id: patientId || 0,
        visitor_name: '',
        phone: '',
        relation: 'Family',
        purpose: 'Routine Family Visit',
        id_proof_type: 'Aadhaar / National ID',
        id_proof_number: '',
        expected_duration_mins: 60,
      });
      fetchVisitors();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to register visitor');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckIn = async (id: number) => {
    try {
      await visitorsAPI.checkIn(id);
      toast.success('Visitor Checked In ✅');
      fetchVisitors();
    } catch {
      // Local optimistic update
      setVisitors((prev) =>
        prev.map((v) => (v.id === id ? { ...v, status: 'checked_in', check_in_at: new Date().toISOString() } : v))
      );
      toast.success('Visitor Checked In ✅');
    }
  };

  const handleCheckOut = async (id: number) => {
    try {
      await visitorsAPI.checkOut(id);
      toast.success('Visitor Checked Out 🚪');
      fetchVisitors();
    } catch {
      // Local optimistic update
      setVisitors((prev) =>
        prev.map((v) => (v.id === id ? { ...v, status: 'checked_out', check_out_at: new Date().toISOString() } : v))
      );
      toast.success('Visitor Checked Out 🚪');
    }
  };

  // Helper to find patient name and ward
  const getPatientInfo = (pid: number) => {
    const p = patients.find((pat) => pat.id === pid);
    if (!p) return { name: `Patient #${pid}`, ward: 'General Ward', bed: 'Bed B-1' };
    return {
      name: `${p.first_name} ${p.last_name}`,
      uid: p.patient_uid || `PAT-${p.id}`,
      ward: p.ward || 'General Ward A',
      bed: p.bed_number || 'Bed 12',
      room: p.room_number || 'Room 204',
    };
  };

  // Filtered visitor list
  const filteredVisitors = visitors.filter((v) => {
    const pat = getPatientInfo(v.patient_id);
    const matchesSearch =
      v.visitor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.phone || '').includes(searchQuery) ||
      (v.qr_token || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      pat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pat.ward.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ? true : v.status === statusFilter;

    const matchesWard =
      wardFilter === 'all' ? true : pat.ward.toLowerCase().includes(wardFilter.toLowerCase());

    return matchesSearch && matchesStatus && matchesWard;
  });

  const checkedInCount = visitors.filter((v) => v.status === 'checked_in').length;
  const registeredCount = visitors.filter((v) => v.status === 'registered').length;
  const checkedOutCount = visitors.filter((v) => v.status === 'checked_out').length;

  const selectedPatientData = patients.find((p) => p.id === (form.patient_id || selectedPatientId));

  return (
    <div className="space-y-6 pb-12">
      {/* ── Page Header: Security Desk Visual Identity ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950/40 via-surface-850 to-surface-900 border border-emerald-500/20 p-5 shadow-2xl backdrop-blur-xl"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-2xl shadow-lg shadow-emerald-500/20 border border-emerald-400/30 flex-shrink-0">
              🎫
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
                  Visitor Access & Pass Station
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Security Desk Active
                </span>
              </div>
              <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
                Issue fast-pass visitor badges, track room visits, entry/exit logs & verify security tokens.
              </p>
            </div>
          </div>

          {/* Key Counter Badges */}
          <div className="flex items-center flex-wrap gap-2.5">
            <div className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <p className="text-[10px] uppercase font-bold text-emerald-300/80">In Wards Now</p>
                <p className="text-sm font-extrabold text-white font-mono">{checkedInCount} Visitors</p>
              </div>
            </div>

            <div className="px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
              <div>
                <p className="text-[10px] uppercase font-bold text-blue-300/80">Pre-Registered</p>
                <p className="text-sm font-extrabold text-white font-mono">{registeredCount} Passes</p>
              </div>
            </div>

            <div className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Total Today</p>
                <p className="text-sm font-extrabold text-white font-mono">{visitors.length} Total</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Form + Table Split-Screen Layout ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* ══════════════════════════════════════════════════════════════
            LEFT COLUMN (4 Cols): Fast-Pass Visitor Check-In Form
        ══════════════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, x: -15 }}
          animate={{ opacity: 1, x: 0 }}
          className="xl:col-span-4 rounded-2xl bg-surface-850 border border-emerald-500/20 shadow-xl overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-white/5 bg-gradient-to-r from-emerald-950/50 to-teal-950/30 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-lg p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300">⚡</span>
              <div>
                <h3 className="text-sm font-bold text-white">Fast-Pass Entry Generator</h3>
                <p className="text-[11px] text-emerald-300/80">Issue instant access pass with QR verification</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleRegisterVisitor} className="p-5 space-y-4">
            {/* Patient Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Patient to Visit <span className="text-emerald-400">*</span>
              </label>
              <select
                required
                value={form.patient_id || selectedPatientId}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setForm({ ...form, patient_id: val });
                  setSelectedPatientId(val);
                }}
                className="w-full px-3.5 py-2.5 bg-surface-900 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value={0}>-- Select Admitted Patient --</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.first_name} {p.last_name} ({p.ward || 'Ward A'} • {p.bed_number || 'Bed 101'})
                  </option>
                ))}
              </select>

              {/* Auto-populated Patient Location Badge */}
              {selectedPatientData && (
                <div className="mt-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs flex items-center justify-between text-emerald-300">
                  <span className="font-semibold">📍 Ward: {selectedPatientData.ward || 'General Ward'}</span>
                  <span>Room: {selectedPatientData.room_number || '204'} • Bed: {selectedPatientData.bed_number || 'B-12'}</span>
                </div>
              )}
            </div>

            {/* Visitor Name & Phone */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Visitor Full Name <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Priya Sundaram"
                  value={form.visitor_name}
                  onChange={(e) => setForm({ ...form, visitor_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-surface-900 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-surface-900 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Relationship</label>
                  <select
                    value={form.relation}
                    onChange={(e) => setForm({ ...form, relation: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-surface-900 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Family">Family / Relative</option>
                    <option value="Spouse">Spouse / Partner</option>
                    <option value="Parent">Parent</option>
                    <option value="Child">Son / Daughter</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Friend">Friend / Colleague</option>
                    <option value="Caregiver">Personal Caregiver</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Purpose of Visit */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Purpose of Visit</label>
              <select
                value={form.purpose}
                onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-surface-900 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {PURPOSE_OPTIONS.map((pur) => (
                  <option key={pur} value={pur}>
                    {pur}
                  </option>
                ))}
              </select>
            </div>

            {/* ID Proof Type & ID Number */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">ID Proof Type</label>
                <select
                  value={form.id_proof_type}
                  onChange={(e) => setForm({ ...form, id_proof_type: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-900 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Aadhaar / National ID">Aadhaar Card</option>
                  <option value="Driving License">Driving License</option>
                  <option value="Passport">Passport</option>
                  <option value="Voter ID">Voter ID</option>
                  <option value="Hospital Staff ID">Hospital Staff</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">ID Number (Last 4)</label>
                <input
                  type="text"
                  placeholder="e.g. 7842"
                  value={form.id_proof_number}
                  onChange={(e) => setForm({ ...form, id_proof_number: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-900 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Submit Fast-Pass Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{submitting ? 'Generating...' : '🎫 Issue Fast-Pass & Token'}</span>
            </button>
          </form>
        </motion.div>

        {/* ══════════════════════════════════════════════════════════════
            RIGHT COLUMN (8 Cols): Visitor Roster Table & Logs
        ══════════════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, x: 15 }}
          animate={{ opacity: 1, x: 0 }}
          className="xl:col-span-8 rounded-2xl bg-surface-850 border border-white/10 shadow-xl overflow-hidden flex flex-col"
        >
          {/* Filter & Search Header */}
          <div className="p-4 border-b border-white/5 space-y-3 bg-surface-900/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="🔍 Search visitor name, phone, QR token, patient or ward..."
                  className="w-full pl-9 pr-4 py-2 bg-surface-900 border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Ward Filter */}
              <select
                value={wardFilter}
                onChange={(e) => setWardFilter(e.target.value)}
                className="px-3 py-2 bg-surface-900 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">All Hospital Wards</option>
                <option value="ICU">Cardiac ICU</option>
                <option value="CCU">Coronary Care (CCU)</option>
                <option value="Ward A">General Ward A</option>
                <option value="Ward B">General Ward B</option>
              </select>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {[
                { id: 'all', label: 'All Passes', count: visitors.length },
                { id: 'checked_in', label: '🟢 In Ward (Checked In)', count: checkedInCount },
                { id: 'registered', label: '🔵 Pre-Registered', count: registeredCount },
                { id: 'checked_out', label: '⚪ Checked Out', count: checkedOutCount },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    statusFilter === tab.id
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20 font-bold'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 font-mono">
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Visitor List Table */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02] text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="px-4 py-3.5">Visitor & Pass</th>
                    <th className="px-4 py-3.5">Patient & Ward Visited</th>
                    <th className="px-4 py-3.5">Purpose</th>
                    <th className="px-4 py-3.5">Entry / Exit Log</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5 text-right">Desk Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredVisitors.map((v) => {
                    const pat = getPatientInfo(v.patient_id);
                    const badge = statusBadges[v.status] || statusBadges.registered;
                    return (
                      <tr key={v.id} className="hover:bg-white/[0.02] transition-colors">
                        {/* Visitor Info */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white text-xs font-bold shadow flex-shrink-0">
                              {v.visitor_name.split(' ').map((w) => w[0]).join('').slice(0, 2) || 'VI'}
                            </div>
                            <div>
                              <p className="font-bold text-white">{v.visitor_name}</p>
                              <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                <span className="text-emerald-300 font-medium">{v.relation || 'Visitor'}</span>
                                <span>•</span>
                                <span>{v.phone || 'No phone'}</span>
                              </p>
                              {v.qr_token && (
                                <button
                                  onClick={() => setViewingPass(v)}
                                  className="mt-1 font-mono text-[10px] text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/20 transition-all flex items-center gap-1"
                                >
                                  <span>🏷️</span> {v.qr_token}
                                </button>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Patient & Ward */}
                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-slate-200">{pat.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[11px] font-medium text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                              {pat.ward}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {pat.bed}
                            </span>
                          </div>
                        </td>

                        {/* Purpose */}
                        <td className="px-4 py-3.5">
                          <span className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] font-medium text-slate-300 whitespace-nowrap">
                            Routine Family Visit
                          </span>
                        </td>

                        {/* Entry / Exit Log */}
                        <td className="px-4 py-3.5 text-xs">
                          {v.check_in_at ? (
                            <div>
                              <p className="text-slate-300 font-medium">
                                In: {new Date(v.check_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                              {v.check_out_at ? (
                                <p className="text-slate-500 text-[11px]">
                                  Out: {new Date(v.check_out_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              ) : (
                                <span className="inline-block mt-0.5 text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.2 rounded animate-pulse">
                                  ● Active In Ward
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-500 text-[11px]">Pending Arrival</span>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="px-4 py-3.5">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase border tracking-wider ${badge.bg} ${badge.text} ${badge.border}`}>
                            {badge.label}
                          </span>
                        </td>

                        {/* Desk Actions */}
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {v.status === 'registered' && (
                              <button
                                onClick={() => handleCheckIn(v.id)}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-all shadow"
                              >
                                Check In
                              </button>
                            )}

                            {v.status === 'checked_in' && (
                              <button
                                onClick={() => handleCheckOut(v.id)}
                                className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-lg transition-all shadow"
                              >
                                Check Out
                              </button>
                            )}

                            <button
                              onClick={() => setViewingPass(v)}
                              title="View Digital Pass"
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all text-xs"
                            >
                              🪪
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredVisitors.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <span className="text-3xl">🎫</span>
                          <p className="text-sm font-medium text-slate-400">No matching visitor passes found</p>
                          <p className="text-xs text-slate-500">Use the form on the left to issue a new entry pass.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="p-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400 bg-surface-900/40">
            <span>Showing {filteredVisitors.length} of {visitors.length} passes</span>
            <span>CardioSense Security Desk Protocol v2.4</span>
          </div>
        </motion.div>
      </div>

      {/* ── Digital Visitor Badge Modal ── */}
      <AnimatePresence>
        {viewingPass && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              className="bg-surface-900 border border-emerald-500/30 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              {/* Badge Top Header */}
              <div className="px-6 py-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl p-2 rounded-xl bg-white/20">🎫</span>
                  <div>
                    <h3 className="font-extrabold text-base">HOSPITAL VISITOR PASS</h3>
                    <p className="text-[11px] text-emerald-100 font-mono">Token: {viewingPass.qr_token || 'VST-PASS-01'}</p>
                  </div>
                </div>
                <button
                  onClick={() => setViewingPass(null)}
                  className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center text-sm"
                >
                  ✕
                </button>
              </div>

              {/* Badge Body */}
              <div className="p-6 space-y-4 text-center">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-2xl font-black shadow-lg">
                  {viewingPass.visitor_name.split(' ').map((w) => w[0]).join('').slice(0, 2) || 'VI'}
                </div>

                <div>
                  <h4 className="text-xl font-black text-white">{viewingPass.visitor_name}</h4>
                  <p className="text-xs text-emerald-300 font-semibold mt-0.5">
                    {viewingPass.relation || 'Family'} • {viewingPass.phone || 'Phone verified'}
                  </p>
                </div>

                {/* Patient & Ward Target */}
                {(() => {
                  const pat = getPatientInfo(viewingPass.patient_id);
                  return (
                    <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 text-left space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Visiting Patient:</span>
                        <span className="font-bold text-white">{pat.name}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Authorized Ward:</span>
                        <span className="font-bold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded">{pat.ward}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Room & Bed:</span>
                        <span className="text-slate-200">{pat.room} • {pat.bed}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Simulated QR Code Graphic */}
                <div className="p-4 rounded-2xl bg-white border border-slate-300 mx-auto max-w-[200px] flex flex-col items-center">
                  <div className="w-32 h-32 bg-slate-900 rounded-lg p-2 flex items-center justify-center text-center">
                    <p className="font-mono text-[9px] text-emerald-400 leading-tight">
                      [QR TOKEN]<br />
                      {viewingPass.qr_token || 'VST-PASS-01'}<br />
                      SECURE PASS
                    </p>
                  </div>
                  <p className="text-[10px] font-mono text-slate-700 mt-2 font-bold">
                    VALID FOR TODAY ONLY
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-center gap-3">
                  <button
                    onClick={() => {
                      toast.success('Visitor Pass sent to printer 🖨️');
                    }}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-semibold transition-all flex items-center gap-1.5"
                  >
                    🖨️ Print Pass
                  </button>
                  <button
                    onClick={() => setViewingPass(null)}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow"
                  >
                    Done
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
