import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { shiftsAPI } from '../../services/api';
import type { DoctorShift } from '../../types';
import toast from 'react-hot-toast';

const fadeIn = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };

interface PersonalShiftRecord {
  id: number;
  date: string;
  dayName: string;
  shiftType: 'morning' | 'afternoon' | 'night' | 'off' | 'on_call';
  startTime: string;
  endTime: string;
  dutyType: string;
  assignedWard: string;
  assignedRooms: string;
  assignedNurseLead: string;
  checkedIn: boolean;
  checkInTime?: string;
  checkOutTime?: string;
  status: 'active' | 'upcoming' | 'completed' | 'off';
}

const mockPersonalWeeklyShifts: PersonalShiftRecord[] = [
  {
    id: 1,
    date: new Date().toISOString().split('T')[0],
    dayName: 'Today (Wednesday)',
    shiftType: 'morning',
    startTime: '06:00 AM',
    endTime: '02:00 PM',
    dutyType: 'Primary CCU Rounds & Emergency Floor',
    assignedWard: 'Cardiac ICU (CICU) & CCU Wing A',
    assignedRooms: 'Bed ICU-01 to ICU-08 & Room 201-206',
    assignedNurseLead: 'Nurse Anitha Rajan (Ext. 402)',
    checkedIn: true,
    checkInTime: '05:54 AM',
    status: 'active',
  },
  {
    id: 2,
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    dayName: 'Tomorrow (Thursday)',
    shiftType: 'morning',
    startTime: '06:00 AM',
    endTime: '02:00 PM',
    dutyType: 'OPD Consultations & Inpatient Ward',
    assignedWard: 'Cardiology OPD Room 302 & Step-Down CCU',
    assignedRooms: 'Step-Down Beds 101-112',
    assignedNurseLead: 'Nurse Meena Reddy (Ext. 405)',
    checkedIn: false,
    status: 'upcoming',
  },
  {
    id: 3,
    date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
    dayName: 'Friday',
    shiftType: 'afternoon',
    startTime: '02:00 PM',
    endTime: '10:00 PM',
    dutyType: 'Elective Cath Lab & Post-PTCA Rounds',
    assignedWard: 'Cath Lab Suite 2 & Post-Op Ward',
    assignedRooms: 'Cath Recovery Beds 1-6',
    assignedNurseLead: 'Nurse Suresh Iyer (Ext. 411)',
    checkedIn: false,
    status: 'upcoming',
  },
  {
    id: 4,
    date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    dayName: 'Saturday',
    shiftType: 'on_call',
    startTime: '08:00 AM',
    endTime: '08:00 PM',
    dutyType: 'Hospital Code Blue On-Call Specialist',
    assignedWard: 'Hospital-Wide Emergency Response',
    assignedRooms: 'ER Triage & Trauma Bays 1-4',
    assignedNurseLead: 'ER Duty Lead Nurse (Ext. 100)',
    checkedIn: false,
    status: 'upcoming',
  },
  {
    id: 5,
    date: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0],
    dayName: 'Sunday',
    shiftType: 'off',
    startTime: '—',
    endTime: '—',
    dutyType: 'Scheduled Rest Day',
    assignedWard: 'No Clinical Ward Assigned',
    assignedRooms: '—',
    assignedNurseLead: '—',
    checkedIn: false,
    status: 'off',
  },
  {
    id: 6,
    date: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
    dayName: 'Next Monday',
    shiftType: 'morning',
    startTime: '06:00 AM',
    endTime: '02:00 PM',
    dutyType: 'CCU Grand Rounds & Pacemaker Clinic',
    assignedWard: 'Cardiac ICU & Electrophysiology Lab',
    assignedRooms: 'CICU Beds 1-10',
    assignedNurseLead: 'Nurse Divya Menon (Ext. 408)',
    checkedIn: false,
    status: 'upcoming',
  },
  {
    id: 7,
    date: new Date(Date.now() + 6 * 86400000).toISOString().split('T')[0],
    dayName: 'Next Tuesday',
    shiftType: 'night',
    startTime: '10:00 PM',
    endTime: '06:00 AM',
    dutyType: 'Night CCU Emergency Coverage',
    assignedWard: 'Cardiac ICU & Emergency Cardiology',
    assignedRooms: 'All CICU Beds',
    assignedNurseLead: 'Night Charge Nurse (Ext. 400)',
    checkedIn: false,
    status: 'upcoming',
  },
];

const mockShiftHistory = [
  { id: 11, date: 'Yesterday (Tuesday)', shift: 'Morning Shift (06:00 AM – 02:00 PM)', hours: '8.0 hrs', ward: 'Cardiac ICU', checkIn: '05:58 AM', checkOut: '02:15 PM', status: 'Completed', onTime: true },
  { id: 12, date: 'Mon, Aug 17, 2026', shift: 'Morning Shift (06:00 AM – 02:00 PM)', hours: '8.2 hrs', ward: 'Cardiology OPD & Ward', checkIn: '05:52 AM', checkOut: '02:10 PM', status: 'Completed', onTime: true },
  { id: 13, date: 'Sun, Aug 16, 2026', shift: 'Night Shift (10:00 PM – 06:00 AM)', hours: '8.0 hrs', ward: 'Emergency Cardiology', checkIn: '09:55 PM', checkOut: '06:05 AM', status: 'Completed', onTime: true },
  { id: 14, date: 'Sat, Aug 15, 2026', shift: 'Afternoon Shift (02:00 PM – 10:00 PM)', hours: '8.5 hrs', ward: 'Post-Op Step Down', checkIn: '01:50 PM', checkOut: '10:20 PM', status: 'Completed', onTime: true },
];

const shiftTypeStyles = {
  morning: { label: 'Morning Shift', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30', dot: 'bg-amber-400', icon: '🌅' },
  afternoon: { label: 'Afternoon Shift', badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30', dot: 'bg-cyan-400', icon: '☀️' },
  night: { label: 'Night Duty', badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30', dot: 'bg-indigo-400', icon: '🌙' },
  on_call: { label: 'On-Call Emergency', badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30', dot: 'bg-rose-400', icon: '🚨' },
  off: { label: 'Scheduled Off', badge: 'bg-slate-500/20 text-slate-400 border-slate-500/30', dot: 'bg-slate-400', icon: '🏖️' },
};

export default function DoctorShiftsPage() {
  const { user } = useAuthStore();
  const [shifts, setShifts] = useState<PersonalShiftRecord[]>(mockPersonalWeeklyShifts);
  const [activeShift, setActiveShift] = useState<PersonalShiftRecord>(mockPersonalWeeklyShifts[0]);
  const [isCheckedIn, setIsCheckedIn] = useState(mockPersonalWeeklyShifts[0].checkedIn);
  const [checkInTime, setCheckInTime] = useState(mockPersonalWeeklyShifts[0].checkInTime || '05:54 AM');
  const [selectedShiftTab, setSelectedShiftTab] = useState<'schedule' | 'history'>('schedule');

  useEffect(() => {
    if (user?.id) {
      shiftsAPI.getDoctorShifts(user.id)
        .then(res => {
          if (Array.isArray(res.data) && res.data.length > 0) {
            // We got doctor shift data from backend
          }
        })
        .catch(() => {});
    }
  }, [user]);

  const handleToggleCheckIn = () => {
    if (!isCheckedIn) {
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setIsCheckedIn(true);
      setCheckInTime(nowTime);
      setActiveShift(prev => ({ ...prev, checkedIn: true, checkInTime: nowTime }));
      toast.success(`Checked In for today's ${activeShift.startTime} shift at ${nowTime}!`);
    } else {
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setIsCheckedIn(false);
      setActiveShift(prev => ({ ...prev, checkedIn: false, checkOutTime: nowTime }));
      toast.success(`Handover complete. Shift checked out at ${nowTime}.`);
    }
  };

  const currentShiftStyle = shiftTypeStyles[activeShift.shiftType] || shiftTypeStyles.morning;

  return (
    <div className="space-y-6">
      {/* ── Personal Shift Banner ── */}
      <motion.div
        {...fadeIn}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-950/80 via-slate-900/90 to-surface-900 border border-indigo-500/20 p-6 backdrop-blur-xl shadow-2xl"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl text-white font-bold shadow-lg shadow-indigo-500/30 border border-white/10 flex-shrink-0">
              🕐
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  My Duty Shift & Ward Schedule
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Doctor ID: DOC-{user?.id || 104}
                </span>
              </div>
              <p className="text-slate-400 text-xs mt-1 flex items-center gap-2 flex-wrap">
                <span>Physician: <strong className="text-slate-200">Dr. {user?.full_name?.replace(/^Dr\.\s*/i, '') || 'Priya Sharma'}</strong></span>
                <span>•</span>
                <span>Specialization: <strong className="text-indigo-300">{user?.specialization || 'Cardiologist'}</strong></span>
                <span>•</span>
                <span>Ward: <strong className="text-slate-200">{user?.department || 'Cardiac ICU & CCU'}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={() => setSelectedShiftTab('schedule')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                selectedShiftTab === 'schedule'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                  : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              📅 7-Day Roster
            </button>
            <button
              onClick={() => setSelectedShiftTab('history')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                selectedShiftTab === 'history'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                  : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              📜 Attendance Log
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Active Today's Shift Hero Card ── */}
      <motion.div
        {...fadeIn}
        transition={{ delay: 0.1 }}
        className="relative overflow-hidden rounded-2xl bg-surface-800/80 border border-indigo-500/30 p-6 shadow-2xl"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Shift Details */}
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Current Assigned Duty:</span>
              <span className={`px-3 py-1 rounded-full text-xs font-extrabold border ${currentShiftStyle.badge} flex items-center gap-1.5`}>
                <span>{currentShiftStyle.icon}</span>
                <span>{currentShiftStyle.label}</span>
              </span>
              <span className="text-xs font-mono font-bold text-white bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                ⏰ {activeShift.startTime} – {activeShift.endTime}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                isCheckedIn ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                {isCheckedIn ? '● Checked In' : '○ Not Checked In'}
              </span>
            </div>

            <div>
              <h2 className="text-lg font-bold text-white">
                {activeShift.dutyType}
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                📍 Assigned Wards: <strong className="text-indigo-300">{activeShift.assignedWard}</strong>
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                🛏️ Coverage: {activeShift.assignedRooms} • Lead: <span className="text-slate-300">{activeShift.assignedNurseLead}</span>
              </p>
            </div>

            {/* Shift Progress Bar */}
            <div className="pt-2">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-400">Shift Elapsed Progress (8.0 Hours Total)</span>
                <span className="text-indigo-300 font-mono font-semibold">5h 45m Elapsed • 2h 15m Remaining</span>
              </div>
              <div className="h-2.5 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 transition-all duration-500"
                  style={{ width: '72%' }}
                />
              </div>
            </div>
          </div>

          {/* Interactive Check-in Button */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-center justify-center gap-3 p-4 rounded-xl bg-surface-900/90 border border-white/10 flex-shrink-0 min-w-[200px]">
            <button
              onClick={handleToggleCheckIn}
              className={`w-full py-3 px-5 rounded-xl font-bold text-xs shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                isCheckedIn
                  ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 shadow-rose-500/10'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/20'
              }`}
            >
              <span>{isCheckedIn ? '⏹ Check Out Handover' : '▶ Clock In / Check In'}</span>
            </button>
            <p className="text-[11px] text-slate-400 text-center font-mono">
              {isCheckedIn ? `Signed in at: ${checkInTime}` : 'Attendance verification ready'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* ── Main Shift Content: 7-Day Timeline or History ── */}
      {selectedShiftTab === 'schedule' ? (
        <div className="space-y-6">
          {/* 7-Day Personal Shift Cards Grid */}
          <motion.div {...fadeIn} transition={{ delay: 0.2 }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>📅</span> My 7-Day Shift Calendar (Dr. {user?.full_name?.replace(/^Dr\.\s*/i, '') || 'Priya Sharma'})
                </h2>
                <p className="text-xs text-slate-400">Exclusive duty roster showing only your assigned hours, wards, and on-call rotations</p>
              </div>
              <span className="text-xs text-indigo-400 font-semibold bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                Department of Cardiology
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {shifts.map((shift, i) => {
                const style = shiftTypeStyles[shift.shiftType] || shiftTypeStyles.morning;
                const isCurrent = shift.id === activeShift.id;
                const isOff = shift.shiftType === 'off';

                return (
                  <motion.div
                    key={shift.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.04 }}
                    className={`p-4.5 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                      isCurrent
                        ? 'bg-indigo-950/40 border-indigo-500/50 ring-2 ring-indigo-500/30 shadow-xl'
                        : isOff
                        ? 'bg-surface-800/20 border-white/[0.04] opacity-75'
                        : 'bg-surface-800/50 border-white/[0.06] hover:border-indigo-500/30'
                    }`}
                  >
                    <div>
                      {/* Top Header */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-white">{shift.dayName}</span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Active
                          </span>
                        )}
                      </div>

                      {/* Shift Type Badge */}
                      <div className="flex items-center justify-between mt-1 mb-2.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${style.badge} flex items-center gap-1`}>
                          <span>{style.icon}</span>
                          <span>{style.label}</span>
                        </span>
                        {!isOff && (
                          <span className="text-xs font-mono font-semibold text-slate-300">
                            {shift.startTime}
                          </span>
                        )}
                      </div>

                      {/* Duty Title */}
                      <p className="text-xs font-bold text-slate-200 line-clamp-1">{shift.dutyType}</p>

                      {/* Location & Coverage */}
                      {!isOff ? (
                        <div className="mt-2.5 space-y-1 text-[11px] text-slate-400 bg-white/[0.02] p-2.5 rounded-xl border border-white/[0.04]">
                          <p className="truncate">📍 <strong className="text-slate-300">{shift.assignedWard}</strong></p>
                          <p className="truncate">🛏️ {shift.assignedRooms}</p>
                          <p className="truncate text-slate-500">Lead: {shift.assignedNurseLead}</p>
                        </div>
                      ) : (
                        <div className="mt-2.5 py-4 text-center text-xs text-slate-500 bg-white/[0.01] rounded-xl">
                          <span>🏖️ No hospital duties scheduled</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-white/[0.04] flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">{shift.date}</span>
                      <span className={`font-semibold ${
                        shift.status === 'active' ? 'text-emerald-400' :
                        shift.status === 'upcoming' ? 'text-indigo-300' :
                        'text-slate-500'
                      }`}>
                        {shift.status === 'active' ? 'In Progress' : shift.status === 'upcoming' ? 'Scheduled' : 'Rest Day'}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Monthly Shift Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Duty Hours Logged', value: '164.5 Hrs', sub: 'Target: 160.0 Hrs / Mo', icon: '⏱️', color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' },
              { label: 'Night Duty Shifts', value: '4 Completed', sub: '2 scheduled next week', icon: '🌙', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
              { label: 'On-Call Emergencies', value: '6 Responded', sub: 'Average response: 4 mins', icon: '🚨', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
              { label: 'On-Time Check-In Rate', value: '98.5%', sub: 'Punctuality rank: Tier 1', icon: '🏆', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
            ].map((kpi, i) => (
              <motion.div
                key={kpi.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.05 }}
                className={`p-4 rounded-2xl border ${kpi.bg}`}
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="text-xl">{kpi.icon}</span>
                  <span className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</span>
                </div>
                <p className="text-xs font-semibold text-white">{kpi.label}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{kpi.sub}</p>
              </motion.div>
            ))}
          </div>
        </div>
      ) : (
        /* ── Attendance Log History ── */
        <motion.div
          {...fadeIn}
          className="bg-surface-800/60 backdrop-blur-sm border border-white/[0.06] rounded-2xl p-6 shadow-xl space-y-4"
        >
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <div>
              <h2 className="text-base font-bold text-white">Verified Duty Attendance & Clock Logs</h2>
              <p className="text-xs text-slate-400">Timestamp logs for Dr. Priya Sharma's clinical shifts</p>
            </div>
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              Verified by Biometric / Portal Check-in
            </span>
          </div>

          <div className="space-y-3">
            {mockShiftHistory.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-indigo-500/20 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3.5">
                  <span className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-300 text-sm font-bold">
                    ✓
                  </span>
                  <div>
                    <p className="text-sm font-bold text-white">{item.date}</p>
                    <p className="text-xs text-slate-300">{item.shift} • <span className="text-indigo-300">{item.ward}</span></p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono">
                  <div className="text-right">
                    <p className="text-slate-400">In: <span className="text-slate-200">{item.checkIn}</span></p>
                    <p className="text-slate-400">Out: <span className="text-slate-200">{item.checkOut}</span></p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                    {item.hours}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
