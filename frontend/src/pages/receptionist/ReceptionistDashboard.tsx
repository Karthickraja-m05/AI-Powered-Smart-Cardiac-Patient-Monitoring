import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  dashboardAPI,
  patientsAPI,
  authAPI,
  doctorAvailabilityAPI,
  appointmentsAPI,
  visitorsAPI,
} from '../../services/api';
import type {
  ReceptionistDashboardData,
  Patient,
  DoctorSearchResult,
  Appointment,
  Visitor,
} from '../../types';

export default function ReceptionistDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<ReceptionistDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  // Lists for dropdowns & widgets
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<DoctorSearchResult[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [visitors, setVisitors] = useState<Visitor[]>([]);

  // Modal controls
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [showVisitorModal, setShowVisitorModal] = useState(false);

  // Form states
  const [registerForm, setRegisterForm] = useState({
    first_name: '',
    last_name: '',
    age: 45,
    gender: 'Male',
    phone: '',
    blood_group: 'O+',
    ward: 'General Ward A',
    bed_number: 'B-101',
    admission_reason: 'Routine checkup & monitoring',
    has_hypertension: false,
    has_diabetes: false,
    has_previous_heart_disease: false,
    is_smoker: false,
  });
  const [registering, setRegistering] = useState(false);

  const [appointmentForm, setAppointmentForm] = useState({
    patient_id: 0,
    doctor_id: 0,
    scheduled_at: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
    duration_minutes: 30,
    appointment_type: 'checkup',
    reason: '',
    doctor_notes: '',
  });
  const [booking, setBooking] = useState(false);

  // Visitor form state
  const [visitorForm, setVisitorForm] = useState({
    patient_id: 0,
    visitor_name: '',
    phone: '',
    relation: 'Family',
    id_proof_type: 'Aadhaar / ID Card',
    id_proof_number: '',
  });
  const [registeringVisitor, setRegisteringVisitor] = useState(false);
  const [showNewVisitorForm, setShowNewVisitorForm] = useState(false);

  // Doctor search state inside modal
  const [doctorSearchQuery, setDoctorSearchQuery] = useState('');

  // Load all dashboard data
  const loadDashboardData = async () => {
    try {
      const [dashRes, patRes, docRes, apptRes, visRes] = await Promise.allSettled([
        dashboardAPI.getReceptionistDashboard(),
        patientsAPI.list({ per_page: 50 }),
        doctorAvailabilityAPI.searchAvailable(),
        appointmentsAPI.list({ limit: 20 }),
        visitorsAPI.listAll ? visitorsAPI.listAll({ limit: 20 }) : Promise.resolve({ data: [] }),
      ]);

      if (dashRes.status === 'fulfilled') setData(dashRes.value.data);
      if (patRes.status === 'fulfilled') setPatients(patRes.value.data.patients || []);
      if (docRes.status === 'fulfilled') setDoctors(docRes.value.data || []);
      if (apptRes.status === 'fulfilled') setAppointments(apptRes.value.data || []);
      if (visRes.status === 'fulfilled') setVisitors(visRes.value.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Handle Patient Registration
  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerForm.first_name.trim() || !registerForm.last_name.trim()) {
      toast.error('First and Last Name are required');
      return;
    }
    setRegistering(true);
    try {
      const res = await patientsAPI.create(registerForm);
      toast.success(`Patient ${registerForm.first_name} ${registerForm.last_name} registered successfully! (UID: ${res.data?.patient_uid || 'Generated'})`);
      setShowRegisterModal(false);
      setRegisterForm({
        first_name: '',
        last_name: '',
        age: 45,
        gender: 'Male',
        phone: '',
        blood_group: 'O+',
        ward: 'General Ward A',
        bed_number: 'B-101',
        admission_reason: 'Routine checkup & monitoring',
        has_hypertension: false,
        has_diabetes: false,
        has_previous_heart_disease: false,
        is_smoker: false,
      });
      loadDashboardData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to register patient');
    } finally {
      setRegistering(false);
    }
  };

  // Handle Booking Appointment
  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    const pid = Number(appointmentForm.patient_id);
    const did = Number(appointmentForm.doctor_id);

    if (!pid) {
      toast.error('Please select a patient');
      return;
    }
    if (!did) {
      toast.error('Please select a doctor');
      return;
    }
    if (!appointmentForm.scheduled_at) {
      toast.error('Please specify the date and time');
      return;
    }

    setBooking(true);
    try {
      await appointmentsAPI.create({
        patient_id: pid,
        doctor_id: did,
        scheduled_at: new Date(appointmentForm.scheduled_at).toISOString(),
        duration_minutes: Number(appointmentForm.duration_minutes) || 30,
        appointment_type: appointmentForm.appointment_type,
        reason: appointmentForm.reason || 'General clinical consultation',
        doctor_notes: appointmentForm.doctor_notes,
      });
      toast.success('Appointment booked successfully! 📅');
      setShowAppointmentModal(false);
      setAppointmentForm({
        patient_id: 0,
        doctor_id: 0,
        scheduled_at: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
        duration_minutes: 30,
        appointment_type: 'checkup',
        reason: '',
        doctor_notes: '',
      });
      loadDashboardData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to book appointment');
    } finally {
      setBooking(false);
    }
  };

  // Handle New Visitor Registration
  const handleRegisterVisitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorForm.visitor_name.trim()) {
      toast.error('Visitor name is required');
      return;
    }
    if (!visitorForm.patient_id) {
      toast.error('Please select the patient to visit');
      return;
    }

    setRegisteringVisitor(true);
    try {
      const res = await visitorsAPI.register({
        patient_id: Number(visitorForm.patient_id),
        visitor_name: visitorForm.visitor_name,
        phone: visitorForm.phone,
        relation: visitorForm.relation,
        id_proof_type: visitorForm.id_proof_type,
        id_proof_number: visitorForm.id_proof_number,
      });
      toast.success(`Visitor pass created for ${visitorForm.visitor_name}! QR: ${res.data?.qr_token || 'Generated'}`);
      setShowNewVisitorForm(false);
      setVisitorForm({
        patient_id: 0,
        visitor_name: '',
        phone: '',
        relation: 'Family',
        id_proof_type: 'Aadhaar / ID Card',
        id_proof_number: '',
      });
      loadDashboardData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to register visitor');
    } finally {
      setRegisteringVisitor(false);
    }
  };

  // Handle Check-in / Check-out
  const handleVisitorCheckIn = async (id: number) => {
    try {
      await visitorsAPI.checkIn(id);
      toast.success('Visitor Checked In ✅');
      loadDashboardData();
    } catch {
      toast.error('Check-in failed');
    }
  };

  const handleVisitorCheckOut = async (id: number) => {
    try {
      await visitorsAPI.checkOut(id);
      toast.success('Visitor Checked Out 🚪');
      loadDashboardData();
    } catch {
      toast.error('Check-out failed');
    }
  };

  // Handle Appointment Status Change
  const handleUpdateAppointmentStatus = async (id: number, newStatus: string) => {
    try {
      await appointmentsAPI.update(id, { status: newStatus });
      toast.success(`Appointment status updated to ${newStatus}`);
      loadDashboardData();
    } catch {
      toast.error('Failed to update appointment status');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="animate-spin w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full" />
        <p className="text-purple-400 text-sm font-medium">Loading Reception Desk...</p>
      </div>
    );
  }

  const d = data;
  const filteredDoctors = doctors.filter((doc) =>
    (doc.full_name || '').toLowerCase().includes(doctorSearchQuery.toLowerCase()) ||
    (doc.specialization || '').toLowerCase().includes(doctorSearchQuery.toLowerCase()) ||
    (doc.department || '').toLowerCase().includes(doctorSearchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>🛎️</span> Reception Dashboard
          </h1>
          <p className="text-purple-400 text-sm mt-1">
            Patient registration, appointment scheduling, doctor availability & visitor passes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadDashboardData()}
            className="px-3 py-2 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold rounded-xl border border-white/10 transition-all flex items-center gap-1.5"
          >
            🔄 Refresh Data
          </button>
        </div>
      </motion.div>

      {/* 4 Primary Interactive Quick Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {/* 1. Register Patient Button */}
        <button
          onClick={() => setShowRegisterModal(true)}
          className="group p-5 rounded-2xl bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 text-white shadow-lg shadow-purple-900/30 hover:shadow-purple-600/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-center border border-purple-400/30 flex flex-col items-center justify-center cursor-pointer"
        >
          <span className="text-3xl block mb-2 group-hover:scale-110 transition-transform">📝</span>
          <span className="text-base font-bold">Register Patient</span>
          <span className="text-xs text-purple-200/80 mt-1">New admission & intake</span>
        </button>

        {/* 2. Book Appointment Button */}
        <button
          onClick={() => setShowAppointmentModal(true)}
          className="group p-5 rounded-2xl bg-gradient-to-br from-violet-600 via-violet-700 to-purple-800 text-white shadow-lg shadow-violet-900/30 hover:shadow-violet-600/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-center border border-violet-400/30 flex flex-col items-center justify-center cursor-pointer"
        >
          <span className="text-3xl block mb-2 group-hover:scale-110 transition-transform">📅</span>
          <span className="text-base font-bold">Book Appointment</span>
          <span className="text-xs text-violet-200/80 mt-1">Doctor consultations</span>
        </button>

        {/* 3. Find Doctor Button */}
        <button
          onClick={() => setShowDoctorModal(true)}
          className="group p-5 rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-blue-800 text-white shadow-lg shadow-indigo-900/30 hover:shadow-indigo-600/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-center border border-indigo-400/30 flex flex-col items-center justify-center cursor-pointer"
        >
          <span className="text-3xl block mb-2 group-hover:scale-110 transition-transform">🔍</span>
          <span className="text-base font-bold">Find Doctor</span>
          <span className="text-xs text-indigo-200/80 mt-1">Live status & roster</span>
        </button>

        {/* 4. Manage Visitors Button */}
        <button
          onClick={() => setShowVisitorModal(true)}
          className="group p-5 rounded-2xl bg-gradient-to-br from-fuchsia-600 via-fuchsia-700 to-pink-800 text-white shadow-lg shadow-fuchsia-900/30 hover:shadow-fuchsia-600/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-center border border-fuchsia-400/30 flex flex-col items-center justify-center cursor-pointer"
        >
          <span className="text-3xl block mb-2 group-hover:scale-110 transition-transform">🎫</span>
          <span className="text-base font-bold">Manage Visitors</span>
          <span className="text-xs text-fuchsia-200/80 mt-1">Passes & Check-ins</span>
        </button>
      </motion.div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Today's Admissions", value: d?.todays_admissions || 0, icon: '📥', color: 'from-purple-500 to-purple-700', onClick: () => navigate('/patients') },
          { label: "Today's Discharges", value: d?.todays_discharges || 0, icon: '📤', color: 'from-violet-500 to-violet-700', onClick: () => navigate('/patients') },
          { label: 'Pending Appts', value: d?.pending_appointments || appointments.length || 0, icon: '📅', color: 'from-indigo-500 to-indigo-700', onClick: () => setShowAppointmentModal(true) },
          { label: 'Available Beds', value: d?.available_beds || 42, icon: '🛏️', color: 'from-emerald-500 to-emerald-700', onClick: () => navigate('/patients') },
          { label: 'Available Doctors', value: d?.available_doctors || doctors.filter(doc => doc.availability_status === 'available').length || 0, icon: '⚕️', color: 'from-blue-500 to-blue-700', onClick: () => setShowDoctorModal(true) },
          { label: 'Active Visitors', value: visitors.filter(v => v.status === 'checked_in').length || 0, icon: '🎫', color: 'from-fuchsia-500 to-fuchsia-700', onClick: () => setShowVisitorModal(true) },
        ].map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.03 }}
            onClick={kpi.onClick}
            className="bg-surface-800/60 border border-white/5 rounded-2xl p-4 hover:border-purple-500/30 hover:bg-surface-800/90 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`w-9 h-9 rounded-xl bg-gradient-to-br ${kpi.color} flex items-center justify-center text-base shadow-md group-hover:scale-105 transition-transform`}>
                {kpi.icon}
              </span>
            </div>
            <p className="text-2xl font-extrabold text-white">{kpi.value}</p>
            <p className="text-[11px] text-slate-400 mt-0.5 truncate">{kpi.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Main Content Layout: Left = Recent Registrations, Right = Scheduled Appointments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Registrations Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="bg-surface-800/50 border border-white/5 rounded-2xl p-5 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>📋</span> Recent Registrations
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Recently admitted or registered cardiac patients</p>
              </div>
              <button
                onClick={() => setShowRegisterModal(true)}
                className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-semibold rounded-xl border border-purple-500/30 transition-all"
              >
                + New
              </button>
            </div>

            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {((d?.recent_registrations && d.recent_registrations.length > 0) ? d.recent_registrations : patients.slice(0, 6)).map((p: any) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-purple-500/30 hover:bg-white/[0.06] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow">
                      {(p.name || `${p.first_name || ''} ${p.last_name || ''}`).split(' ').map((w: string) => w[0]).join('').slice(0, 2) || 'PT'}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {p.name || `${p.first_name} ${p.last_name}`}
                      </p>
                      <p className="text-xs text-slate-400 flex items-center gap-2">
                        <span>{p.patient_uid || `PAT-${p.id}`}</span>
                        {p.ward && <span className="text-[10px] text-purple-300/80 bg-purple-500/10 px-1.5 py-0.5 rounded">{p.ward}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                        p.status === 'admitted'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : p.status === 'icu'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                      }`}
                    >
                      {p.status || 'Admitted'}
                    </span>
                    <button
                      onClick={() => {
                        setAppointmentForm((prev) => ({ ...prev, patient_id: p.id }));
                        setShowAppointmentModal(true);
                      }}
                      title="Book appointment for patient"
                      className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs rounded-lg transition-all"
                    >
                      📅 Book
                    </button>
                  </div>
                </div>
              ))}

              {(!d?.recent_registrations?.length && !patients.length) && (
                <div className="text-center py-8 text-slate-500 text-sm">No registered patients found.</div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
            <span className="text-xs text-slate-400">Total in system: {patients.length} patients</span>
            <button
              onClick={() => navigate('/patients')}
              className="text-xs text-purple-400 hover:text-purple-300 font-semibold transition-colors flex items-center gap-1"
            >
              View All Patients Directory →
            </button>
          </div>
        </motion.div>

        {/* Scheduled Appointments Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-surface-800/50 border border-white/5 rounded-2xl p-5 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>📅</span> Scheduled Appointments
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Upcoming consultations and doctor checkups</p>
              </div>
              <button
                onClick={() => setShowAppointmentModal(true)}
                className="px-3 py-1.5 bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 text-xs font-semibold rounded-xl border border-violet-500/30 transition-all"
              >
                + Book New
              </button>
            </div>

            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {appointments.slice(0, 6).map((appt) => (
                <div
                  key={appt.id}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-violet-500/30 hover:bg-white/[0.06] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center text-white text-base shadow">
                      ⚕️
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{appt.patient_name || `Patient #${appt.patient_id}`}</p>
                      <p className="text-xs text-slate-400 flex items-center gap-2">
                        <span className="text-violet-300 font-medium">{appt.doctor_name || `Dr. Assigned`}</span>
                        <span>•</span>
                        <span>{new Date(appt.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase ${
                        appt.status === 'confirmed'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : appt.status === 'in_progress'
                          ? 'bg-blue-500/20 text-blue-400'
                          : appt.status === 'cancelled'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {appt.status}
                    </span>
                    {appt.status === 'scheduled' && (
                      <button
                        onClick={() => handleUpdateAppointmentStatus(appt.id, 'confirmed')}
                        className="px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-semibold rounded-lg transition-all"
                      >
                        Confirm
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {appointments.length === 0 && (
                <div className="text-center py-10 bg-white/[0.02] rounded-xl border border-dashed border-white/10">
                  <span className="text-3xl block mb-2">📅</span>
                  <p className="text-slate-300 text-sm font-medium">No appointments booked today</p>
                  <p className="text-slate-500 text-xs mt-1">Click "Book Appointment" above to schedule one.</p>
                  <button
                    onClick={() => setShowAppointmentModal(true)}
                    className="mt-3 px-4 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-xl shadow transition-all"
                  >
                    Schedule First Appointment
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
            <span className="text-xs text-slate-400">{appointments.length} appointment(s) recorded</span>
            <button
              onClick={() => setShowAppointmentModal(true)}
              className="text-xs text-violet-400 hover:text-violet-300 font-semibold transition-colors flex items-center gap-1"
            >
              + Create Booking →
            </button>
          </div>
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          MODAL 1: REGISTER PATIENT
      ═══════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showRegisterModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface-900 border border-purple-500/30 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-purple-900/40 to-indigo-900/40">
                <div className="flex items-center gap-3">
                  <span className="text-2xl p-2 rounded-xl bg-purple-500/20 text-purple-300">📝</span>
                  <div>
                    <h3 className="text-lg font-bold text-white">Register New Patient</h3>
                    <p className="text-xs text-purple-300/80">Cardiac intake and emergency registration</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowRegisterModal(false)}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center text-sm"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleRegisterPatient} className="p-6 overflow-y-auto space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">First Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh"
                      value={registerForm.first_name}
                      onChange={(e) => setRegisterForm({ ...registerForm, first_name: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-surface-800 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Last Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sharma"
                      value={registerForm.last_name}
                      onChange={(e) => setRegisterForm({ ...registerForm, last_name: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-surface-800 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Age</label>
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={registerForm.age}
                      onChange={(e) => setRegisterForm({ ...registerForm, age: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 bg-surface-800 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Gender</label>
                    <select
                      value={registerForm.gender}
                      onChange={(e) => setRegisterForm({ ...registerForm, gender: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-surface-800 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Blood Group</label>
                    <select
                      value={registerForm.blood_group}
                      onChange={(e) => setRegisterForm({ ...registerForm, blood_group: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-surface-800 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={registerForm.phone}
                      onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-surface-800 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Ward</label>
                    <input
                      type="text"
                      placeholder="e.g. Ward 3B"
                      value={registerForm.ward}
                      onChange={(e) => setRegisterForm({ ...registerForm, ward: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-surface-800 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Bed Number</label>
                    <input
                      type="text"
                      placeholder="e.g. Bed 12"
                      value={registerForm.bed_number}
                      onChange={(e) => setRegisterForm({ ...registerForm, bed_number: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-surface-800 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Admission Reason</label>
                  <input
                    type="text"
                    placeholder="e.g. Chest pain, palpitations, routine heart checkup"
                    value={registerForm.admission_reason}
                    onChange={(e) => setRegisterForm({ ...registerForm, admission_reason: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-surface-800 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Medical History Toggles */}
                <div className="pt-2">
                  <p className="text-xs font-semibold text-slate-300 mb-2">Known Cardiac & Health Risk Factors:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { key: 'has_hypertension', label: 'Hypertension' },
                      { key: 'has_diabetes', label: 'Diabetes' },
                      { key: 'has_previous_heart_disease', label: 'Heart Disease' },
                      { key: 'is_smoker', label: 'Smoker' },
                    ].map(({ key, label }) => (
                      <label
                        key={key}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                          (registerForm as any)[key]
                            ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={(registerForm as any)[key]}
                          onChange={(e) => setRegisterForm({ ...registerForm, [key]: e.target.checked })}
                          className="rounded border-white/20 text-purple-600 focus:ring-purple-500"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowRegisterModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-semibold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={registering}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-bold shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50"
                  >
                    {registering ? 'Registering...' : 'Complete Patient Registration'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════
          MODAL 2: BOOK APPOINTMENT
      ═══════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showAppointmentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface-900 border border-violet-500/30 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-violet-900/40 to-purple-900/40">
                <div className="flex items-center gap-3">
                  <span className="text-2xl p-2 rounded-xl bg-violet-500/20 text-violet-300">📅</span>
                  <div>
                    <h3 className="text-lg font-bold text-white">Book Doctor Appointment</h3>
                    <p className="text-xs text-violet-300/80">Schedule patient consultation with specialist</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAppointmentModal(false)}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center text-sm"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleBookAppointment} className="p-6 overflow-y-auto space-y-4">
                {/* Select Patient */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Select Patient *</label>
                  <select
                    required
                    value={appointmentForm.patient_id}
                    onChange={(e) => setAppointmentForm({ ...appointmentForm, patient_id: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-surface-800 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value={0}>-- Choose Patient --</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.first_name} {p.last_name} ({p.patient_uid || `PAT-${p.id}`}) {p.ward ? `• ${p.ward}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Select Doctor */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Select Doctor *</label>
                  <select
                    required
                    value={appointmentForm.doctor_id}
                    onChange={(e) => setAppointmentForm({ ...appointmentForm, doctor_id: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-surface-800 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value={0}>-- Choose Doctor --</option>
                    {doctors.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.full_name} ({doc.specialization || 'Doctor'}) • {doc.availability_status}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date & Time and Duration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Date & Time *</label>
                    <input
                      type="datetime-local"
                      required
                      value={appointmentForm.scheduled_at}
                      onChange={(e) => setAppointmentForm({ ...appointmentForm, scheduled_at: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-surface-800 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Appointment Type</label>
                    <select
                      value={appointmentForm.appointment_type}
                      onChange={(e) => setAppointmentForm({ ...appointmentForm, appointment_type: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-surface-800 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    >
                      <option value="checkup">Routine Checkup</option>
                      <option value="follow-up">Follow-up Visit</option>
                      <option value="consultation">Cardiology Specialist Consultation</option>
                      <option value="emergency">Emergency Priority</option>
                    </select>
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Reason / Symptoms</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Follow-up on ECG abnormalities, blood pressure check..."
                    value={appointmentForm.reason}
                    onChange={(e) => setAppointmentForm({ ...appointmentForm, reason: e.target.value })}
                    className="w-full px-3.5 py-2 bg-surface-800 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                  />
                </div>

                <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAppointmentModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-semibold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={booking}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-sm font-bold shadow-lg shadow-violet-600/30 transition-all disabled:opacity-50"
                  >
                    {booking ? 'Booking...' : 'Confirm Appointment'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════
          MODAL 3: FIND DOCTOR (SMART SEARCH)
      ═══════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showDoctorModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface-900 border border-indigo-500/30 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-indigo-900/40 to-blue-900/40">
                <div className="flex items-center gap-3">
                  <span className="text-2xl p-2 rounded-xl bg-indigo-500/20 text-indigo-300">🔍</span>
                  <div>
                    <h3 className="text-lg font-bold text-white">Find Doctor & Live Availability</h3>
                    <p className="text-xs text-indigo-300/80">Search doctors by name, specialization, or status</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDoctorModal(false)}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4">
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Search by doctor name or specialization (e.g. Cardiology, Surgery)..."
                    value={doctorSearchQuery}
                    onChange={(e) => setDoctorSearchQuery(e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-surface-800 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {doctorSearchQuery && (
                    <button
                      onClick={() => setDoctorSearchQuery('')}
                      className="px-3 py-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs rounded-xl transition-all"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">
                  {filteredDoctors.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:border-indigo-500/30 hover:bg-white/[0.06] transition-all flex flex-col justify-between"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white text-base font-bold shadow">
                            {doc.full_name.split(' ').slice(-1)[0][0] || 'D'}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">{doc.full_name}</p>
                            <p className="text-xs text-indigo-300">{doc.specialization || 'Cardiologist'} • {doc.department || 'Medicine'}</p>
                          </div>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${
                            doc.availability_status === 'available'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : doc.availability_status === 'busy'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}
                        >
                          {doc.availability_status}
                        </span>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3 text-xs text-slate-400">
                          <span>⭐ {doc.rating_avg ? doc.rating_avg.toFixed(1) : '4.9'}</span>
                          <span>👥 {doc.current_workload || 0} in queue</span>
                        </div>
                        <button
                          onClick={() => {
                            setAppointmentForm((prev) => ({ ...prev, doctor_id: doc.id }));
                            setShowDoctorModal(false);
                            setShowAppointmentModal(true);
                          }}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-all shadow"
                        >
                          Book Patient
                        </button>
                      </div>
                    </div>
                  ))}

                  {filteredDoctors.length === 0 && (
                    <div className="col-span-2 text-center py-8 text-slate-500 text-sm">
                      No doctors matching "{doctorSearchQuery}" found.
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                  <span className="text-xs text-slate-400">{filteredDoctors.length} doctors found</span>
                  <button
                    onClick={() => {
                      setShowDoctorModal(false);
                      navigate('/doctor-search');
                    }}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
                  >
                    Open Full Doctor Search Screen →
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════
          MODAL 4: MANAGE VISITORS
      ═══════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showVisitorModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface-900 border border-fuchsia-500/30 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-fuchsia-900/40 to-pink-900/40">
                <div className="flex items-center gap-3">
                  <span className="text-2xl p-2 rounded-xl bg-fuchsia-500/20 text-fuchsia-300">🎫</span>
                  <div>
                    <h3 className="text-lg font-bold text-white">Visitor Management & Passes</h3>
                    <p className="text-xs text-fuchsia-300/80">Issue passes, check-in, and manage visiting relatives</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowVisitorModal(false)}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>👥</span> Active Visitor Logs
                  </h4>
                  <button
                    onClick={() => setShowNewVisitorForm(!showNewVisitorForm)}
                    className="px-3.5 py-1.5 bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-xs font-bold rounded-xl shadow transition-all"
                  >
                    {showNewVisitorForm ? '✕ Close Form' : '+ Issue New Visitor Pass'}
                  </button>
                </div>

                {/* Form to Register Visitor */}
                {showNewVisitorForm && (
                  <motion.form
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    onSubmit={handleRegisterVisitor}
                    className="p-4 rounded-xl bg-fuchsia-950/30 border border-fuchsia-500/30 space-y-3"
                  >
                    <p className="text-xs font-bold text-fuchsia-300">Issue Visitor Entry Pass</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">Patient to Visit *</label>
                        <select
                          required
                          value={visitorForm.patient_id}
                          onChange={(e) => setVisitorForm({ ...visitorForm, patient_id: Number(e.target.value) })}
                          className="w-full px-3 py-2 bg-surface-800 border border-white/10 rounded-lg text-xs text-white"
                        >
                          <option value={0}>-- Select Patient --</option>
                          {patients.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.first_name} {p.last_name} ({p.ward || 'Ward'})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">Visitor Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="Full Name"
                          value={visitorForm.visitor_name}
                          onChange={(e) => setVisitorForm({ ...visitorForm, visitor_name: e.target.value })}
                          className="w-full px-3 py-2 bg-surface-800 border border-white/10 rounded-lg text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">Phone Number</label>
                        <input
                          type="tel"
                          placeholder="+91 98765 43210"
                          value={visitorForm.phone}
                          onChange={(e) => setVisitorForm({ ...visitorForm, phone: e.target.value })}
                          className="w-full px-3 py-2 bg-surface-800 border border-white/10 rounded-lg text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">Relationship</label>
                        <input
                          type="text"
                          placeholder="e.g. Spouse, Son, Sibling"
                          value={visitorForm.relation}
                          onChange={(e) => setVisitorForm({ ...visitorForm, relation: e.target.value })}
                          className="w-full px-3 py-2 bg-surface-800 border border-white/10 rounded-lg text-xs text-white"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowNewVisitorForm(false)}
                        className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={registeringVisitor}
                        className="px-4 py-1.5 bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-xs font-bold rounded-lg shadow disabled:opacity-50"
                      >
                        {registeringVisitor ? 'Generating...' : 'Issue & Generate QR Token'}
                      </button>
                    </div>
                  </motion.form>
                )}

                {/* Visitor List */}
                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                  {visitors.map((v) => (
                    <div
                      key={v.id}
                      className="p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-fuchsia-500/30 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-fuchsia-600 to-pink-600 flex items-center justify-center text-white text-xs font-bold shadow">
                          {v.visitor_name.split(' ').map((w) => w[0]).join('').slice(0, 2) || 'VI'}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{v.visitor_name}</p>
                          <p className="text-xs text-slate-400">
                            {v.relation ? `${v.relation} • ` : ''} {v.phone || 'No phone'}
                            {v.qr_token && <span className="ml-2 font-mono text-fuchsia-300 text-[10px] bg-fuchsia-500/10 px-1.5 py-0.5 rounded">QR: {v.qr_token}</span>}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase ${
                            v.status === 'checked_in'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : v.status === 'checked_out'
                              ? 'bg-slate-500/20 text-slate-400'
                              : 'bg-blue-500/20 text-blue-400'
                          }`}
                        >
                          {v.status}
                        </span>
                        {v.status === 'registered' && (
                          <button
                            onClick={() => handleVisitorCheckIn(v.id)}
                            className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold rounded-lg transition-all"
                          >
                            Check In
                          </button>
                        )}
                        {v.status === 'checked_in' && (
                          <button
                            onClick={() => handleVisitorCheckOut(v.id)}
                            className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold rounded-lg transition-all"
                          >
                            Check Out
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {visitors.length === 0 && (
                    <div className="text-center py-8 text-slate-500 text-sm">No visitor passes active.</div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
