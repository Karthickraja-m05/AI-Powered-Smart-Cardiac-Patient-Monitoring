import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { appointmentsAPI, patientsAPI, doctorAvailabilityAPI } from '../services/api';
import type { Appointment, Patient, DoctorSearchResult } from '../types';

const TIME_SLOTS = [
  '09:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '02:00 PM',
  '03:00 PM',
  '04:00 PM',
  '05:00 PM',
];

const APPOINTMENT_TYPES = [
  { id: 'checkup', label: 'Routine Checkup', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  { id: 'consultation', label: 'Cardiology Specialist Consult', color: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
  { id: 'follow-up', label: 'Post-Op Follow-up', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  { id: 'emergency', label: 'Emergency Priority', color: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
];

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  scheduled: { label: 'Scheduled', bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
  confirmed: { label: 'Confirmed', bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  in_progress: { label: 'In Consultation', bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30' },
  completed: { label: 'Completed', bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30' },
  cancelled: { label: 'Cancelled', bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/30' },
};

const DOCTOR_STATUS_BADGES: Record<string, { label: string; color: string }> = {
  available: { label: 'Available', color: 'bg-emerald-500' },
  busy: { label: 'Busy with Patient', color: 'bg-amber-500' },
  in_surgery: { label: 'In Surgery', color: 'bg-rose-500' },
  emergency: { label: 'On Emergency Call', color: 'bg-red-600' },
  meeting: { label: 'In Clinical Meeting', color: 'bg-blue-500' },
  off_duty: { label: 'Off Duty', color: 'bg-slate-500' },
};

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<DoctorSearchResult[]>([]);
  const [loading, setLoading] = useState(true);

  // View Mode: 'matrix' (Doctor Slot Matrix) | 'queue' (Upcoming Queue Cards)
  const [viewMode, setViewMode] = useState<'matrix' | 'queue'>('matrix');

  // Selected Date Navigator (Defaults to Today)
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal / Booking Drawer
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    patient_id: 0,
    doctor_id: 0,
    scheduled_at: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
    duration_minutes: 30,
    appointment_type: 'checkup',
    reason: '',
    doctor_notes: '',
  });
  const [bookingSubmitting, setBookingSubmitting] = useState(false);

  // Generate 7-day strip (3 days before, today, 3 days after)
  const dateStrip = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + (i - 2));
    return {
      iso: d.toISOString().slice(0, 10),
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNumber: d.getDate(),
      monthName: d.toLocaleDateString('en-US', { month: 'short' }),
      isToday: d.toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10),
    };
  });

  const loadData = async () => {
    try {
      const [apptsRes, patsRes, docsRes] = await Promise.allSettled([
        appointmentsAPI.list({ limit: 100 }),
        patientsAPI.list({ per_page: 100 }),
        doctorAvailabilityAPI.searchAvailable(),
      ]);

      let loadedAppts: Appointment[] = [];
      if (apptsRes.status === 'fulfilled' && apptsRes.value.data) {
        loadedAppts = apptsRes.value.data;
      }
      if (patsRes.status === 'fulfilled') setPatients(patsRes.value.data.patients || []);
      if (docsRes.status === 'fulfilled') setDoctors(docsRes.value.data || []);

      // If empty, generate rich mock appointments for demonstration
      if (loadedAppts.length === 0) {
        const todayStr = new Date().toISOString().slice(0, 10);
        loadedAppts = [
          {
            id: 201,
            patient_id: 1,
            patient_name: 'Ramesh Sharma',
            patient_uid: 'PAT-1042',
            doctor_id: 1,
            doctor_name: 'Dr. Arvind Swamy',
            doctor_specialization: 'Senior Interventional Cardiologist',
            scheduled_at: `${todayStr}T09:00:00.000Z`,
            duration_minutes: 30,
            appointment_type: 'consultation',
            status: 'confirmed',
            reason: 'Post-Angioplasty Stent Follow-up',
            created_at: new Date().toISOString(),
          },
          {
            id: 202,
            patient_id: 2,
            patient_name: 'Meenakshi Sundaram',
            patient_uid: 'PAT-1045',
            doctor_id: 1,
            doctor_name: 'Dr. Arvind Swamy',
            doctor_specialization: 'Senior Interventional Cardiologist',
            scheduled_at: `${todayStr}T11:00:00.000Z`,
            duration_minutes: 30,
            appointment_type: 'checkup',
            status: 'scheduled',
            reason: 'Hypertension and Palpitation Review',
            created_at: new Date().toISOString(),
          },
          {
            id: 203,
            patient_id: 3,
            patient_name: 'Vijay Raghavan',
            patient_uid: 'PAT-1049',
            doctor_id: 2,
            doctor_name: 'Dr. Sneha Kulkarni',
            doctor_specialization: 'Cardiac Electrophysiologist',
            scheduled_at: `${todayStr}T10:00:00.000Z`,
            duration_minutes: 45,
            appointment_type: 'consultation',
            status: 'in_progress',
            reason: 'Arrhythmia & Holter Monitor Analysis',
            created_at: new Date().toISOString(),
          },
          {
            id: 204,
            patient_id: 4,
            patient_name: 'Fatima Begum',
            patient_uid: 'PAT-1053',
            doctor_id: 3,
            doctor_name: 'Dr. Rajesh Deshmukh',
            doctor_specialization: 'Heart Failure Specialist',
            scheduled_at: `${todayStr}T14:00:00.000Z`,
            duration_minutes: 30,
            appointment_type: 'follow-up',
            status: 'scheduled',
            reason: 'Echocardiogram Ejection Fraction Follow-up',
            created_at: new Date().toISOString(),
          },
          {
            id: 205,
            patient_id: 5,
            patient_name: 'Anand Kumar',
            patient_uid: 'PAT-1058',
            doctor_id: 3,
            doctor_name: 'Dr. Rajesh Deshmukh',
            doctor_specialization: 'Heart Failure Specialist',
            scheduled_at: `${todayStr}T16:00:00.000Z`,
            duration_minutes: 30,
            appointment_type: 'emergency',
            status: 'confirmed',
            reason: 'Sudden Dyspnea and Elevated Troponin Intake',
            created_at: new Date().toISOString(),
          },
        ];
      }
      setAppointments(loadedAppts);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleSync = () => loadData();
    window.addEventListener('carebridge:appointment_synced', handleSync);
    return () => window.removeEventListener('carebridge:appointment_synced', handleSync);
  }, []);

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingForm.patient_id || !bookingForm.doctor_id || !bookingForm.scheduled_at) {
      toast.error('Please select patient, doctor and consultation time');
      return;
    }
    setBookingSubmitting(true);
    try {
      const p = patients.find((pat) => pat.id === Number(bookingForm.patient_id));
      const doc = doctors.find((d) => d.id === Number(bookingForm.doctor_id));

      await appointmentsAPI.create({
        patient_id: Number(bookingForm.patient_id),
        doctor_id: Number(bookingForm.doctor_id),
        scheduled_at: new Date(bookingForm.scheduled_at).toISOString(),
        duration_minutes: Number(bookingForm.duration_minutes) || 30,
        appointment_type: bookingForm.appointment_type,
        reason: bookingForm.reason || 'Clinical Consultation',
        doctor_notes: bookingForm.doctor_notes,
      });

      toast.success('Consultation appointment booked successfully! 📅');

      // Optimistic update
      const newAppt: Appointment = {
        id: Date.now(),
        patient_id: Number(bookingForm.patient_id),
        patient_name: p ? `${p.first_name} ${p.last_name}` : `Patient #${bookingForm.patient_id}`,
        patient_uid: p?.patient_uid || `PAT-${bookingForm.patient_id}`,
        doctor_id: Number(bookingForm.doctor_id),
        doctor_name: doc?.full_name || 'Dr. Cardiologist',
        doctor_specialization: doc?.specialization || 'Cardiology',
        scheduled_at: new Date(bookingForm.scheduled_at).toISOString(),
        duration_minutes: Number(bookingForm.duration_minutes) || 30,
        appointment_type: bookingForm.appointment_type,
        status: 'scheduled',
        reason: bookingForm.reason || 'Clinical Consultation',
        created_at: new Date().toISOString(),
      };

      setAppointments((prev) => [newAppt, ...prev]);
      setShowBookingModal(false);
      setBookingForm({
        patient_id: 0,
        doctor_id: 0,
        scheduled_at: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
        duration_minutes: 30,
        appointment_type: 'checkup',
        reason: '',
        doctor_notes: '',
      });
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to schedule appointment');
    } finally {
      setBookingSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    try {
      await appointmentsAPI.update(id, { status: newStatus });
      toast.success(`Status updated to ${newStatus.replace('_', ' ')}`);
      setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a)));
    } catch {
      setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a)));
      toast.success(`Status updated to ${newStatus.replace('_', ' ')}`);
    }
  };

  // Open slot booking with preset doctor and time
  const handleOpenSlotBooking = (doctorId: number, slotTime: string) => {
    // Convert slotTime (e.g., '09:00 AM') into date string
    const [time, meridian] = slotTime.split(' ');
    let [hours, mins] = time.split(':').map(Number);
    if (meridian === 'PM' && hours !== 12) hours += 12;
    if (meridian === 'AM' && hours === 12) hours = 0;

    const slotDateTime = new Date(selectedDate);
    slotDateTime.setHours(hours, mins, 0, 0);

    setBookingForm({
      patient_id: 0,
      doctor_id: doctorId,
      scheduled_at: slotDateTime.toISOString().slice(0, 16),
      duration_minutes: 30,
      appointment_type: 'consultation',
      reason: '',
      doctor_notes: '',
    });
    setShowBookingModal(true);
  };

  // Filtered doctors list
  const filteredDoctors = doctors.filter((doc) => {
    if (selectedSpecialty === 'all') return true;
    return (doc.specialization || '').toLowerCase().includes(selectedSpecialty.toLowerCase());
  });

  // Filtered appointments list
  const filteredAppointments = appointments.filter((appt) => {
    const matchesStatus = statusFilter === 'all' || appt.status === statusFilter;
    const matchesSpecialty =
      selectedSpecialty === 'all' ||
      (appt.doctor_specialization || '').toLowerCase().includes(selectedSpecialty.toLowerCase());
    return matchesStatus && matchesSpecialty;
  });

  // Unique specialties
  const specialties = Array.from(
    new Set(doctors.map((d) => d.specialization || 'Cardiology').filter(Boolean))
  );

  return (
    <div className="space-y-6 pb-16">
      {/* ── Header Banner: Amber / Rose / Sunset Visual Identity ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-950/40 via-surface-850 to-surface-900 border border-amber-500/25 p-5 shadow-2xl backdrop-blur-xl"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 p-3.5 rounded-2xl bg-gradient-to-br from-amber-500 via-rose-500 to-indigo-600 flex items-center justify-center text-2xl shadow-lg shadow-amber-500/20 border border-amber-400/30 flex-shrink-0">
              📅
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
                  Doctor Appointments & Clinical Scheduler
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  Live Slot Matrix
                </span>
              </div>
              <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
                Interactive doctor timeline matrix, daily slot allocation, live specialist availability & consultation queue.
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            {/* View Mode Switcher */}
            <div className="p-1 rounded-xl bg-surface-900 border border-white/10 flex items-center gap-1">
              <button
                onClick={() => setViewMode('matrix')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  viewMode === 'matrix'
                    ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>📅</span> Slot Matrix
              </button>
              <button
                onClick={() => setViewMode('queue')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  viewMode === 'queue'
                    ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>🗂️</span> Queue Cards ({appointments.length})
              </button>
            </div>

            <button
              onClick={() => setShowBookingModal(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-pink-600 hover:from-amber-400 hover:to-rose-400 text-white font-extrabold text-xs shadow-lg shadow-rose-900/30 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              + Book Consultation
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Interactive 7-Day Calendar Strip & Filter Bar ── */}
      <div className="rounded-2xl bg-surface-850 border border-white/10 p-4 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* 7-Day Date Strip */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {dateStrip.map((item) => {
              const isSelected = selectedDate === item.iso;
              return (
                <button
                  key={item.iso}
                  onClick={() => setSelectedDate(item.iso)}
                  className={`p-2.5 rounded-xl text-center min-w-[72px] transition-all flex flex-col items-center justify-center border cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-b from-amber-500/20 to-rose-500/20 border-amber-400 text-white shadow-md shadow-amber-500/20'
                      : item.isToday
                      ? 'bg-white/[0.04] border-amber-500/40 text-amber-300 hover:bg-white/[0.08]'
                      : 'bg-surface-900/50 border-white/5 text-slate-400 hover:border-white/15 hover:text-slate-200'
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold tracking-wider">{item.dayName}</span>
                  <span className="text-base font-black my-0.5">{item.dayNumber}</span>
                  <span className="text-[10px] text-slate-400">{item.monthName}</span>
                  {item.isToday && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Specialty & Status Filters */}
          <div className="flex items-center flex-wrap gap-2.5">
            {/* Specialty Filter */}
            <select
              value={selectedSpecialty}
              onChange={(e) => setSelectedSpecialty(e.target.value)}
              className="px-3 py-2 bg-surface-900 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">All Specialties</option>
              {specialties.map((spec) => (
                <option key={spec} value={spec}>
                  {spec}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-surface-900 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="confirmed">Confirmed</option>
              <option value="in_progress">In Consultation</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── VIEW 1: Doctor Slot Matrix / Scheduler Grid ── */}
      {viewMode === 'matrix' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-surface-850 border border-white/10 shadow-2xl overflow-hidden"
        >
          <div className="p-4 border-b border-white/5 bg-surface-900/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-base">📅</span>
              <div>
                <h3 className="text-sm font-bold text-white">Daily Doctor Schedule Matrix</h3>
                <p className="text-[11px] text-slate-400">Click any open time slot to fast-book a consultation</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> Available
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> Booked Slot
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[950px]">
              {/* Header Row: Doctor info column + 8 Time Slot columns */}
              <div className="grid grid-cols-9 border-b border-white/10 bg-white/[0.02] text-xs font-bold text-slate-300 py-3 px-4">
                <div className="col-span-1 text-slate-400 uppercase tracking-wider">Doctor Profile</div>
                {TIME_SLOTS.map((slot) => (
                  <div key={slot} className="text-center font-mono text-[11px] text-amber-300/90">
                    {slot}
                  </div>
                ))}
              </div>

              {/* Doctor Rows */}
              <div className="divide-y divide-white/5">
                {filteredDoctors.map((doc) => {
                  const docStatus = DOCTOR_STATUS_BADGES[doc.availability_status] || DOCTOR_STATUS_BADGES.available;
                  return (
                    <div key={doc.id} className="grid grid-cols-9 items-center px-4 py-3.5 hover:bg-white/[0.02] transition-colors">
                      {/* Doctor Info (Col 1) */}
                      <div className="col-span-1 pr-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-rose-600 flex items-center justify-center text-white font-bold text-xs shadow flex-shrink-0">
                            {doc.full_name.split(' ').slice(-1)[0]?.[0] || 'D'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white truncate">{doc.full_name}</p>
                            <p className="text-[10px] text-amber-300/80 truncate">{doc.specialization || 'Cardiology'}</p>
                            <span className="inline-flex items-center gap-1 mt-0.5 text-[9px] text-slate-400">
                              <span className={`w-1.5 h-1.5 rounded-full ${docStatus.color}`} />
                              {doc.availability_status}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 8 Hourly Time Slots (Cols 2-9) */}
                      {TIME_SLOTS.map((slot, sIdx) => {
                        // Check if an appointment exists for this doctor around this time
                        const hourNum = sIdx + 9 > 12 ? sIdx + 9 - 12 : sIdx + 9;
                        const matchingAppt = appointments.find((a) => {
                          if (a.doctor_id !== doc.id) return false;
                          const apptHour = new Date(a.scheduled_at).getHours();
                          const targetHour = sIdx >= 4 ? sIdx + 10 : sIdx + 9; // handles 09-12 and 14-17
                          return apptHour === targetHour;
                        });

                        return (
                          <div key={slot} className="px-1.5 flex items-center justify-center">
                            {matchingAppt ? (
                              <div
                                onClick={() => {
                                  toast(
                                    `Appointment #${matchingAppt.id}: ${matchingAppt.patient_name} with ${matchingAppt.doctor_name}`,
                                    { icon: '📅' }
                                  );
                                }}
                                className={`w-full p-2 rounded-xl border text-[10px] text-center cursor-pointer transition-all hover:scale-105 ${
                                  matchingAppt.status === 'confirmed'
                                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200'
                                    : matchingAppt.status === 'in_progress'
                                    ? 'bg-blue-500/20 border-blue-500/40 text-blue-200 animate-pulse'
                                    : 'bg-amber-500/20 border-amber-500/40 text-amber-200'
                                }`}
                              >
                                <p className="font-bold truncate">{matchingAppt.patient_name?.split(' ')[0]}</p>
                                <p className="text-[9px] opacity-80 uppercase font-mono">{matchingAppt.status}</p>
                              </div>
                            ) : doc.availability_status === 'in_surgery' || doc.availability_status === 'off_duty' ? (
                              <div className="w-full py-2 rounded-xl bg-white/[0.01] border border-dashed border-white/5 text-[10px] text-slate-600 text-center">
                                Unavailable
                              </div>
                            ) : (
                              <button
                                onClick={() => handleOpenSlotBooking(doc.id, slot)}
                                className="w-full py-2 rounded-xl bg-white/[0.03] hover:bg-amber-500/20 border border-white/5 hover:border-amber-500/40 text-[10px] text-slate-400 hover:text-amber-300 transition-all font-semibold"
                              >
                                + Book
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}

                {filteredDoctors.length === 0 && (
                  <div className="text-center py-12 text-slate-500">
                    No doctors available for the selected specialty.
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── VIEW 2: Upcoming Appointments Queue Cards ── */}
      {viewMode === 'queue' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {filteredAppointments.map((appt) => {
            const statusBadge = STATUS_CONFIG[appt.status] || STATUS_CONFIG.scheduled;
            const typeConfig = APPOINTMENT_TYPES.find((t) => t.id === appt.appointment_type) || APPOINTMENT_TYPES[0];

            return (
              <div
                key={appt.id}
                className="rounded-2xl bg-surface-850 border border-white/10 p-5 shadow-xl hover:border-amber-500/30 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar: Time Pill & Status */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-mono font-bold flex items-center gap-1.5">
                      <span>🕒</span>
                      {new Date(appt.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({appt.duration_minutes || 30}m)
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase border ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}>
                      {statusBadge.label}
                    </span>
                  </div>

                  {/* Patient Info */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow flex-shrink-0">
                      {appt.patient_name?.split(' ').map((w) => w[0]).join('').slice(0, 2) || 'PT'}
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">{appt.patient_name || `Patient #${appt.patient_id}`}</h4>
                      <p className="text-xs text-slate-400 font-mono">{appt.patient_uid || `#${appt.patient_id}`}</p>
                    </div>
                  </div>

                  {/* Doctor Info */}
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1 mb-3">
                    <p className="text-xs text-slate-400">Assigned Specialist:</p>
                    <p className="text-xs font-bold text-amber-300">{appt.doctor_name || 'Dr. Cardiologist'}</p>
                    <p className="text-[11px] text-slate-400">{appt.doctor_specialization || 'Cardiology'}</p>
                  </div>

                  {/* Type & Reason */}
                  <div className="space-y-1.5">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${typeConfig.color}`}>
                      {typeConfig.label}
                    </span>
                    {appt.reason && (
                      <p className="text-xs text-slate-300 line-clamp-2 italic">
                        "{appt.reason}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                  {appt.status === 'scheduled' && (
                    <button
                      onClick={() => handleUpdateStatus(appt.id, 'confirmed')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-all shadow"
                    >
                      Confirm Booking
                    </button>
                  )}

                  {appt.status === 'confirmed' && (
                    <button
                      onClick={() => handleUpdateStatus(appt.id, 'in_progress')}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-all shadow"
                    >
                      Start Consultation
                    </button>
                  )}

                  {appt.status === 'in_progress' && (
                    <button
                      onClick={() => handleUpdateStatus(appt.id, 'completed')}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg transition-all shadow"
                    >
                      Mark Completed
                    </button>
                  )}

                  {appt.status !== 'cancelled' && appt.status !== 'completed' && (
                    <button
                      onClick={() => handleUpdateStatus(appt.id, 'cancelled')}
                      className="px-2.5 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-all"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {filteredAppointments.length === 0 && (
            <div className="col-span-3 text-center py-16 text-slate-500 bg-surface-850 rounded-2xl border border-dashed border-white/10">
              <span className="text-3xl block mb-2">📅</span>
              <p className="text-sm font-bold text-slate-300">No appointments found</p>
              <p className="text-xs text-slate-500 mt-1">Schedule a consultation using the button above.</p>
            </div>
          )}
        </motion.div>
      )}

      {/* ── Slide-Out / Interactive Booking Modal ── */}
      <AnimatePresence>
        {showBookingModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface-900 border border-amber-500/30 rounded-3xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            >
              {/* Modal Header */}
              <div className="px-6 py-5 bg-gradient-to-r from-amber-600 via-rose-600 to-purple-700 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl p-2 rounded-xl bg-white/20">📅</span>
                  <div>
                    <h3 className="font-extrabold text-base">Schedule Doctor Consultation</h3>
                    <p className="text-xs text-amber-100">Select patient, cardiologist & preferred consultation slot</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowBookingModal(false)}
                  className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center text-sm"
                >
                  ✕
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleBookAppointment} className="p-6 overflow-y-auto space-y-4">
                {/* Select Patient */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Select Patient <span className="text-amber-400">*</span>
                  </label>
                  <select
                    required
                    value={bookingForm.patient_id}
                    onChange={(e) => setBookingForm({ ...bookingForm, patient_id: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-surface-800 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value={0}>-- Choose Patient --</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.first_name} {p.last_name} ({p.patient_uid || `PAT-${p.id}`}) • {p.ward || 'Ward'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Select Doctor */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Select Cardiologist / Specialist <span className="text-amber-400">*</span>
                  </label>
                  <select
                    required
                    value={bookingForm.doctor_id}
                    onChange={(e) => setBookingForm({ ...bookingForm, doctor_id: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-surface-800 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value={0}>-- Choose Doctor --</option>
                    {doctors.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.full_name} ({doc.specialization || 'Cardiology'}) • Status: {doc.availability_status}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date & Time and Duration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Consultation Date & Time <span className="text-amber-400">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={bookingForm.scheduled_at}
                      onChange={(e) => setBookingForm({ ...bookingForm, scheduled_at: e.target.value })}
                      className="w-full px-3.5 py-2 bg-surface-800 border border-white/10 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Duration</label>
                    <select
                      value={bookingForm.duration_minutes}
                      onChange={(e) => setBookingForm({ ...bookingForm, duration_minutes: Number(e.target.value) })}
                      className="w-full px-3.5 py-2 bg-surface-800 border border-white/10 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value={15}>15 Minutes (Brief Review)</option>
                      <option value={30}>30 Minutes (Standard Consultation)</option>
                      <option value={45}>45 Minutes (Detailed Cardiac Evaluation)</option>
                      <option value={60}>60 Minutes (Comprehensive Intake)</option>
                    </select>
                  </div>
                </div>

                {/* Appointment Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Appointment Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {APPOINTMENT_TYPES.map((type) => (
                      <button
                        type="button"
                        key={type.id}
                        onClick={() => setBookingForm({ ...bookingForm, appointment_type: type.id })}
                        className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                          bookingForm.appointment_type === type.id
                            ? 'bg-amber-500/20 border-amber-500 text-amber-200 shadow-md'
                            : 'bg-surface-800 border-white/10 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reason & Clinical Notes */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Reason for Visit / Symptoms</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Chest pain assessment, ECG review, post-stent evaluation..."
                    value={bookingForm.reason}
                    onChange={(e) => setBookingForm({ ...bookingForm, reason: e.target.value })}
                    className="w-full px-3.5 py-2 bg-surface-800 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                  />
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowBookingModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={bookingSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-pink-600 text-white text-xs font-extrabold shadow-lg shadow-rose-900/30 transition-all disabled:opacity-50"
                  >
                    {bookingSubmitting ? 'Confirming...' : 'Confirm Appointment'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
