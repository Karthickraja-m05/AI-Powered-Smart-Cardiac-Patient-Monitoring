import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { shiftsAPI, authAPI } from '../../services/api';
import type { DoctorShift, NurseShift } from '../../types';
import toast from 'react-hot-toast';

const fadeIn = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };

const SHIFT_TYPES = [
  { key: 'morning',   label: 'Morning',   time: '06:00 – 14:00', icon: '🌅', color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   gradient: 'from-amber-500 to-orange-500' },
  { key: 'afternoon', label: 'Afternoon', time: '14:00 – 22:00', icon: '☀️', color: 'text-cyan-400',    bg: 'bg-cyan-500/10',    border: 'border-cyan-500/20',    gradient: 'from-cyan-500 to-blue-500' },
  { key: 'night',     label: 'Night',     time: '22:00 – 06:00', icon: '🌙', color: 'text-indigo-400',  bg: 'bg-indigo-500/10',  border: 'border-indigo-500/20',  gradient: 'from-indigo-500 to-violet-500' },
];

const MOCK_DOCTOR_SHIFTS: (DoctorShift & { doctor_name?: string })[] = [
  { id: 1, doctor_id: 2, hospital_id: 1, department: 'Cardiology', shift_type: 'morning', shift_date: new Date().toISOString().split('T')[0], start_time: '06:00', end_time: '14:00', is_active: true, checked_in: true, doctor_name: 'Dr. Rajesh Kumar' },
  { id: 2, doctor_id: 3, hospital_id: 1, department: 'Electrophysiology', shift_type: 'afternoon', shift_date: new Date().toISOString().split('T')[0], start_time: '14:00', end_time: '22:00', is_active: true, checked_in: false, doctor_name: 'Dr. Priya Sharma' },
  { id: 3, doctor_id: 11, hospital_id: 1, department: 'Surgery', shift_type: 'morning', shift_date: new Date().toISOString().split('T')[0], start_time: '06:00', end_time: '14:00', is_active: true, checked_in: true, doctor_name: 'Dr. Arun Patel' },
  { id: 4, doctor_id: 8, hospital_id: 1, department: 'Pediatric Cardiology', shift_type: 'night', shift_date: new Date().toISOString().split('T')[0], start_time: '22:00', end_time: '06:00', is_active: true, checked_in: false, doctor_name: 'Dr. Kavitha Nair' },
  { id: 5, doctor_id: 2, hospital_id: 1, department: 'Cardiology', shift_type: 'afternoon', shift_date: new Date(Date.now() + 86400000).toISOString().split('T')[0], start_time: '14:00', end_time: '22:00', is_active: true, checked_in: false, doctor_name: 'Dr. Rajesh Kumar' },
];

const MOCK_NURSE_SHIFTS: (NurseShift & { nurse_name?: string })[] = [
  { id: 1, nurse_id: 4, hospital_id: 1, ward: 'Cardiac ICU', shift_type: 'morning', shift_date: new Date().toISOString().split('T')[0], patient_count: 4, max_patients: 6, is_active: true, checked_in: true, nurse_name: 'Meena Reddy' },
  { id: 2, nurse_id: 5, hospital_id: 1, ward: 'Emergency', shift_type: 'morning', shift_date: new Date().toISOString().split('T')[0], patient_count: 5, max_patients: 8, is_active: true, checked_in: true, nurse_name: 'Suresh Iyer' },
  { id: 3, nurse_id: 12, hospital_id: 1, ward: 'Post-Op Ward', shift_type: 'afternoon', shift_date: new Date().toISOString().split('T')[0], patient_count: 3, max_patients: 6, is_active: true, checked_in: false, nurse_name: 'Divya Menon' },
  { id: 4, nurse_id: 4, hospital_id: 1, ward: 'Cardiac ICU', shift_type: 'night', shift_date: new Date().toISOString().split('T')[0], patient_count: 4, max_patients: 6, is_active: true, checked_in: false, nurse_name: 'Meena Reddy' },
  { id: 5, nurse_id: 5, hospital_id: 1, ward: 'Emergency', shift_type: 'afternoon', shift_date: new Date(Date.now() + 86400000).toISOString().split('T')[0], patient_count: 0, max_patients: 8, is_active: true, checked_in: false, nurse_name: 'Suresh Iyer' },
];

export default function ShiftManagementPage() {
  const [tab, setTab] = useState<'doctors' | 'nurses'>('doctors');
  const [doctorShifts, setDoctorShifts] = useState<(DoctorShift & { doctor_name?: string })[]>([]);
  const [nurseShifts, setNurseShifts] = useState<(NurseShift & { nurse_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    Promise.all([
      shiftsAPI.getAllDoctorShifts().catch(() => ({ data: MOCK_DOCTOR_SHIFTS })),
      shiftsAPI.getAllNurseShifts().catch(() => ({ data: MOCK_NURSE_SHIFTS })),
    ]).then(([dr, nr]) => {
      setDoctorShifts(Array.isArray(dr.data) && dr.data.length > 0 ? dr.data : MOCK_DOCTOR_SHIFTS);
      setNurseShifts(Array.isArray(nr.data) && nr.data.length > 0 ? nr.data : MOCK_NURSE_SHIFTS);
      setLoading(false);
    });
  }, []);

  // Generate 7-day strip
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  const dateStr = selectedDate.toISOString().split('T')[0];

  const filteredDoctorShifts = doctorShifts.filter(s => s.shift_date === dateStr);
  const filteredNurseShifts = nurseShifts.filter(s => s.shift_date === dateStr);

  // Count by shift type
  const countByType = (shifts: { shift_type: string }[]) => {
    return SHIFT_TYPES.map(st => ({
      ...st,
      count: shifts.filter(s => s.shift_type === st.key).length,
    }));
  };

  const shiftCounts = tab === 'doctors' ? countByType(filteredDoctorShifts) : countByType(filteredNurseShifts);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-10 h-10 border-3 border-emerald-400 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <motion.div {...fadeIn} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span className="text-emerald-400">🕐</span> Shift Management Console
          </h1>
          <p className="text-slate-400 text-sm mt-1">Staff scheduling, shift allocation, and attendance tracking</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 text-white text-sm font-semibold hover:from-emerald-500 hover:to-green-500 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
        >
          <span className="text-lg">+</span> Create Shift
        </button>
      </motion.div>

      {/* ── 7-Day Calendar Strip ── */}
      <motion.div {...fadeIn} transition={{ delay: 0.1 }} className="flex gap-2 overflow-x-auto pb-1">
        {days.map((day, i) => {
          const isSelected = day.toISOString().split('T')[0] === dateStr;
          const isToday = day.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
          return (
            <button
              key={i}
              onClick={() => setSelectedDate(day)}
              className={`flex-shrink-0 px-4 py-3 rounded-xl text-center transition-all cursor-pointer min-w-[72px] ${
                isSelected
                  ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                  : 'bg-surface-800/40 border border-white/[0.06] text-slate-400 hover:text-white hover:border-white/10'
              }`}
            >
              <p className="text-[10px] uppercase font-semibold tracking-wider">{day.toLocaleDateString('en', { weekday: 'short' })}</p>
              <p className={`text-lg font-bold mt-0.5 ${isSelected ? 'text-emerald-400' : 'text-white'}`}>{day.getDate()}</p>
              {isToday && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mx-auto mt-1" />}
            </button>
          );
        })}
      </motion.div>

      {/* ── Shift Type Summary Cards ── */}
      <div className="grid grid-cols-3 gap-4">
        {shiftCounts.map((sc, i) => (
          <motion.div key={sc.key} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.05 }}
            className={`${sc.bg} border ${sc.border} rounded-2xl p-4`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-10 h-10 rounded-xl bg-gradient-to-br ${sc.gradient} flex items-center justify-center text-lg shadow-lg`}>{sc.icon}</span>
                <div>
                  <p className={`text-sm font-semibold ${sc.color}`}>{sc.label} Shift</p>
                  <p className="text-[11px] text-slate-500">{sc.time}</p>
                </div>
              </div>
              <p className={`text-2xl font-bold ${sc.color}`}>{sc.count}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Tab Switcher ── */}
      <motion.div {...fadeIn} transition={{ delay: 0.25 }} className="flex gap-2">
        <button onClick={() => setTab('doctors')}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
            tab === 'doctors' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-surface-800/40 text-slate-400 border border-white/[0.06] hover:text-white'
          }`}>
          ⚕️ Doctor Shifts
        </button>
        <button onClick={() => setTab('nurses')}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
            tab === 'nurses' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-surface-800/40 text-slate-400 border border-white/[0.06] hover:text-white'
          }`}>
          💉 Nurse Shifts
        </button>
      </motion.div>

      {/* ── Shift Timetable Grid ── */}
      <motion.div {...fadeIn} transition={{ delay: 0.3 }} className="bg-surface-800/60 backdrop-blur-sm border border-white/[0.06] rounded-2xl overflow-hidden">
        {tab === 'doctors' ? (
          <>
            {/* Doctor shifts header */}
            <div className="grid grid-cols-[1fr_140px_120px_100px_100px_80px] gap-3 px-5 py-3 border-b border-white/[0.06] text-xs text-slate-500 uppercase tracking-wider font-semibold">
              <span>Doctor</span>
              <span>Department</span>
              <span>Shift</span>
              <span className="text-center">Time</span>
              <span className="text-center">Check-in</span>
              <span className="text-center">Status</span>
            </div>
            {filteredDoctorShifts.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <span className="text-3xl block mb-2">📋</span>
                <p>No doctor shifts scheduled for {selectedDate.toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
              </div>
            )}
            {filteredDoctorShifts.map((shift, i) => {
              const stc = SHIFT_TYPES.find(st => st.key === shift.shift_type) || SHIFT_TYPES[0];
              return (
                <motion.div key={shift.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.32 + i * 0.03 }}
                  className="grid grid-cols-[1fr_140px_120px_100px_100px_80px] gap-3 px-5 py-3.5 items-center border-b border-white/[0.03] hover:bg-white/[0.015] transition-colors"
                >
                  <div>
                    <p className="text-sm text-white font-medium">{shift.doctor_name || `Doctor #${shift.doctor_id}`}</p>
                  </div>
                  <p className="text-sm text-slate-300">{shift.department || '—'}</p>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${stc.bg} ${stc.color}`}>
                    {stc.icon} {stc.label}
                  </span>
                  <p className="text-xs text-slate-400 text-center">{shift.start_time} — {shift.end_time}</p>
                  <div className="text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${shift.checked_in ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-500/15 text-slate-400'}`}>
                      {shift.checked_in ? '✓ Checked In' : 'Pending'}
                    </span>
                  </div>
                  <div className="text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${shift.is_active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                      {shift.is_active ? 'Active' : 'Off'}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </>
        ) : (
          <>
            {/* Nurse shifts header */}
            <div className="grid grid-cols-[1fr_120px_120px_100px_120px_80px] gap-3 px-5 py-3 border-b border-white/[0.06] text-xs text-slate-500 uppercase tracking-wider font-semibold">
              <span>Nurse</span>
              <span>Ward</span>
              <span>Shift</span>
              <span className="text-center">Patients</span>
              <span className="text-center">Check-in</span>
              <span className="text-center">Status</span>
            </div>
            {filteredNurseShifts.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <span className="text-3xl block mb-2">📋</span>
                <p>No nurse shifts scheduled for {selectedDate.toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
              </div>
            )}
            {filteredNurseShifts.map((shift, i) => {
              const stc = SHIFT_TYPES.find(st => st.key === shift.shift_type) || SHIFT_TYPES[0];
              return (
                <motion.div key={shift.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.32 + i * 0.03 }}
                  className="grid grid-cols-[1fr_120px_120px_100px_120px_80px] gap-3 px-5 py-3.5 items-center border-b border-white/[0.03] hover:bg-white/[0.015] transition-colors"
                >
                  <p className="text-sm text-white font-medium">{shift.nurse_name || `Nurse #${shift.nurse_id}`}</p>
                  <p className="text-sm text-slate-300">{shift.ward || '—'}</p>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${stc.bg} ${stc.color}`}>
                    {stc.icon} {stc.label}
                  </span>
                  <div className="text-center">
                    <span className="text-sm text-emerald-400 font-semibold">{shift.patient_count}</span>
                    <span className="text-xs text-slate-600"> / {shift.max_patients}</span>
                  </div>
                  <div className="text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${shift.checked_in ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-500/15 text-slate-400'}`}>
                      {shift.checked_in ? '✓ Checked In' : 'Pending'}
                    </span>
                  </div>
                  <div className="text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${shift.is_active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                      {shift.is_active ? 'Active' : 'Off'}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </>
        )}
      </motion.div>

      {/* ── Create Shift Modal ── */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateShiftModal
            tab={tab}
            onClose={() => setShowCreateModal(false)}
            onCreate={(shift) => {
              if (tab === 'doctors') {
                setDoctorShifts(prev => [...prev, { ...shift, id: Date.now(), doctor_id: 2, is_active: true, checked_in: false } as any]);
              } else {
                setNurseShifts(prev => [...prev, { ...shift, id: Date.now(), nurse_id: 4, is_active: true, checked_in: false, patient_count: 0, max_patients: 6 } as any]);
              }
              toast.success('Shift created successfully');
              setShowCreateModal(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ────────────── Create Shift Modal ────────────── */
function CreateShiftModal({ tab, onClose, onCreate }: { tab: 'doctors' | 'nurses'; onClose: () => void; onCreate: (s: any) => void }) {
  const [form, setForm] = useState({
    staff_name: '',
    department: '',
    shift_type: 'morning',
    shift_date: new Date().toISOString().split('T')[0],
  });
  const update = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}
    >
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="bg-surface-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl"
      >
        <div className="border-b border-white/[0.06] p-5 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Create {tab === 'doctors' ? 'Doctor' : 'Nurse'} Shift</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer text-xl">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1">{tab === 'doctors' ? 'Doctor Name' : 'Nurse Name'}</label>
            <input type="text" value={form.staff_name} onChange={e => update('staff_name', e.target.value)} placeholder="Staff member name"
              className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.06] rounded-lg text-white text-sm placeholder-slate-600 focus:outline-none focus:border-emerald-500/40" />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">{tab === 'doctors' ? 'Department' : 'Ward'}</label>
            <input type="text" value={form.department} onChange={e => update('department', e.target.value)} placeholder={tab === 'doctors' ? 'Department' : 'Ward'}
              className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.06] rounded-lg text-white text-sm placeholder-slate-600 focus:outline-none focus:border-emerald-500/40" />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Shift Type</label>
            <div className="flex gap-2">
              {SHIFT_TYPES.map(st => (
                <button key={st.key} onClick={() => update('shift_type', st.key)}
                  className={`flex-1 px-3 py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center justify-center gap-1 ${
                    form.shift_type === st.key ? `${st.bg} ${st.color} border ${st.border}` : 'bg-white/[0.04] text-slate-400 border border-white/[0.06]'
                  }`}>
                  {st.icon} {st.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Date</label>
            <input type="date" value={form.shift_date} onChange={e => update('shift_date', e.target.value)}
              className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.06] rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500/40" />
          </div>
        </div>
        <div className="border-t border-white/[0.06] p-5 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white cursor-pointer">Cancel</button>
          <button onClick={() => onCreate({
            shift_type: form.shift_type,
            shift_date: form.shift_date,
            department: form.department,
            ward: form.department,
            doctor_name: form.staff_name,
            nurse_name: form.staff_name,
            start_time: SHIFT_TYPES.find(s => s.key === form.shift_type)?.time.split(' – ')[0],
            end_time: SHIFT_TYPES.find(s => s.key === form.shift_type)?.time.split(' – ')[1],
          })}
            className="px-5 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-green-600 text-white text-sm font-semibold hover:from-emerald-500 hover:to-green-500 shadow-lg shadow-emerald-500/20 cursor-pointer">
            Create Shift
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
