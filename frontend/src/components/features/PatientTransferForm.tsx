import { useState } from 'react';
import { motion } from 'framer-motion';
import { transfersAPI } from '../../services/api';

interface Props {
  patientId: number;
  currentDoctor?: { id: number; name: string };
  currentWard?: string;
  currentRoom?: string;
  currentBed?: string;
  onTransfer?: () => void;
}

export default function PatientTransferForm({ patientId, currentDoctor, currentWard, currentRoom, currentBed, onTransfer }: Props) {
  const [transferType, setTransferType] = useState<'doctor' | 'ward' | 'room' | 'hospital'>('ward');
  const [form, setForm] = useState({
    to_doctor_id: '', to_ward: '', to_room: '', to_bed: '', to_hospital_id: '', reason: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleTransfer = async () => {
    setSubmitting(true);
    try {
      await transfersAPI.create({
        patient_id: patientId,
        transfer_type: transferType,
        to_doctor_id: form.to_doctor_id ? parseInt(form.to_doctor_id) : undefined,
        to_ward: form.to_ward || undefined,
        to_room: form.to_room || undefined,
        to_bed: form.to_bed || undefined,
        to_hospital_id: form.to_hospital_id ? parseInt(form.to_hospital_id) : undefined,
        reason: form.reason || undefined,
      });
      setSuccess(true);
      onTransfer?.();
    } catch (e) { console.error(e); }
    setSubmitting(false);
  };

  if (success) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 text-center">
        <span className="text-4xl block mb-2">✅</span>
        <p className="text-emerald-400 font-semibold">Transfer completed successfully</p>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="bg-surface-800/50 border border-white/5 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">🔄 Transfer Patient</h3>

      {/* Current Location */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 p-3 rounded-xl bg-white/5">
        <div><p className="text-[10px] text-slate-500 uppercase">Doctor</p><p className="text-xs text-white">{currentDoctor?.name || 'N/A'}</p></div>
        <div><p className="text-[10px] text-slate-500 uppercase">Ward</p><p className="text-xs text-white">{currentWard || 'N/A'}</p></div>
        <div><p className="text-[10px] text-slate-500 uppercase">Room</p><p className="text-xs text-white">{currentRoom || 'N/A'}</p></div>
        <div><p className="text-[10px] text-slate-500 uppercase">Bed</p><p className="text-xs text-white">{currentBed || 'N/A'}</p></div>
      </div>

      {/* Transfer Type */}
      <div className="flex gap-2 mb-4">
        {[
          { key: 'ward' as const, label: '🏢 Ward', },
          { key: 'room' as const, label: '🚪 Room', },
          { key: 'doctor' as const, label: '⚕️ Doctor', },
          { key: 'hospital' as const, label: '🏥 Hospital', },
        ].map(tt => (
          <button key={tt.key} onClick={() => setTransferType(tt.key)}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
              transferType === tt.key
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10'
            }`}>
            {tt.label}
          </button>
        ))}
      </div>

      {/* Transfer Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        {(transferType === 'doctor' || transferType === 'hospital') && (
          <input placeholder={transferType === 'doctor' ? "New Doctor ID" : "New Hospital ID"}
            value={transferType === 'doctor' ? form.to_doctor_id : form.to_hospital_id}
            onChange={e => setForm(f => transferType === 'doctor' ? {...f, to_doctor_id: e.target.value} : {...f, to_hospital_id: e.target.value})}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
        )}
        {(transferType === 'ward' || transferType === 'room') && (
          <>
            <input placeholder="New Ward" value={form.to_ward}
              onChange={e => setForm(f => ({...f, to_ward: e.target.value}))}
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
            <input placeholder="New Room" value={form.to_room}
              onChange={e => setForm(f => ({...f, to_room: e.target.value}))}
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
            <input placeholder="New Bed" value={form.to_bed}
              onChange={e => setForm(f => ({...f, to_bed: e.target.value}))}
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
          </>
        )}
      </div>

      <textarea placeholder="Reason for transfer..." value={form.reason} rows={2}
        onChange={e => setForm(f => ({...f, reason: e.target.value}))}
        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-none mb-4" />

      <button onClick={handleTransfer} disabled={submitting}
        className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/25 disabled:opacity-50 transition-all">
        {submitting ? 'Transferring...' : '🔄 Execute Transfer'}
      </button>
    </motion.div>
  );
}
