import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI, doctorAvailabilityAPI } from '../../services/api';
import type { CaregiverDashboardData, DoctorSearchResult } from '../../types';

export default function CaregiverDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<CaregiverDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDoctorSearch, setShowDoctorSearch] = useState(false);
  const [availableDoctors, setAvailableDoctors] = useState<DoctorSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    dashboardAPI.getCaregiverDashboard().then(res => { setData(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const searchDoctors = async () => {
    setSearchLoading(true);
    setShowDoctorSearch(true);
    try {
      const res = await doctorAvailabilityAPI.searchAvailable({
        specialization: data?.assigned_doctor?.specialization || 'Cardiology',
        sort_by: 'workload',
      });
      setAvailableDoctors(res.data);
    } catch (e) { console.error(e); }
    setSearchLoading(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-orange-400 border-t-transparent rounded-full" /></div>;

  const d = data;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white">Caregiver Portal</h1>
        <p className="text-orange-400 text-sm mt-1">Care for {d?.patient_name || 'your loved one'}</p>
      </motion.div>

      {/* Emergency Button */}
      <motion.button
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold text-lg shadow-lg shadow-red-500/30"
      >
        🚨 Emergency Contact
      </motion.button>

      {/* Patient Status Card */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        className="bg-surface-800/50 border border-orange-500/20 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Patient Status</h3>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${
            d?.patient_status === 'icu' ? 'bg-red-500/20 text-red-400' :
            d?.patient_status === 'emergency' ? 'bg-orange-500/20 text-orange-400' :
            'bg-emerald-500/20 text-emerald-400'
          }`}>{d?.patient_status || 'Unknown'}</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-400">Patient</p>
            <p className="text-sm font-medium text-white">{d?.patient_name || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Room</p>
            <p className="text-sm font-medium text-white">{d?.room_number || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Ward</p>
            <p className="text-sm font-medium text-white">{d?.ward || 'N/A'}</p>
          </div>
        </div>
      </motion.div>

      {/* Doctor Info & Availability */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
        className="bg-surface-800/50 border border-white/5 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">👨‍⚕️ Assigned Doctor</h3>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${d?.doctor_available ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`} />
            <span className={`text-xs font-medium ${d?.doctor_available ? 'text-emerald-400' : 'text-red-400'}`}>
              {d?.assigned_doctor?.availability || (d?.doctor_available ? 'Available' : 'Unavailable')}
            </span>
          </div>
        </div>

        {d?.assigned_doctor && (
          <div className="mb-4">
            <p className="text-white font-medium">{d.assigned_doctor.name}</p>
            <p className="text-sm text-orange-400">{d.assigned_doctor.specialization}</p>
          </div>
        )}

        {!d?.doctor_available && (
          <button
            onClick={searchDoctors}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold text-sm shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 transition-all"
          >
            🔍 Find Another Doctor
          </button>
        )}
      </motion.div>

      {/* Doctor Search Results */}
      {showDoctorSearch && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-surface-800/50 border border-orange-500/20 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">🔍 Available Doctors</h3>
          {searchLoading ? (
            <div className="flex justify-center py-8"><div className="animate-spin w-6 h-6 border-2 border-orange-400 border-t-transparent rounded-full" /></div>
          ) : (
            <div className="space-y-3">
              {availableDoctors.slice(0, 3).map((doc, i) => (
                <div key={doc.id} className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-orange-500/20 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-bold text-sm">
                        #{i + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{doc.full_name}</p>
                        <p className="text-xs text-orange-400">{doc.specialization}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] text-slate-400">{doc.experience_years || 0} yrs exp</span>
                          <span className="text-[10px] text-amber-400">★ {doc.rating_avg?.toFixed(1) || 'N/A'}</span>
                          <span className="text-[10px] text-slate-400">{doc.current_workload} patients</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Wait: ~{doc.estimated_wait_minutes} min</p>
                      <button className="mt-2 px-3 py-1.5 rounded-lg bg-orange-500/20 text-orange-400 text-xs font-semibold hover:bg-orange-500/30 transition-colors">
                        Request
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {availableDoctors.length === 0 && (
                <p className="text-slate-500 text-sm text-center py-4">No available doctors found</p>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* Current Vitals */}
      {d?.current_vitals && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          className="bg-surface-800/50 border border-white/5 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">💓 Current Vitals</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Heart Rate', value: `${Math.round(d.current_vitals.heart_rate || 0)} bpm`, icon: '❤️' },
              { label: 'SpO₂', value: `${Math.round(d.current_vitals.spo2 || 0)}%`, icon: '🫁' },
              { label: 'Temperature', value: `${d.current_vitals.temperature || 0}°C`, icon: '🌡️' },
              { label: 'BP', value: `${d.current_vitals.bp_systolic || 0}/${d.current_vitals.bp_diastolic || 0}`, icon: '🩺' },
            ].map(vital => (
              <div key={vital.label} className="p-3 rounded-xl bg-white/5 text-center">
                <span className="text-lg">{vital.icon}</span>
                <p className="text-lg font-bold text-white mt-1">{vital.value}</p>
                <p className="text-[10px] text-slate-400">{vital.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Medications */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
        className="bg-surface-800/50 border border-white/5 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">💊 Medication Schedule</h3>
        <div className="space-y-2">
          {(d?.medications || []).map((m: any) => (
            <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
              <div>
                <p className="text-sm font-medium text-white">{m.medicine_name} — {m.dose}</p>
                <p className="text-xs text-slate-400">{m.frequency}</p>
              </div>
              <span className="text-lg">💊</span>
            </div>
          ))}
          {(!d?.medications || d.medications.length === 0) && (
            <p className="text-slate-500 text-sm text-center py-4">No active medications</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
