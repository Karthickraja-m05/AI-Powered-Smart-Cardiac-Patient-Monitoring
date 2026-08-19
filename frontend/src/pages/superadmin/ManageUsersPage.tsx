import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { authAPI } from '../../services/api';
import type { User, UserRole } from '../../types';
import toast from 'react-hot-toast';

const fadeIn = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };

const ROLE_CONFIG: Record<string, { label: string; icon: string; color: string; bg: string; border: string }> = {
  super_admin:    { label: 'Super Admin',    icon: '🛡️', color: 'text-amber-400',   bg: 'bg-amber-500/15',   border: 'border-amber-500/30' },
  hospital_admin: { label: 'Hospital Admin', icon: '🏥', color: 'text-cyan-400',    bg: 'bg-cyan-500/15',    border: 'border-cyan-500/30' },
  doctor:         { label: 'Doctor',         icon: '⚕️', color: 'text-blue-400',    bg: 'bg-blue-500/15',    border: 'border-blue-500/30' },
  nurse:          { label: 'Nurse',          icon: '💉', color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30' },
  receptionist:   { label: 'Receptionist',   icon: '🖥️', color: 'text-violet-400',  bg: 'bg-violet-500/15',  border: 'border-violet-500/30' },
  patient:        { label: 'Patient',        icon: '👤', color: 'text-slate-400',   bg: 'bg-slate-500/15',   border: 'border-slate-500/30' },
  caregiver:      { label: 'Caregiver',      icon: '🤝', color: 'text-pink-400',    bg: 'bg-pink-500/15',    border: 'border-pink-500/30' },
};

const MOCK_USERS: User[] = [
  { id: 1, username: 'superadmin', email: 'superadmin@cardiosense.ai', full_name: 'System Administrator', role: 'super_admin', phone: '+91-9000000001', is_active: true, created_at: '2024-01-01', department: 'Administration' },
  { id: 2, username: 'dr.rajesh', email: 'rajesh@cardiosense.ai', full_name: 'Dr. Rajesh Kumar', role: 'doctor', phone: '+91-9000000002', specialization: 'Interventional Cardiology', department: 'Cardiology', is_active: true, created_at: '2024-01-15', experience_years: 12 },
  { id: 3, username: 'dr.priya', email: 'priya@cardiosense.ai', full_name: 'Dr. Priya Sharma', role: 'doctor', phone: '+91-9000000003', specialization: 'Cardiac Electrophysiology', department: 'Electrophysiology', is_active: true, created_at: '2024-02-01', experience_years: 8 },
  { id: 4, username: 'nurse.meena', email: 'meena@cardiosense.ai', full_name: 'Meena Reddy', role: 'nurse', phone: '+91-9000000004', department: 'Cardiac ICU', is_active: true, created_at: '2024-02-15' },
  { id: 5, username: 'nurse.suresh', email: 'suresh@cardiosense.ai', full_name: 'Suresh Iyer', role: 'nurse', phone: '+91-9000000005', department: 'Emergency', is_active: true, created_at: '2024-03-01' },
  { id: 6, username: 'reception.anita', email: 'anita@cardiosense.ai', full_name: 'Anita Gupta', role: 'receptionist', phone: '+91-9000000006', department: 'Front Desk', is_active: true, created_at: '2024-03-15' },
  { id: 7, username: 'hadmin.vikram', email: 'vikram@cardiosense.ai', full_name: 'Vikram Singh', role: 'hospital_admin', phone: '+91-9000000007', department: 'Administration', is_active: true, created_at: '2024-01-10' },
  { id: 8, username: 'dr.kavitha', email: 'kavitha@cardiosense.ai', full_name: 'Dr. Kavitha Nair', role: 'doctor', phone: '+91-9000000008', specialization: 'Pediatric Cardiology', department: 'Pediatric Cardiology', is_active: false, created_at: '2024-04-01', experience_years: 6 },
  { id: 9, username: 'patient.ravi', email: 'ravi@gmail.com', full_name: 'Ravi Chandran', role: 'patient', phone: '+91-9000000009', is_active: true, created_at: '2024-05-01' },
  { id: 10, username: 'caregiver.lakshmi', email: 'lakshmi@gmail.com', full_name: 'Lakshmi Das', role: 'caregiver', phone: '+91-9000000010', is_active: true, created_at: '2024-05-15', caregiver_relation: 'Daughter' },
  { id: 11, username: 'dr.arun', email: 'arun@cardiosense.ai', full_name: 'Dr. Arun Patel', role: 'doctor', phone: '+91-9000000011', specialization: 'Cardiac Surgery', department: 'Surgery', is_active: true, created_at: '2024-01-20', experience_years: 15 },
  { id: 12, username: 'nurse.divya', email: 'divya@cardiosense.ai', full_name: 'Divya Menon', role: 'nurse', phone: '+91-9000000012', department: 'Post-Op Ward', is_active: true, created_at: '2024-06-01' },
];

export default function ManageUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  useEffect(() => {
    authAPI.getUsers()
      .then(res => { setUsers(Array.isArray(res.data) && res.data.length > 0 ? res.data : MOCK_USERS); setLoading(false); })
      .catch(() => { setUsers(MOCK_USERS); setLoading(false); });
  }, []);

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    users.forEach(u => { counts[u.role] = (counts[u.role] || 0) + 1; });
    return counts;
  }, [users]);

  const filtered = users.filter(u => {
    const matchSearch = u.full_name.toLowerCase().includes(search.toLowerCase()) ||
                        u.email.toLowerCase().includes(search.toLowerCase()) ||
                        u.username.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-10 h-10 border-3 border-rose-400 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <motion.div {...fadeIn} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span className="text-rose-400">👤</span> User Administration
          </h1>
          <p className="text-slate-400 text-sm mt-1">Manage all users, roles, and permissions across the platform</p>
        </div>
        <button
          onClick={() => { setEditingUser(null); setShowAddModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 text-white text-sm font-semibold hover:from-rose-500 hover:to-pink-500 transition-all shadow-lg shadow-rose-500/20 cursor-pointer"
        >
          <span className="text-lg">+</span> Add User
        </button>
      </motion.div>

      {/* ── Role Summary Chips ── */}
      <motion.div {...fadeIn} transition={{ delay: 0.1 }} className="flex flex-wrap gap-2">
        <button
          onClick={() => setRoleFilter('all')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
            roleFilter === 'all' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-surface-800/40 text-slate-400 border border-white/[0.06] hover:text-white'
          }`}
        >
          All Users ({users.length})
        </button>
        {Object.entries(ROLE_CONFIG).map(([role, cfg]) => (
          <button
            key={role}
            onClick={() => setRoleFilter(role)}
            className={`px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              roleFilter === role ? `${cfg.bg} ${cfg.color} border ${cfg.border}` : 'bg-surface-800/40 text-slate-400 border border-white/[0.06] hover:text-white'
            }`}
          >
            <span>{cfg.icon}</span>
            <span>{cfg.label}</span>
            <span className="text-[10px] opacity-70">({roleCounts[role] || 0})</span>
          </button>
        ))}
      </motion.div>

      {/* ── Search ── */}
      <motion.div {...fadeIn} transition={{ delay: 0.15 }}>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
          <input
            type="text" placeholder="Search by name, email, or username..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface-800/60 border border-white/[0.06] rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-rose-500/40 transition-colors"
          />
        </div>
      </motion.div>

      {/* ── Users Table ── */}
      <motion.div {...fadeIn} transition={{ delay: 0.2 }} className="bg-surface-800/60 backdrop-blur-sm border border-white/[0.06] rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_140px_1fr_120px_80px_100px] gap-3 px-5 py-3 border-b border-white/[0.06] text-xs text-slate-500 uppercase tracking-wider font-semibold">
          <span>User</span>
          <span>Role</span>
          <span>Department</span>
          <span className="text-center">Status</span>
          <span className="text-center">Actions</span>
          <span />
        </div>

        {/* Rows */}
        {filtered.map((user, i) => {
          const rc = ROLE_CONFIG[user.role] || ROLE_CONFIG.patient;
          return (
            <motion.div
              key={user.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.22 + i * 0.02 }}
              className="grid grid-cols-[1fr_140px_1fr_120px_80px_100px] gap-3 px-5 py-3.5 items-center border-b border-white/[0.03] hover:bg-white/[0.015] transition-colors"
            >
              {/* User info */}
              <div className="min-w-0">
                <p className="text-sm text-white font-medium truncate">{user.full_name}</p>
                <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
              </div>

              {/* Role badge */}
              <div>
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${rc.bg} ${rc.color}`}>
                  {rc.icon} {rc.label}
                </span>
              </div>

              {/* Department */}
              <p className="text-sm text-slate-300 truncate">{user.department || user.specialization || '—'}</p>

              {/* Status */}
              <div className="text-center">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${user.is_active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                  {user.is_active ? '● Active' : '● Inactive'}
                </span>
              </div>

              {/* Edit */}
              <div className="text-center">
                <button
                  onClick={() => { setEditingUser(user); setShowAddModal(true); }}
                  className="px-3 py-1.5 rounded-lg bg-white/[0.04] text-slate-300 text-xs font-medium hover:bg-white/[0.08] transition-all cursor-pointer"
                >Edit</button>
              </div>

              {/* Toggle */}
              <div className="text-center">
                <button
                  onClick={() => {
                    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: !u.is_active } : u));
                    toast.success(`${user.full_name} ${user.is_active ? 'deactivated' : 'activated'}`);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    user.is_active ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                  }`}
                >
                  {user.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </motion.div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <span className="text-4xl block mb-3">👤</span>
            <p>No users found.</p>
          </div>
        )}
      </motion.div>

      {/* ── Add / Edit User Modal ── */}
      <AnimatePresence>
        {showAddModal && (
          <UserFormModal
            user={editingUser}
            onClose={() => { setShowAddModal(false); setEditingUser(null); }}
            onSave={(u) => {
              if (editingUser) {
                setUsers(prev => prev.map(existing => existing.id === u.id ? u : existing));
                toast.success('User updated');
              } else {
                setUsers(prev => [...prev, { ...u, id: Date.now(), created_at: new Date().toISOString() }]);
                toast.success('User created');
              }
              setShowAddModal(false);
              setEditingUser(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ────────────────────────── User Form Modal ────────────────────────── */
function UserFormModal({ user, onClose, onSave }: { user: User | null; onClose: () => void; onSave: (u: User) => void }) {
  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    username: user?.username || '',
    email: user?.email || '',
    phone: user?.phone || '',
    role: (user?.role || 'doctor') as UserRole,
    specialization: user?.specialization || '',
    department: user?.department || '',
    is_active: user?.is_active ?? true,
  });
  const update = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  const roles: UserRole[] = ['super_admin', 'hospital_admin', 'doctor', 'nurse', 'receptionist', 'patient', 'caregiver'];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}
    >
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="bg-surface-900 border border-white/10 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl"
      >
        <div className="sticky top-0 bg-surface-900 border-b border-white/[0.06] p-5 flex items-center justify-between z-10">
          <h3 className="text-lg font-bold text-white">{user ? 'Edit User' : 'Add New User'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors cursor-pointer text-xl">✕</button>
        </div>
        <div className="p-5 space-y-4">
          {[
            { label: 'Full Name', key: 'full_name', type: 'text', placeholder: 'Dr. John Doe' },
            { label: 'Username', key: 'username', type: 'text', placeholder: 'dr.john' },
            { label: 'Email', key: 'email', type: 'email', placeholder: 'john@cardiosense.ai' },
            { label: 'Phone', key: 'phone', type: 'text', placeholder: '+91-9000000000' },
            { label: 'Specialization', key: 'specialization', type: 'text', placeholder: 'Cardiology' },
            { label: 'Department', key: 'department', type: 'text', placeholder: 'Cardiac ICU' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs text-slate-400 block mb-1">{f.label}</label>
              <input type={f.type} value={(form as any)[f.key]} onChange={e => update(f.key, e.target.value)} placeholder={f.placeholder}
                className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.06] rounded-lg text-white text-sm placeholder-slate-600 focus:outline-none focus:border-rose-500/40" />
            </div>
          ))}
          <div>
            <label className="text-xs text-slate-400 block mb-1">Role</label>
            <div className="flex flex-wrap gap-2">
              {roles.map(r => {
                const rc = ROLE_CONFIG[r];
                return (
                  <button key={r} onClick={() => update('role', r)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all flex items-center gap-1 ${
                      form.role === r ? `${rc.bg} ${rc.color} border ${rc.border}` : 'bg-white/[0.04] text-slate-400 border border-white/[0.06] hover:text-white'
                    }`}>
                    {rc.icon} {rc.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="sticky bottom-0 bg-surface-900 border-t border-white/[0.06] p-5 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white cursor-pointer">Cancel</button>
          <button onClick={() => onSave({ ...(user || {} as User), ...form } as User)}
            className="px-5 py-2 rounded-lg bg-gradient-to-r from-rose-600 to-pink-600 text-white text-sm font-semibold hover:from-rose-500 hover:to-pink-500 shadow-lg shadow-rose-500/20 cursor-pointer">
            {user ? 'Save Changes' : 'Create User'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
