import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { appointmentsAPI, patientsAPI, doctorAvailabilityAPI } from '../services/api';
import type { Appointment, Patient, DoctorSearchResult } from '../types';

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<DoctorSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  const [form, setForm] = useState({
    patient_id: 0,
    doctor_id: 0,
    scheduled_at: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
    duration_minutes: 30,
    appointment_type: 'checkup',
    reason: '',
    doctor_notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const [apptsRes, patsRes, docsRes] = await Promise.allSettled([
        appointmentsAPI.list({ status: statusFilter || undefined, limit: 100 }),
        patientsAPI.list({ per_page: 100 }),
        doctorAvailabilityAPI.searchAvailable(),
      ]);

      if (apptsRes.status === 'fulfilled') setAppointments(apptsRes.value.data || []);
      if (patsRes.status === 'fulfilled') setPatients(patsRes.value.data.patients || []);
      if (docsRes.status === 'fulfilled') setDoctors(docsRes.value.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patient_id || !form.doctor_id || !form.scheduled_at) {
      toast.error('Please complete all required fields');
      return;
    }
    setSubmitting(true);
    try {
      await appointmentsAPI.create({
        patient_id: Number(form.patient_id),
        doctor_id: Number(form.doctor_id),
        scheduled_at: new Date(form.scheduled_at).toISOString(),
        duration_minutes: Number(form.duration_minutes) || 30,
        appointment_type: form.appointment_type,
        reason: form.reason,
        doctor_notes: form.doctor_notes,
      });
      toast.success('Appointment scheduled successfully! 📅');
      setShowModal(false);
      setForm({
        patient_id: 0,
        doctor_id: 0,
        scheduled_at: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
        duration_minutes: 30,
        appointment_type: 'checkup',
        reason: '',
        doctor_notes: '',
      });
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to book appointment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await appointmentsAPI.update(id, { status });
      toast.success(`Status updated to ${status}`);
      loadData();
    } catch {
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>📅</span> Appointments & Clinical Consultations
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage scheduled patient visits, doctor follow-ups, and specialty consultations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-surface-800 border border-white/10 rounded-xl text-xs text-white"
          >
            <option value="">All Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="confirmed">Confirmed</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-violet-600/30 transition-all flex items-center gap-1.5"
          >
            + Book Appointment
          </button>
        </div>
      </div>

      {/* Appointment Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin w-8 h-8 border-3 border-violet-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-surface-800/50 border border-white/5 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02] text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="px-5 py-4">Patient</th>
                  <th className="px-5 py-4">Doctor</th>
                  <th className="px-5 py-4">Date & Time</th>
                  <th className="px-5 py-4">Type & Reason</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {appointments.map((appt) => (
                  <tr key={appt.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-white">{appt.patient_name}</div>
                      <div className="text-xs text-slate-400">{appt.patient_uid || `#${appt.patient_id}`}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-violet-300">{appt.doctor_name}</div>
                      <div className="text-xs text-slate-400">{appt.doctor_specialization || 'Cardiologist'}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-white font-medium">
                        {new Date(appt.scheduled_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      <div className="text-xs text-slate-400">
                        {new Date(appt.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({appt.duration_minutes || 30} mins)
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs font-semibold uppercase text-slate-300 bg-white/5 px-2 py-0.5 rounded">
                        {appt.appointment_type || 'checkup'}
                      </span>
                      {appt.reason && <p className="text-xs text-slate-400 mt-1 line-clamp-1">{appt.reason}</p>}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${
                          appt.status === 'confirmed'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : appt.status === 'in_progress'
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : appt.status === 'completed'
                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                            : appt.status === 'cancelled'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {appt.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {appt.status === 'scheduled' && (
                          <button
                            onClick={() => handleStatusChange(appt.id, 'confirmed')}
                            className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold rounded-lg transition-all"
                          >
                            Confirm
                          </button>
                        )}
                        {appt.status === 'confirmed' && (
                          <button
                            onClick={() => handleStatusChange(appt.id, 'in_progress')}
                            className="px-2.5 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs font-semibold rounded-lg transition-all"
                          >
                            Start
                          </button>
                        )}
                        {appt.status === 'in_progress' && (
                          <button
                            onClick={() => handleStatusChange(appt.id, 'completed')}
                            className="px-2.5 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-semibold rounded-lg transition-all"
                          >
                            Complete
                          </button>
                        )}
                        {appt.status !== 'cancelled' && appt.status !== 'completed' && (
                          <button
                            onClick={() => handleStatusChange(appt.id, 'cancelled')}
                            className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold rounded-lg transition-all"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {appointments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-500">
                      No appointments matching the selected filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Booking Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface-900 border border-violet-500/30 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-violet-900/40 to-purple-900/40">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>📅</span> Book New Appointment
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center text-sm"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleBook} className="p-6 overflow-y-auto space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Patient *</label>
                  <select
                    required
                    value={form.patient_id}
                    onChange={(e) => setForm({ ...form, patient_id: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-surface-800 border border-white/10 rounded-xl text-sm text-white focus:ring-2 focus:ring-violet-500"
                  >
                    <option value={0}>-- Select Patient --</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.first_name} {p.last_name} ({p.patient_uid || `PAT-${p.id}`})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Doctor *</label>
                  <select
                    required
                    value={form.doctor_id}
                    onChange={(e) => setForm({ ...form, doctor_id: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-surface-800 border border-white/10 rounded-xl text-sm text-white focus:ring-2 focus:ring-violet-500"
                  >
                    <option value={0}>-- Select Doctor --</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.full_name} ({d.specialization || 'Cardiology'}) • {d.availability_status}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Date & Time *</label>
                    <input
                      type="datetime-local"
                      required
                      value={form.scheduled_at}
                      onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-surface-800 border border-white/10 rounded-xl text-sm text-white focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Type</label>
                    <select
                      value={form.appointment_type}
                      onChange={(e) => setForm({ ...form, appointment_type: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-surface-800 border border-white/10 rounded-xl text-sm text-white focus:ring-2 focus:ring-violet-500"
                    >
                      <option value="checkup">Routine Checkup</option>
                      <option value="follow-up">Follow-up</option>
                      <option value="consultation">Consultation</option>
                      <option value="emergency">Emergency Priority</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Reason for Visit</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Chest pain evaluation, medication adjustments..."
                    value={form.reason}
                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                    className="w-full px-3.5 py-2 bg-surface-800 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 resize-none"
                  />
                </div>

                <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-bold shadow-lg disabled:opacity-50"
                  >
                    {submitting ? 'Booking...' : 'Confirm Booking'}
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
