import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { patientsAPI } from '../services/api';
import type { Patient } from '../types';

const riskBadge = (level?: string) => {
  const map: Record<string, string> = {
    critical: 'vital-badge-red',
    high: 'vital-badge-red',
    medium: 'vital-badge-yellow',
    low: 'vital-badge-green',
  };
  return map[level || ''] || 'vital-badge-blue';
};

const statusBadge = (status?: string) => {
  const map: Record<string, { class: string; label: string }> = {
    admitted: { class: 'vital-badge-blue', label: 'Admitted' },
    icu: { class: 'vital-badge-red', label: 'ICU' },
    emergency: { class: 'vital-badge-red', label: 'Emergency' },
    discharged: { class: 'vital-badge-green', label: 'Discharged' },
    outpatient: { class: 'vital-badge-yellow', label: 'Outpatient' },
  };
  return map[status || ''] || { class: 'vital-badge-blue', label: status || 'Unknown' };
};

export default function PatientList() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const navigate = useNavigate();

  // Create form state
  const [form, setForm] = useState({
    first_name: '', last_name: '', age: 50, gender: 'Male',
    ward: '', bed_number: '', phone: '', admission_reason: '',
    has_hypertension: false, has_diabetes: false, has_previous_heart_disease: false, is_smoker: false,
  });

  useEffect(() => { loadPatients(); }, [page, search]);

  async function loadPatients() {
    setLoading(true);
    try {
      const { data } = await patientsAPI.list({ query: search, page, per_page: 20 });
      setPatients(data.patients);
      setTotal(data.total);
    } catch { toast.error('Failed to load patients'); }
    finally { setLoading(false); }
  }

  async function createPatient() {
    if (!form.first_name || !form.last_name) {
      toast.error('Name is required');
      return;
    }
    try {
      await patientsAPI.create(form);
      toast.success('Patient created!');
      setShowCreateModal(false);
      setForm({ first_name: '', last_name: '', age: 50, gender: 'Male', ward: '', bed_number: '', phone: '', admission_reason: '', has_hypertension: false, has_diabetes: false, has_previous_heart_disease: false, is_smoker: false });
      loadPatients();
    } catch { toast.error('Failed to create patient'); }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="page-header flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Patient Management</h1>
          <p className="text-sm text-slate-400">{total} patient{total !== 1 ? 's' : ''} registered</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary">
          ➕ Add Patient
        </button>
      </div>

      {/* Search */}
      <div className="max-w-md">
        <input
          id="patient-search"
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="input-field"
          placeholder="🔍 Search by name, ID, phone, ward, bed..."
        />
      </div>

      {/* Patient Table */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="table-header text-left px-4 py-3">Patient</th>
                <th className="table-header text-left px-4 py-3">ID</th>
                <th className="table-header text-left px-4 py-3">Age / Gender</th>
                <th className="table-header text-left px-4 py-3">Ward / Bed</th>
                <th className="table-header text-left px-4 py-3">Status</th>
                <th className="table-header text-left px-4 py-3">Risk Level</th>
                <th className="table-header text-left px-4 py-3">Risk Score</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-500">Loading...</td></tr>
              ) : patients.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-500">No patients found</td></tr>
              ) : (
                patients.map((p, i) => {
                  const sb = statusBadge(p.status);
                  return (
                    <motion.tr
                      key={p.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="table-row cursor-pointer"
                      onClick={() => navigate(`/patients/${p.id}`)}
                    >
                      <td className="table-cell font-semibold text-white">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-emerald-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {p.first_name[0]}{p.last_name[0]}
                          </div>
                          {p.first_name} {p.last_name}
                        </div>
                      </td>
                      <td className="table-cell font-mono text-xs text-slate-400">{p.patient_uid}</td>
                      <td className="table-cell">{p.age || '—'} / {p.gender}</td>
                      <td className="table-cell">
                        {p.ward || '—'}
                        {p.bed_number && <span className="text-slate-500"> / {p.bed_number}</span>}
                      </td>
                      <td className="table-cell"><span className={sb.class}>{sb.label}</span></td>
                      <td className="table-cell">
                        {p.current_risk_level ? (
                          <span className={riskBadge(p.current_risk_level)}>
                            {p.current_risk_level.toUpperCase()}
                          </span>
                        ) : (
                          <span className="text-slate-500 text-xs">—</span>
                        )}
                      </td>
                      <td className="table-cell font-mono">
                        {p.current_risk_score != null ? `${p.current_risk_score}%` : '—'}
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 20 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
            <button className="btn-secondary text-xs" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
            <span className="text-xs text-slate-400">Page {page} of {Math.ceil(total / 20)}</span>
            <button className="btn-secondary text-xs" disabled={page * 20 >= total} onClick={() => setPage(page + 1)}>Next →</button>
          </div>
        )}
      </motion.div>

      {/* Create Patient Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card w-full max-w-lg max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <h3 className="text-lg font-semibold">➕ Add New Patient</h3>
              <button onClick={() => setShowCreateModal(false)} className="btn-icon">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">First Name *</label>
                  <input className="input-field" value={form.first_name} onChange={(e) => setForm({...form, first_name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Last Name *</label>
                  <input className="input-field" value={form.last_name} onChange={(e) => setForm({...form, last_name: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Age</label>
                  <input type="number" className="input-field" value={form.age} onChange={(e) => setForm({...form, age: +e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Gender</label>
                  <select className="input-field" value={form.gender} onChange={(e) => setForm({...form, gender: e.target.value})}>
                    <option>Male</option><option>Female</option><option>Other</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Ward</label>
                  <input className="input-field" value={form.ward} onChange={(e) => setForm({...form, ward: e.target.value})} placeholder="e.g. Cardiology" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Bed Number</label>
                  <input className="input-field" value={form.bed_number} onChange={(e) => setForm({...form, bed_number: e.target.value})} placeholder="e.g. 1A" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Phone</label>
                <input className="input-field" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Admission Reason</label>
                <textarea className="input-field h-20 resize-none" value={form.admission_reason} onChange={(e) => setForm({...form, admission_reason: e.target.value})} />
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                {(['has_hypertension', 'has_diabetes', 'has_previous_heart_disease', 'is_smoker'] as const).map((key) => (
                  <label key={key} className="flex items-center gap-2 text-slate-300">
                    <input type="checkbox" checked={form[key]} onChange={(e) => setForm({...form, [key]: e.target.checked})}
                      className="rounded border-white/20 bg-surface-900 text-brand-500 focus:ring-brand-500/30" />
                    {key.replace(/_/g, ' ').replace('has ', '').replace('is ', '')}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-white/5">
              <button className="btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={createPatient}>Create Patient</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
