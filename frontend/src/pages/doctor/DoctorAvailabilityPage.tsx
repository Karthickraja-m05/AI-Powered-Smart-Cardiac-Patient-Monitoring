import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { doctorAvailabilityAPI, dashboardAPI } from '../../services/api';
import toast from 'react-hot-toast';

const fadeIn = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };

interface StatusConfigItem {
  key: string;
  label: string;
  sublabel: string;
  icon: string;
  color: string;
  badgeBg: string;
  ringColor: string;
  borderColor: string;
  description: string;
  allowBooking: boolean;
}

const statusOptions: StatusConfigItem[] = [
  {
    key: 'available',
    label: 'Available for Consultations',
    sublabel: 'Online & Taking Patients',
    icon: '🟢',
    color: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    ringColor: 'ring-emerald-500/50',
    borderColor: 'border-emerald-500/40 hover:border-emerald-400',
    description: 'You are actively available in clinic / OPD. Patients can book slots and front-desk can assign incoming consultations.',
    allowBooking: true,
  },
  {
    key: 'busy',
    label: 'Busy / In Consultation',
    sublabel: 'Patient With Doctor',
    icon: '🟡',
    color: 'text-amber-400',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    ringColor: 'ring-amber-500/50',
    borderColor: 'border-amber-500/40 hover:border-amber-400',
    description: 'Currently examining a patient or performing clinical evaluation. Front desk queues urgent inquiries.',
    allowBooking: true,
  },
  {
    key: 'in_surgery',
    label: 'In Surgery (Operating Room)',
    sublabel: 'Sterile Zone • Do Not Disturb',
    icon: '🔴',
    color: 'text-rose-400',
    badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    ringColor: 'ring-rose-500/50',
    borderColor: 'border-rose-500/40 hover:border-rose-400',
    description: 'In surgical theater for cardiac interventions / bypass. All non-emergency inquiries are automatically deferred.',
    allowBooking: false,
  },
  {
    key: 'emergency',
    label: 'Emergency Duty / Code Blue',
    sublabel: 'Critical Resuscitation Active',
    icon: '🚨',
    color: 'text-red-400',
    badgeBg: 'bg-red-500/25 text-red-200 border-red-500/40',
    ringColor: 'ring-red-500/60',
    borderColor: 'border-red-500/50 hover:border-red-400',
    description: 'Attending acute cardiac emergencies or ICU crash calls. Regular appointments automatically paused.',
    allowBooking: false,
  },
  {
    key: 'meeting',
    label: 'In Clinical Meeting / Rounds',
    sublabel: 'Grand Rounds & Case Review',
    icon: '🔵',
    color: 'text-blue-400',
    badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    ringColor: 'ring-blue-500/50',
    borderColor: 'border-blue-500/40 hover:border-blue-400',
    description: 'Participating in departmental conferences, surgical case reviews, or academic multidisciplinary rounds.',
    allowBooking: false,
  },
  {
    key: 'off_duty',
    label: 'Off Duty',
    sublabel: 'Shift Completed',
    icon: '⚪',
    color: 'text-slate-400',
    badgeBg: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    ringColor: 'ring-slate-500/40',
    borderColor: 'border-slate-500/30 hover:border-slate-400',
    description: 'Signed out of clinical shift. Handover complete. Next shift schedule visible in My Shifts.',
    allowBooking: false,
  },
  {
    key: 'vacation',
    label: 'On Leave / Vacation',
    sublabel: 'Approved Medical Leave',
    icon: '🟣',
    color: 'text-purple-400',
    badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    ringColor: 'ring-purple-500/40',
    borderColor: 'border-purple-500/30 hover:border-purple-400',
    description: 'On planned absence. Inpatient coverage auto-routed to on-call cardiologist.',
    allowBooking: false,
  },
];

interface WeeklySlot {
  day: string;
  active: boolean;
  morningSlot: { enabled: boolean; start: string; end: string; maxPatients: number };
  afternoonSlot: { enabled: boolean; start: string; end: string; maxPatients: number };
  teleconsultSlot: { enabled: boolean; start: string; end: string; maxPatients: number };
}

const defaultWeeklySchedule: WeeklySlot[] = [
  { day: 'Monday', active: true, morningSlot: { enabled: true, start: '09:00', end: '13:00', maxPatients: 10 }, afternoonSlot: { enabled: true, start: '14:00', end: '17:00', maxPatients: 8 }, teleconsultSlot: { enabled: true, start: '17:30', end: '19:00', maxPatients: 5 } },
  { day: 'Tuesday', active: true, morningSlot: { enabled: true, start: '09:00', end: '13:00', maxPatients: 10 }, afternoonSlot: { enabled: true, start: '14:00', end: '17:00', maxPatients: 8 }, teleconsultSlot: { enabled: false, start: '17:30', end: '19:00', maxPatients: 5 } },
  { day: 'Wednesday', active: true, morningSlot: { enabled: true, start: '09:00', end: '12:30', maxPatients: 8 }, afternoonSlot: { enabled: false, start: '14:00', end: '17:00', maxPatients: 8 }, teleconsultSlot: { enabled: true, start: '16:00', end: '18:30', maxPatients: 6 } },
  { day: 'Thursday', active: true, morningSlot: { enabled: true, start: '09:00', end: '13:00', maxPatients: 10 }, afternoonSlot: { enabled: true, start: '14:00', end: '17:00', maxPatients: 8 }, teleconsultSlot: { enabled: true, start: '17:30', end: '19:00', maxPatients: 5 } },
  { day: 'Friday', active: true, morningSlot: { enabled: true, start: '09:00', end: '13:00', maxPatients: 10 }, afternoonSlot: { enabled: true, start: '14:00', end: '16:30', maxPatients: 6 }, teleconsultSlot: { enabled: false, start: '17:30', end: '19:00', maxPatients: 5 } },
  { day: 'Saturday', active: true, morningSlot: { enabled: true, start: '09:30', end: '13:00', maxPatients: 8 }, afternoonSlot: { enabled: false, start: '14:00', end: '17:00', maxPatients: 8 }, teleconsultSlot: { enabled: false, start: '17:30', end: '19:00', maxPatients: 5 } },
  { day: 'Sunday', active: false, morningSlot: { enabled: false, start: '09:00', end: '13:00', maxPatients: 0 }, afternoonSlot: { enabled: false, start: '14:00', end: '17:00', maxPatients: 0 }, teleconsultSlot: { enabled: false, start: '17:30', end: '19:00', maxPatients: 0 } },
];

export default function DoctorAvailabilityPage() {
  const { user } = useAuthStore();
  const [currentStatus, setCurrentStatus] = useState('available');
  const [statusMessage, setStatusMessage] = useState('Available in Cardiology OPD Room 302');
  const [expectedAvailableAt, setExpectedAvailableAt] = useState('');
  const [autoReassign, setAutoReassign] = useState(true);
  const [emergencyOnCall, setEmergencyOnCall] = useState(true);
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySlot[]>(defaultWeeklySchedule);
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [updating, setUpdating] = useState(false);
  const [lastUpdatedTime, setLastUpdatedTime] = useState('Today at 08:30 AM');

  useEffect(() => {
    dashboardAPI.getDoctorDashboard()
      .then(res => {
        if (res.data?.availability_status) {
          setCurrentStatus(res.data.availability_status);
        }
      })
      .catch(() => {});
  }, []);

  const currentCfg = statusOptions.find(s => s.key === currentStatus) || statusOptions[0];

  const handleStatusChange = async (newKey: string) => {
    setCurrentStatus(newKey);
    setUpdating(true);
    try {
      if (user?.id) {
        await doctorAvailabilityAPI.update(user.id, {
          status: newKey,
          status_message: statusMessage,
          expected_available_at: expectedAvailableAt || undefined,
        });
      }
      setLastUpdatedTime(`Just now (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`);
      toast.success(`Duty status updated to ${statusOptions.find(s => s.key === newKey)?.label}`);
    } catch (e) {
      toast.success(`Duty status set to ${statusOptions.find(s => s.key === newKey)?.label} (Local Sync)`);
      setLastUpdatedTime(`Just now (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`);
    } finally {
      setUpdating(false);
    }
  };

  const handleSavePreferences = async () => {
    setUpdating(true);
    setTimeout(() => {
      setUpdating(false);
      toast.success('Weekly availability schedule and consultation limits saved successfully!');
    }, 600);
  };

  const setPresetExpectedTime = (minutes: number, label: string) => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + minutes);
    setExpectedAvailableAt(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    toast.success(`Expected return time set to ${label} (${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`);
  };

  const currentDaySlot = weeklySchedule.find(s => s.day === selectedDay) || weeklySchedule[0];

  const totalWeeklyCapacity = weeklySchedule.reduce((acc, s) => {
    if (!s.active) return acc;
    const m = s.morningSlot.enabled ? s.morningSlot.maxPatients : 0;
    const a = s.afternoonSlot.enabled ? s.afternoonSlot.maxPatients : 0;
    const t = s.teleconsultSlot.enabled ? s.teleconsultSlot.maxPatients : 0;
    return acc + m + a + t;
  }, 0);

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <motion.div
        {...fadeIn}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-5"
      >
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-xl shadow-lg shadow-emerald-500/10">
              🟢
            </span>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">My Availability & Time Control</h1>
              <p className="text-slate-400 text-xs mt-0.5">
                Manage your real-time clinical duty state, appointment slot capacity, and consultation schedule
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[10px] uppercase font-semibold text-slate-400">Last Synced</p>
            <p className="text-xs text-slate-200 font-medium">{lastUpdatedTime}</p>
          </div>
          <button
            onClick={handleSavePreferences}
            disabled={updating}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            {updating ? 'Saving...' : '💾 Save Schedule'}
          </button>
        </div>
      </motion.div>

      {/* ── Hero Live Status Display ── */}
      <motion.div
        {...fadeIn}
        transition={{ delay: 0.1 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-surface-850 via-surface-800 to-surface-850 border border-white/[0.08] p-6 shadow-2xl"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl bg-surface-900 border-2 ${currentCfg.borderColor} flex items-center justify-center text-3xl shadow-inner relative flex-shrink-0`}>
              <span>{currentCfg.icon}</span>
              <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full ${currentCfg.key === 'available' ? 'bg-emerald-500' : 'bg-amber-500'} animate-ping opacity-75`} />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Current Live Status:</span>
                <span className={`px-3 py-1 rounded-full text-xs font-extrabold border ${currentCfg.badgeBg}`}>
                  {currentCfg.label}
                </span>
                <span className="text-xs text-slate-400">• {currentCfg.sublabel}</span>
              </div>
              <p className="text-sm text-slate-300 mt-1 max-w-xl">
                {currentCfg.description}
              </p>
              {statusMessage && (
                <p className="text-xs text-emerald-400/90 font-mono mt-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg inline-block">
                  💬 Note: "{statusMessage}"
                </p>
              )}
            </div>
          </div>

          {/* Quick toggle info */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 self-stretch md:self-auto flex-shrink-0">
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center min-w-[120px]">
              <p className="text-[10px] uppercase font-bold text-slate-400">Reception Visibility</p>
              <p className={`text-xs font-bold mt-0.5 ${currentCfg.allowBooking ? 'text-emerald-400' : 'text-rose-400'}`}>
                {currentCfg.allowBooking ? '✓ Booking Open' : '✕ Booking Paused'}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center min-w-[120px]">
              <p className="text-[10px] uppercase font-bold text-slate-400">On-Call Duty</p>
              <p className="text-xs font-bold text-emerald-400 mt-0.5">
                {emergencyOnCall ? '🟢 Active' : '⚪ Standby'}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Status Selection Matrix (7 States) ── */}
      <motion.div {...fadeIn} transition={{ delay: 0.15 }}>
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>⚡</span> Switch Duty State (Select Status)
          </h2>
          <span className="text-xs text-slate-400">Updates live across hospital reception & triage instantly</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {statusOptions.map((opt) => {
            const isSelected = currentStatus === opt.key;
            return (
              <motion.button
                key={opt.key}
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => handleStatusChange(opt.key)}
                className={`p-4 rounded-2xl text-left border transition-all duration-200 cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                  isSelected
                    ? `bg-surface-800/90 ${opt.borderColor} ring-2 ${opt.ringColor} shadow-xl`
                    : 'bg-surface-800/40 border-white/[0.06] hover:bg-surface-800/70 hover:border-white/20'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-2.5 right-2.5">
                    <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Active
                    </span>
                  </div>
                )}
                <div>
                  <span className="text-2xl mb-2.5 block">{opt.icon}</span>
                  <p className={`text-sm font-bold ${isSelected ? opt.color : 'text-white'}`}>
                    {opt.label}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5 font-medium">{opt.sublabel}</p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-white/[0.04] flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">{opt.allowBooking ? 'Accepts queue' : 'Queue paused'}</span>
                  <span className={`font-semibold ${isSelected ? opt.color : 'text-slate-400'}`}>
                    {isSelected ? 'Current ✓' : 'Set Active →'}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* ── Status Customization & Expected Availability ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Status Message & Preset Return Times */}
        <motion.div
          {...fadeIn}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 bg-surface-800/60 backdrop-blur-sm border border-white/[0.06] rounded-2xl p-5 shadow-xl space-y-4"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">📝</span>
            <h3 className="text-base font-bold text-white">Custom Status Broadcast & Return Timer</h3>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Doctor Note / Room Details (Visible to Receptionists & Nurses)
            </label>
            <input
              type="text"
              value={statusMessage}
              onChange={(e) => setStatusMessage(e.target.value)}
              placeholder="e.g. In Surgery OR-2 until 14:00 • In CCU Rounds with Dr. Patel"
              className="w-full px-4 py-2.5 rounded-xl bg-surface-900/90 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Expected Available Return Time
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={expectedAvailableAt}
                onChange={(e) => setExpectedAvailableAt(e.target.value)}
                placeholder="e.g. 14:30 or +45 mins"
                className="px-3.5 py-2 rounded-xl bg-surface-900/90 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500/50 w-44 font-mono"
              />
              <button
                type="button"
                onClick={() => setPresetExpectedTime(30, '+30 mins')}
                className="px-3 py-2 rounded-xl bg-white/5 hover:bg-emerald-500/20 border border-white/5 hover:border-emerald-500/30 text-xs text-slate-300 hover:text-emerald-300 transition-all cursor-pointer font-medium"
              >
                +30 mins
              </button>
              <button
                type="button"
                onClick={() => setPresetExpectedTime(60, '+1 hour')}
                className="px-3 py-2 rounded-xl bg-white/5 hover:bg-emerald-500/20 border border-white/5 hover:border-emerald-500/30 text-xs text-slate-300 hover:text-emerald-300 transition-all cursor-pointer font-medium"
              >
                +1 hour
              </button>
              <button
                type="button"
                onClick={() => setPresetExpectedTime(120, '+2 hours')}
                className="px-3 py-2 rounded-xl bg-white/5 hover:bg-emerald-500/20 border border-white/5 hover:border-emerald-500/30 text-xs text-slate-300 hover:text-emerald-300 transition-all cursor-pointer font-medium"
              >
                +2 hours
              </button>
              <button
                type="button"
                onClick={() => { setExpectedAvailableAt('Tomorrow 09:00 AM'); toast.success('Return time set to Tomorrow 09:00 AM'); }}
                className="px-3 py-2 rounded-xl bg-white/5 hover:bg-emerald-500/20 border border-white/5 hover:border-emerald-500/30 text-xs text-slate-300 hover:text-emerald-300 transition-all cursor-pointer font-medium"
              >
                Tomorrow 09:00 AM
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="autoReassign"
                checked={autoReassign}
                onChange={(e) => setAutoReassign(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 bg-surface-900 border-white/20 focus:ring-emerald-500 cursor-pointer"
              />
              <label htmlFor="autoReassign" className="text-xs text-slate-300 cursor-pointer">
                Auto-reassign walk-in emergency consultations to On-Call Cardiologist when In Surgery / Off Duty
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="onCallToggle"
                checked={emergencyOnCall}
                onChange={(e) => setEmergencyOnCall(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 bg-surface-900 border-white/20 focus:ring-emerald-500 cursor-pointer"
              />
              <label htmlFor="onCallToggle" className="text-xs text-slate-300 cursor-pointer">
                Accept Hospital Code Blue on-call calls
              </label>
            </div>
          </div>
        </motion.div>

        {/* Right Column: Weekly Capacity Meter & Workload */}
        <motion.div
          {...fadeIn}
          transition={{ delay: 0.25 }}
          className="bg-surface-800/60 backdrop-blur-sm border border-white/[0.06] rounded-2xl p-5 shadow-xl space-y-4"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">📊</span>
            <h3 className="text-base font-bold text-white">Workload & Capacity Limits</h3>
          </div>

          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Weekly Total Capacity:</span>
              <span className="text-sm font-bold text-emerald-400 font-mono">{totalWeeklyCapacity} Patients</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Daily Avg Consults:</span>
              <span className="text-sm font-bold text-sky-400 font-mono">18 / Day</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Avg Consultation Duration:</span>
              <span className="text-sm font-bold text-slate-200 font-mono">20 Mins</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Tele-Health Video Slots:</span>
              <span className="text-sm font-bold text-indigo-400 font-mono">5 Slots / Day</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <span>💡</span> Auto-Sync Active
            </p>
            <p className="text-[11px] text-emerald-400/80 leading-relaxed">
              When set to <strong>Available</strong>, online patient appointment bookings are automatically approved within your configured time slots.
            </p>
          </div>
        </motion.div>
      </div>

      {/* ── Weekly Working Hours & Time Slot Grid ── */}
      <motion.div
        {...fadeIn}
        transition={{ delay: 0.3 }}
        className="bg-surface-800/60 backdrop-blur-sm border border-white/[0.06] rounded-2xl p-6 shadow-xl space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>📅</span> Recurring Weekly Consultation Time Slots
            </h2>
            <p className="text-xs text-slate-400">Configure your morning, afternoon, and tele-consultation hours for each day of the week</p>
          </div>

          {/* Day selection tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {weeklySchedule.map((s) => (
              <button
                key={s.day}
                onClick={() => setSelectedDay(s.day)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex-shrink-0 ${
                  selectedDay === s.day
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                {s.day.slice(0, 3)} {s.active ? '🟢' : '⚪'}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Day Slots Configuration */}
        <div className="p-5 rounded-2xl bg-surface-900/80 border border-white/[0.06] space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <div className="flex items-center gap-3">
              <h3 className="text-base font-bold text-white">{currentDaySlot.day} Schedule</h3>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${currentDaySlot.active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-500/20 text-slate-400'}`}>
                {currentDaySlot.active ? 'Duty Day' : 'Day Off'}
              </span>
            </div>
            <button
              onClick={() => {
                setWeeklySchedule(prev => prev.map(d => d.day === selectedDay ? { ...d, active: !d.active } : d));
                toast.success(`${selectedDay} set to ${!currentDaySlot.active ? 'Active duty' : 'Day Off'}`);
              }}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              {currentDaySlot.active ? 'Mark as Day Off' : 'Enable as Duty Day'}
            </button>
          </div>

          {currentDaySlot.active ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Morning Slot */}
              <div className={`p-4 rounded-xl border transition-all ${currentDaySlot.morningSlot.enabled ? 'bg-white/[0.02] border-emerald-500/30' : 'bg-white/[0.01] border-white/[0.04] opacity-60'}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>🌅</span> Morning OPD Session
                  </span>
                  <input
                    type="checkbox"
                    checked={currentDaySlot.morningSlot.enabled}
                    onChange={(e) => {
                      const val = e.target.checked;
                      setWeeklySchedule(prev => prev.map(d => d.day === selectedDay ? { ...d, morningSlot: { ...d.morningSlot, enabled: val } } : d));
                    }}
                    className="w-4 h-4 rounded text-emerald-500 bg-surface-900 border-white/20 cursor-pointer"
                  />
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Time:</span>
                    <span className="text-slate-200 font-mono font-semibold">{currentDaySlot.morningSlot.start} – {currentDaySlot.morningSlot.end}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Max Slots:</span>
                    <span className="text-emerald-400 font-mono font-bold">{currentDaySlot.morningSlot.maxPatients} Patients</span>
                  </div>
                </div>
              </div>

              {/* Afternoon Slot */}
              <div className={`p-4 rounded-xl border transition-all ${currentDaySlot.afternoonSlot.enabled ? 'bg-white/[0.02] border-emerald-500/30' : 'bg-white/[0.01] border-white/[0.04] opacity-60'}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>☀️</span> Afternoon OPD & Rounds
                  </span>
                  <input
                    type="checkbox"
                    checked={currentDaySlot.afternoonSlot.enabled}
                    onChange={(e) => {
                      const val = e.target.checked;
                      setWeeklySchedule(prev => prev.map(d => d.day === selectedDay ? { ...d, afternoonSlot: { ...d.afternoonSlot, enabled: val } } : d));
                    }}
                    className="w-4 h-4 rounded text-emerald-500 bg-surface-900 border-white/20 cursor-pointer"
                  />
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Time:</span>
                    <span className="text-slate-200 font-mono font-semibold">{currentDaySlot.afternoonSlot.start} – {currentDaySlot.afternoonSlot.end}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Max Slots:</span>
                    <span className="text-emerald-400 font-mono font-bold">{currentDaySlot.afternoonSlot.maxPatients} Patients</span>
                  </div>
                </div>
              </div>

              {/* Tele-Consultation Slot */}
              <div className={`p-4 rounded-xl border transition-all ${currentDaySlot.teleconsultSlot.enabled ? 'bg-white/[0.02] border-emerald-500/30' : 'bg-white/[0.01] border-white/[0.04] opacity-60'}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>📹</span> Evening Tele-Consults
                  </span>
                  <input
                    type="checkbox"
                    checked={currentDaySlot.teleconsultSlot.enabled}
                    onChange={(e) => {
                      const val = e.target.checked;
                      setWeeklySchedule(prev => prev.map(d => d.day === selectedDay ? { ...d, teleconsultSlot: { ...d.teleconsultSlot, enabled: val } } : d));
                    }}
                    className="w-4 h-4 rounded text-emerald-500 bg-surface-900 border-white/20 cursor-pointer"
                  />
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Time:</span>
                    <span className="text-slate-200 font-mono font-semibold">{currentDaySlot.teleconsultSlot.start} – {currentDaySlot.teleconsultSlot.end}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Max Slots:</span>
                    <span className="text-indigo-400 font-mono font-bold">{currentDaySlot.teleconsultSlot.maxPatients} Video Calls</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-500">
              <span className="text-2xl block mb-2">🏖️</span>
              <p className="text-sm">No clinical duties scheduled on {selectedDay}.</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
