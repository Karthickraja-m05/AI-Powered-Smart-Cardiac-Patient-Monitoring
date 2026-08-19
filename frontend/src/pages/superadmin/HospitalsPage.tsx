import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { hospitalsAPI } from '../../services/api';
import type { Hospital } from '../../types';
import toast from 'react-hot-toast';

const fadeIn = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };

const MOCK_HOSPITALS: Hospital[] = [
  { id: 1, name: 'CardioSense Central Hospital', code: 'CSH-001', address: '123 Medical Center Dr', city: 'Chennai', state: 'Tamil Nadu', phone: '+91-44-2815-0000', email: 'admin@cardiosense-central.in', total_beds: 320, icu_beds: 24, emergency_beds: 16, carbon_savings_kg: 1250, is_active: true, created_at: '2024-01-15' },
  { id: 2, name: 'HeartCare Specialty Hospital', code: 'HCS-002', address: '456 Cardiac Ave', city: 'Coimbatore', state: 'Tamil Nadu', phone: '+91-422-2541-000', email: 'admin@heartcare-specialty.in', total_beds: 180, icu_beds: 12, emergency_beds: 8, carbon_savings_kg: 820, is_active: true, created_at: '2024-03-22' },
  { id: 3, name: 'Apollo Cardiac Center', code: 'ACC-003', address: '789 Health Blvd', city: 'Bangalore', state: 'Karnataka', phone: '+91-80-2665-0000', email: 'admin@apollo-cardiac.in', total_beds: 450, icu_beds: 36, emergency_beds: 20, carbon_savings_kg: 2100, is_active: true, created_at: '2023-11-08' },
  { id: 4, name: 'Metro Heart Institute', code: 'MHI-004', address: '321 Pulse Rd', city: 'Hyderabad', state: 'Telangana', phone: '+91-40-2334-0000', email: 'admin@metroheart.in', total_beds: 260, icu_beds: 18, emergency_beds: 12, carbon_savings_kg: 690, is_active: true, created_at: '2024-06-11' },
  { id: 5, name: 'Sunrise Medical Center', code: 'SMC-005', address: '654 Dawn Way', city: 'Madurai', state: 'Tamil Nadu', phone: '+91-452-2680-000', email: 'admin@sunrise-medical.in', total_beds: 140, icu_beds: 8, emergency_beds: 6, carbon_savings_kg: 340, is_active: false, created_at: '2024-08-01' },
  { id: 6, name: 'Fortis Cardiac Wing', code: 'FCW-006', address: '87 Shield Ave', city: 'Mumbai', state: 'Maharashtra', phone: '+91-22-6797-0000', email: 'admin@fortis-cardiac.in', total_beds: 500, icu_beds: 40, emergency_beds: 24, carbon_savings_kg: 3100, is_active: true, created_at: '2023-09-05' },
];

export default function HospitalsPage() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingHospital, setEditingHospital] = useState<Hospital | null>(null);
  const [viewingHospital, setViewingHospital] = useState<Hospital | null>(null);

  useEffect(() => {
    hospitalsAPI.list()
      .then(res => { setHospitals(Array.isArray(res.data) ? res.data : MOCK_HOSPITALS); setLoading(false); })
      .catch(() => { setHospitals(MOCK_HOSPITALS); setLoading(false); });
  }, []);

  const filtered = hospitals.filter(h => {
    const matchesSearch = h.name.toLowerCase().includes(search.toLowerCase()) ||
                          h.city?.toLowerCase().includes(search.toLowerCase()) ||
                          h.code.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? h.is_active : !h.is_active);
    return matchesSearch && matchesStatus;
  });

  const totalBeds = hospitals.reduce((a, h) => a + h.total_beds, 0);
  const totalICU = hospitals.reduce((a, h) => a + h.icu_beds, 0);
  const totalCarbon = hospitals.reduce((a, h) => a + h.carbon_savings_kg, 0);
  const activeCount = hospitals.filter(h => h.is_active).length;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-10 h-10 border-3 border-cyan-400 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <motion.div {...fadeIn} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span className="text-cyan-400">🏥</span> Hospital Fleet Management
          </h1>
          <p className="text-slate-400 text-sm mt-1">Manage and monitor all hospitals in the CardioSense network</p>
        </div>
        <button
          onClick={() => { setEditingHospital(null); setShowAddModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 text-white text-sm font-semibold hover:from-cyan-500 hover:to-teal-500 transition-all shadow-lg shadow-cyan-500/20 cursor-pointer"
        >
          <span className="text-lg">+</span> Add Hospital
        </button>
      </motion.div>

      {/* ── Summary Strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Hospitals', value: hospitals.length, icon: '🏥', accent: 'from-cyan-500/20 to-cyan-600/10', border: 'border-cyan-500/20', text: 'text-cyan-400' },
          { label: 'Total Beds', value: totalBeds.toLocaleString(), icon: '🛏️', accent: 'from-teal-500/20 to-teal-600/10', border: 'border-teal-500/20', text: 'text-teal-400' },
          { label: 'ICU Beds', value: totalICU, icon: '🚨', accent: 'from-red-500/20 to-red-600/10', border: 'border-red-500/20', text: 'text-red-400' },
          { label: 'Carbon Saved', value: `${(totalCarbon / 1000).toFixed(1)}t`, icon: '🌱', accent: 'from-emerald-500/20 to-emerald-600/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
        ].map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className={`bg-gradient-to-br ${kpi.accent} border ${kpi.border} rounded-2xl p-4`}
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl">{kpi.icon}</span>
              <span className={`text-2xl font-bold ${kpi.text}`}>{kpi.value}</span>
            </div>
            <p className="text-xs text-slate-400 mt-2">{kpi.label}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Search & Filter Bar ── */}
      <motion.div {...fadeIn} transition={{ delay: 0.15 }} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
          <input
            type="text"
            placeholder="Search by name, city, or code..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface-800/60 border border-white/[0.06] rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500/40 transition-colors"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'active', 'inactive'] as const).map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer capitalize ${
                statusFilter === status
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'bg-surface-800/40 text-slate-400 border border-white/[0.06] hover:text-white'
              }`}
            >
              {status} {status === 'active' ? `(${activeCount})` : status === 'inactive' ? `(${hospitals.length - activeCount})` : `(${hospitals.length})`}
            </button>
          ))}
        </div>
      </motion.div>

      {/* ── Hospital Card Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((hospital, i) => {
          const occupancyPct = Math.round(60 + Math.random() * 30); // Simulated
          return (
            <motion.div
              key={hospital.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.04 }}
              className="bg-surface-800/60 backdrop-blur-sm border border-white/[0.06] rounded-2xl overflow-hidden hover:border-cyan-500/20 transition-all duration-300 group"
            >
              {/* Card header accent */}
              <div className="h-1 bg-gradient-to-r from-cyan-500 to-teal-500 opacity-60 group-hover:opacity-100 transition-opacity" />
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-semibold text-sm truncate">{hospital.name}</h4>
                    <p className="text-slate-500 text-xs mt-0.5">{hospital.code}</p>
                  </div>
                  <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    hospital.is_active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                  }`}>
                    {hospital.is_active ? '● Active' : '● Inactive'}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-xs text-slate-400 mb-4">
                  <span>📍</span>
                  <span>{hospital.city}, {hospital.state}</span>
                </div>

                {/* Bed breakdown */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="bg-white/[0.03] rounded-lg p-2.5 text-center">
                    <p className="text-sm font-bold text-cyan-400">{hospital.total_beds}</p>
                    <p className="text-[10px] text-slate-500">Total Beds</p>
                  </div>
                  <div className="bg-white/[0.03] rounded-lg p-2.5 text-center">
                    <p className="text-sm font-bold text-red-400">{hospital.icu_beds}</p>
                    <p className="text-[10px] text-slate-500">ICU</p>
                  </div>
                  <div className="bg-white/[0.03] rounded-lg p-2.5 text-center">
                    <p className="text-sm font-bold text-orange-400">{hospital.emergency_beds}</p>
                    <p className="text-[10px] text-slate-500">Emergency</p>
                  </div>
                </div>

                {/* Occupancy bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-400">Occupancy</span>
                    <span className={`font-semibold ${occupancyPct > 85 ? 'text-red-400' : occupancyPct > 70 ? 'text-amber-400' : 'text-emerald-400'}`}>{occupancyPct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${occupancyPct > 85 ? 'bg-red-500' : occupancyPct > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${occupancyPct}%` }}
                    />
                  </div>
                </div>

                {/* Carbon badge */}
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 mb-4">
                  <span>🌱</span>
                  <span>{hospital.carbon_savings_kg.toLocaleString()} kg CO₂ saved</span>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewingHospital(hospital)}
                    className="flex-1 py-2 rounded-lg bg-cyan-500/10 text-cyan-400 text-xs font-semibold hover:bg-cyan-500/20 transition-all cursor-pointer"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => { setEditingHospital(hospital); setShowAddModal(true); }}
                    className="flex-1 py-2 rounded-lg bg-white/[0.04] text-slate-300 text-xs font-semibold hover:bg-white/[0.08] transition-all cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      setHospitals(prev => prev.map(h => h.id === hospital.id ? { ...h, is_active: !h.is_active } : h));
                      toast.success(`${hospital.name} ${hospital.is_active ? 'deactivated' : 'activated'}`);
                    }}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      hospital.is_active ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                    }`}
                  >
                    {hospital.is_active ? '⏸' : '▶'}
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-slate-500">
          <span className="text-4xl block mb-3">🏥</span>
          <p>No hospitals found matching your criteria.</p>
        </div>
      )}

      {/* ── Add / Edit Hospital Modal ── */}
      <AnimatePresence>
        {showAddModal && (
          <HospitalFormModal
            hospital={editingHospital}
            onClose={() => { setShowAddModal(false); setEditingHospital(null); }}
            onSave={(h) => {
              if (editingHospital) {
                setHospitals(prev => prev.map(existing => existing.id === h.id ? h : existing));
                toast.success('Hospital updated successfully');
              } else {
                setHospitals(prev => [...prev, { ...h, id: Date.now(), created_at: new Date().toISOString() }]);
                toast.success('Hospital added successfully');
              }
              setShowAddModal(false);
              setEditingHospital(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* ── View Hospital Detail Modal ── */}
      <AnimatePresence>
        {viewingHospital && (
          <HospitalDetailModal
            hospital={viewingHospital}
            onClose={() => setViewingHospital(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ────────────────────────── Hospital Form Modal ────────────────────────── */
function HospitalFormModal({ hospital, onClose, onSave }: { hospital: Hospital | null; onClose: () => void; onSave: (h: Hospital) => void }) {
  const [form, setForm] = useState({
    name: hospital?.name || '',
    code: hospital?.code || '',
    address: hospital?.address || '',
    city: hospital?.city || '',
    state: hospital?.state || '',
    phone: hospital?.phone || '',
    email: hospital?.email || '',
    total_beds: hospital?.total_beds || 0,
    icu_beds: hospital?.icu_beds || 0,
    emergency_beds: hospital?.emergency_beds || 0,
  });

  const update = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}
    >
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="bg-surface-900 border border-white/10 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl"
      >
        <div className="sticky top-0 bg-surface-900 border-b border-white/[0.06] p-5 flex items-center justify-between z-10">
          <h3 className="text-lg font-bold text-white">{hospital ? 'Edit Hospital' : 'Add New Hospital'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors cursor-pointer text-xl">✕</button>
        </div>
        <div className="p-5 space-y-4">
          {[
            { label: 'Hospital Name', key: 'name', type: 'text', placeholder: 'e.g. CardioSense Central' },
            { label: 'Hospital Code', key: 'code', type: 'text', placeholder: 'e.g. CSH-001' },
            { label: 'Address', key: 'address', type: 'text', placeholder: 'Street address' },
            { label: 'City', key: 'city', type: 'text', placeholder: 'City' },
            { label: 'State', key: 'state', type: 'text', placeholder: 'State' },
            { label: 'Phone', key: 'phone', type: 'text', placeholder: '+91-xxx-xxxx-xxx' },
            { label: 'Email', key: 'email', type: 'email', placeholder: 'admin@hospital.in' },
          ].map(field => (
            <div key={field.key}>
              <label className="text-xs text-slate-400 block mb-1">{field.label}</label>
              <input
                type={field.type}
                value={(form as any)[field.key]}
                onChange={e => update(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.06] rounded-lg text-white text-sm placeholder-slate-600 focus:outline-none focus:border-cyan-500/40"
              />
            </div>
          ))}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total Beds', key: 'total_beds' },
              { label: 'ICU Beds', key: 'icu_beds' },
              { label: 'Emergency', key: 'emergency_beds' },
            ].map(field => (
              <div key={field.key}>
                <label className="text-xs text-slate-400 block mb-1">{field.label}</label>
                <input
                  type="number"
                  value={(form as any)[field.key]}
                  onChange={e => update(field.key, parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.06] rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500/40"
                />
              </div>
            ))}
          </div>
        </div>
        <div className="sticky bottom-0 bg-surface-900 border-t border-white/[0.06] p-5 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white transition-colors cursor-pointer">Cancel</button>
          <button
            onClick={() => onSave({ ...(hospital || {} as Hospital), ...form, carbon_savings_kg: hospital?.carbon_savings_kg || 0, is_active: hospital?.is_active ?? true } as Hospital)}
            className="px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-teal-600 text-white text-sm font-semibold hover:from-cyan-500 hover:to-teal-500 transition-all shadow-lg shadow-cyan-500/20 cursor-pointer"
          >
            {hospital ? 'Save Changes' : 'Add Hospital'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ────────────────────────── Hospital Detail Modal ────────────────────────── */
function HospitalDetailModal({ hospital, onClose }: { hospital: Hospital; onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}
    >
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="bg-surface-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
      >
        <div className="h-1.5 bg-gradient-to-r from-cyan-500 to-teal-500" />
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-bold text-white">{hospital.name}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{hospital.code}</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors cursor-pointer text-xl">✕</button>
          </div>

          <div className="space-y-3">
            {[
              { label: 'Location', value: `${hospital.address || '—'}, ${hospital.city}, ${hospital.state}` },
              { label: 'Phone', value: hospital.phone || '—' },
              { label: 'Email', value: hospital.email || '—' },
              { label: 'Total Beds', value: hospital.total_beds },
              { label: 'ICU Beds', value: hospital.icu_beds },
              { label: 'Emergency Beds', value: hospital.emergency_beds },
              { label: 'Carbon Savings', value: `${hospital.carbon_savings_kg.toLocaleString()} kg CO₂` },
              { label: 'Status', value: hospital.is_active ? '🟢 Active' : '🔴 Inactive' },
              { label: 'Created', value: new Date(hospital.created_at).toLocaleDateString() },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                <span className="text-xs text-slate-500">{row.label}</span>
                <span className="text-sm text-white font-medium">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
