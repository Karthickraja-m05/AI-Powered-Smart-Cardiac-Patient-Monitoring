import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { hospitalsAPI } from '../../services/api';
import type { Department } from '../../types';
import toast from 'react-hot-toast';

const fadeIn = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };

const MOCK_DEPARTMENTS: (Department & { head_doctor_name?: string; patient_count?: number; staff_count?: number })[] = [
  { id: 1, hospital_id: 1, name: 'Cardiology', code: 'CARD', floor: '3', wing: 'East', bed_count: 48, head_doctor_id: 1, is_active: true, head_doctor_name: 'Dr. Rajesh Kumar', patient_count: 38, staff_count: 12 },
  { id: 2, hospital_id: 1, name: 'Cardiac ICU', code: 'CICU', floor: '4', wing: 'Central', bed_count: 24, head_doctor_id: 2, is_active: true, head_doctor_name: 'Dr. Priya Sharma', patient_count: 22, staff_count: 18 },
  { id: 3, hospital_id: 1, name: 'Cardiac Surgery', code: 'CSUR', floor: '5', wing: 'West', bed_count: 16, head_doctor_id: 3, is_active: true, head_doctor_name: 'Dr. Arun Patel', patient_count: 11, staff_count: 14 },
  { id: 4, hospital_id: 2, name: 'Emergency Medicine', code: 'EMER', floor: '1', wing: 'North', bed_count: 32, head_doctor_id: 4, is_active: true, head_doctor_name: 'Dr. Meena Reddy', patient_count: 28, staff_count: 20 },
  { id: 5, hospital_id: 1, name: 'Cardiac Rehabilitation', code: 'CRHB', floor: '2', wing: 'South', bed_count: 20, head_doctor_id: 5, is_active: true, head_doctor_name: 'Dr. Suresh Iyer', patient_count: 15, staff_count: 8 },
  { id: 6, hospital_id: 3, name: 'Electrophysiology', code: 'ELEP', floor: '6', wing: 'East', bed_count: 12, head_doctor_id: 6, is_active: true, head_doctor_name: 'Dr. Kavitha Nair', patient_count: 9, staff_count: 6 },
  { id: 7, hospital_id: 2, name: 'Interventional Cardiology', code: 'INTC', floor: '3', wing: 'West', bed_count: 18, head_doctor_id: 7, is_active: true, head_doctor_name: 'Dr. Vikram Singh', patient_count: 14, staff_count: 10 },
  { id: 8, hospital_id: 1, name: 'Pediatric Cardiology', code: 'PCAR', floor: '2', wing: 'East', bed_count: 14, head_doctor_id: 8, is_active: false, head_doctor_name: 'Dr. Lakshmi Das', patient_count: 6, staff_count: 5 },
  { id: 9, hospital_id: 3, name: 'Cardiac Diagnostics', code: 'CDIAG', floor: '1', wing: 'Central', bed_count: 8, head_doctor_id: 9, is_active: true, head_doctor_name: 'Dr. Raman Joshi', patient_count: 0, staff_count: 7 },
  { id: 10, hospital_id: 4, name: 'Heart Failure Unit', code: 'HFU', floor: '4', wing: 'South', bed_count: 22, head_doctor_id: 10, is_active: true, head_doctor_name: 'Dr. Anita Gupta', patient_count: 19, staff_count: 11 },
];

type ExtDept = Department & { head_doctor_name?: string; patient_count?: number; staff_count?: number };

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<ExtDept[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [floorFilter, setFloorFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showAddDrawer, setShowAddDrawer] = useState(false);

  useEffect(() => {
    hospitalsAPI.listDepartments(1)
      .then(res => {
        const data = Array.isArray(res.data) && res.data.length > 0 ? res.data : MOCK_DEPARTMENTS;
        setDepartments(data as ExtDept[]);
        setLoading(false);
      })
      .catch(() => { setDepartments(MOCK_DEPARTMENTS); setLoading(false); });
  }, []);

  const floors = [...new Set(departments.map(d => d.floor).filter(Boolean))] as string[];

  const filtered = departments.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase()) ||
                        d.code?.toLowerCase().includes(search.toLowerCase()) ||
                        d.head_doctor_name?.toLowerCase().includes(search.toLowerCase());
    const matchFloor = floorFilter === 'all' || d.floor === floorFilter;
    return matchSearch && matchFloor;
  });

  const totalBeds = departments.reduce((a, d) => a + d.bed_count, 0);
  const totalPatients = departments.reduce((a, d) => a + (d.patient_count || 0), 0);
  const totalStaff = departments.reduce((a, d) => a + (d.staff_count || 0), 0);
  const activeCount = departments.filter(d => d.is_active).length;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-10 h-10 border-3 border-indigo-400 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <motion.div {...fadeIn} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span className="text-indigo-400">🏢</span> Department Directory
          </h1>
          <p className="text-slate-400 text-sm mt-1">Manage clinical departments across all hospitals</p>
        </div>
        <button
          onClick={() => setShowAddDrawer(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold hover:from-indigo-500 hover:to-violet-500 transition-all shadow-lg shadow-indigo-500/20 cursor-pointer"
        >
          <span className="text-lg">+</span> Add Department
        </button>
      </motion.div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Departments', value: departments.length, sub: `${activeCount} active`, icon: '🏢', color: 'text-indigo-400', border: 'border-indigo-500/20', bg: 'bg-indigo-500/10' },
          { label: 'Total Beds', value: totalBeds, sub: 'across all depts', icon: '🛏️', color: 'text-violet-400', border: 'border-violet-500/20', bg: 'bg-violet-500/10' },
          { label: 'Patients', value: totalPatients, sub: 'currently admitted', icon: '👥', color: 'text-purple-400', border: 'border-purple-500/20', bg: 'bg-purple-500/10' },
          { label: 'Staff', value: totalStaff, sub: 'doctors & nurses', icon: '⚕️', color: 'text-fuchsia-400', border: 'border-fuchsia-500/20', bg: 'bg-fuchsia-500/10' },
        ].map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className={`${kpi.bg} border ${kpi.border} rounded-2xl p-4`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{kpi.icon}</span>
              <div>
                <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
                <p className="text-[11px] text-slate-500">{kpi.label} — {kpi.sub}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Search & Floor Filter ── */}
      <motion.div {...fadeIn} transition={{ delay: 0.15 }} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
          <input
            type="text" placeholder="Search departments, codes, or head doctors..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface-800/60 border border-white/[0.06] rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500/40 transition-colors"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFloorFilter('all')}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${floorFilter === 'all' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-surface-800/40 text-slate-400 border border-white/[0.06] hover:text-white'}`}>
            All Floors
          </button>
          {floors.sort().map(f => (
            <button key={f} onClick={() => setFloorFilter(f)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${floorFilter === f ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-surface-800/40 text-slate-400 border border-white/[0.06] hover:text-white'}`}>
              Floor {f}
            </button>
          ))}
        </div>
      </motion.div>

      {/* ── Department Table with Expandable Rows ── */}
      <motion.div {...fadeIn} transition={{ delay: 0.2 }} className="bg-surface-800/60 backdrop-blur-sm border border-white/[0.06] rounded-2xl overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-[1fr_80px_80px_1fr_90px_80px_60px] gap-3 px-5 py-3 border-b border-white/[0.06] text-xs text-slate-500 uppercase tracking-wider font-semibold">
          <span>Department</span>
          <span className="text-center">Floor</span>
          <span className="text-center">Beds</span>
          <span>Head Doctor</span>
          <span className="text-center">Patients</span>
          <span className="text-center">Status</span>
          <span />
        </div>

        {/* Table Rows */}
        {filtered.map((dept, i) => (
          <div key={dept.id}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.22 + i * 0.03 }}
              onClick={() => setExpandedId(expandedId === dept.id ? null : dept.id)}
              className={`grid grid-cols-[1fr_80px_80px_1fr_90px_80px_60px] gap-3 px-5 py-3.5 items-center cursor-pointer transition-all hover:bg-white/[0.02] border-b border-white/[0.03] ${expandedId === dept.id ? 'bg-indigo-500/[0.04]' : ''}`}
            >
              <div>
                <p className="text-sm text-white font-medium">{dept.name}</p>
                <p className="text-[11px] text-slate-500">{dept.code} · {dept.wing} Wing</p>
              </div>
              <p className="text-sm text-slate-300 text-center">{dept.floor || '—'}</p>
              <p className="text-sm text-indigo-400 font-semibold text-center">{dept.bed_count}</p>
              <p className="text-sm text-slate-300 truncate">{dept.head_doctor_name || '—'}</p>
              <div className="text-center">
                <span className="text-sm text-violet-400 font-semibold">{dept.patient_count || 0}</span>
                <span className="text-[11px] text-slate-600"> / {dept.bed_count}</span>
              </div>
              <div className="text-center">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${dept.is_active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                  {dept.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <span className={`text-slate-400 text-sm text-center transition-transform ${expandedId === dept.id ? 'rotate-180' : ''}`}>▾</span>
            </motion.div>

            {/* Expanded Detail */}
            <AnimatePresence>
              {expandedId === dept.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 py-4 bg-indigo-500/[0.03] border-b border-white/[0.04]">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white/[0.03] rounded-xl p-3">
                        <p className="text-[11px] text-slate-500">Wing & Floor</p>
                        <p className="text-sm text-white font-medium mt-1">{dept.wing} Wing, Floor {dept.floor}</p>
                      </div>
                      <div className="bg-white/[0.03] rounded-xl p-3">
                        <p className="text-[11px] text-slate-500">Staff Count</p>
                        <p className="text-sm text-fuchsia-400 font-medium mt-1">{dept.staff_count || 0} members</p>
                      </div>
                      <div className="bg-white/[0.03] rounded-xl p-3">
                        <p className="text-[11px] text-slate-500">Bed Utilization</p>
                        <div className="mt-1">
                          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${dept.bed_count > 0 ? ((dept.patient_count || 0) / dept.bed_count) * 100 : 0}%` }} />
                          </div>
                          <p className="text-[11px] text-indigo-400 mt-1">{dept.bed_count > 0 ? Math.round(((dept.patient_count || 0) / dept.bed_count) * 100) : 0}%</p>
                        </div>
                      </div>
                      <div className="bg-white/[0.03] rounded-xl p-3 flex items-center gap-2">
                        <button
                          onClick={e => { e.stopPropagation(); toast.success(`Editing ${dept.name}`); }}
                          className="flex-1 py-1.5 rounded-lg bg-indigo-500/15 text-indigo-400 text-xs font-semibold hover:bg-indigo-500/25 transition-all cursor-pointer"
                        >Edit</button>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setDepartments(prev => prev.map(d => d.id === dept.id ? { ...d, is_active: !d.is_active } : d));
                            toast.success(`${dept.name} ${dept.is_active ? 'deactivated' : 'activated'}`);
                          }}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${dept.is_active ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25' : 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'}`}
                        >{dept.is_active ? 'Deactivate' : 'Activate'}</button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <span className="text-4xl block mb-3">🏢</span>
            <p>No departments match your search.</p>
          </div>
        )}
      </motion.div>

      {/* ── Add Department Drawer ── */}
      <AnimatePresence>
        {showAddDrawer && <AddDepartmentDrawer onClose={() => setShowAddDrawer(false)} onSave={(d) => {
          setDepartments(prev => [...prev, { ...d, id: Date.now() }]);
          toast.success('Department created successfully');
          setShowAddDrawer(false);
        }} />}
      </AnimatePresence>
    </div>
  );
}

/* ── Add Department Slide-out Drawer ── */
function AddDepartmentDrawer({ onClose, onSave }: { onClose: () => void; onSave: (d: ExtDept) => void }) {
  const [form, setForm] = useState({ name: '', code: '', floor: '', wing: '', bed_count: 0, hospital_id: 1, head_doctor_id: undefined as number | undefined, is_active: true });
  const update = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm" onClick={onClose}
    >
      <motion.div initial={{ x: 400 }} animate={{ x: 0 }} exit={{ x: 400 }} transition={{ type: 'spring', damping: 25 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md bg-surface-900 border-l border-white/10 h-full overflow-y-auto shadow-2xl"
      >
        <div className="sticky top-0 bg-surface-900 border-b border-white/[0.06] p-5 flex items-center justify-between z-10">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-indigo-400">🏢</span> New Department
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors cursor-pointer text-xl">✕</button>
        </div>
        <div className="p-5 space-y-4">
          {[
            { label: 'Department Name', key: 'name', placeholder: 'e.g. Cardiac ICU' },
            { label: 'Code', key: 'code', placeholder: 'e.g. CICU' },
            { label: 'Floor', key: 'floor', placeholder: 'e.g. 3' },
            { label: 'Wing', key: 'wing', placeholder: 'e.g. East' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs text-slate-400 block mb-1">{f.label}</label>
              <input type="text" value={(form as any)[f.key]} onChange={e => update(f.key, e.target.value)} placeholder={f.placeholder}
                className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.06] rounded-lg text-white text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500/40" />
            </div>
          ))}
          <div>
            <label className="text-xs text-slate-400 block mb-1">Bed Count</label>
            <input type="number" value={form.bed_count} onChange={e => update('bed_count', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.06] rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500/40" />
          </div>
        </div>
        <div className="sticky bottom-0 bg-surface-900 border-t border-white/[0.06] p-5 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white cursor-pointer">Cancel</button>
          <button onClick={() => onSave(form as any)}
            className="px-5 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-500/20 cursor-pointer">
            Create Department
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
