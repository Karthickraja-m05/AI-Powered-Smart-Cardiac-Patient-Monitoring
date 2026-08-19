import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { patientsAPI, doctorAvailabilityAPI } from '../../services/api';
import type { DoctorSearchResult, Patient } from '../../types';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const DEPARTMENTS = [
  'Cardiology (General)',
  'Cardiac Electrophysiology',
  'Interventional Cardiology',
  'Cardiothoracic Surgery',
  'Cardiac Intensive Care (CICU)',
  'Preventive Cardiology',
  'Emergency Cardiac Care',
];
const WARDS = [
  { name: 'Cardiac ICU (CICU)', beds: ['Bed ICU-01', 'Bed ICU-02', 'Bed ICU-03', 'Bed ICU-04'] },
  { name: 'Coronary Care Unit (CCU)', beds: ['Bed CCU-101', 'Bed CCU-102', 'Bed CCU-103', 'Bed CCU-104'] },
  { name: 'Cardiac Step-Down Ward', beds: ['Bed SD-201', 'Bed SD-202', 'Bed SD-203', 'Bed SD-204'] },
  { name: 'General Ward A (Male)', beds: ['Bed A-101', 'Bed A-102', 'Bed A-103', 'Bed A-104'] },
  { name: 'General Ward B (Female)', beds: ['Bed B-201', 'Bed B-202', 'Bed B-203', 'Bed B-204'] },
];

export default function RegisterPatientPage() {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState<DoctorSearchResult[]>([]);
  const [recentPatients, setRecentPatients] = useState<Patient[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [registeredSuccess, setRegisteredSuccess] = useState<any | null>(null);

  // Form State
  const [form, setForm] = useState({
    // Section 1: Demographics
    first_name: '',
    last_name: '',
    date_of_birth: '1980-05-15',
    age: 46,
    gender: 'Male',
    blood_group: 'O+',
    // Section 2: Contact & Emergency
    phone: '',
    email: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_relation: 'Spouse',
    // Section 3: Clinical & Ward
    department: 'Cardiology (General)',
    ward: 'Cardiac Step-Down Ward',
    bed_number: 'Bed SD-201',
    room_number: 'Room 201',
    assigned_doctor_id: 0,
    admission_reason: '',
    primary_symptoms: 'Chest tightness, palpitations',
    admission_type: 'Urgent Observation',
    // Section 4: Cardiac Risk Factors
    has_hypertension: false,
    has_diabetes: false,
    has_previous_heart_disease: false,
    is_smoker: false,
    alcohol_use: false,
    has_kidney_disease: false,
    allergies: '',
  });

  useEffect(() => {
    doctorAvailabilityAPI
      .searchAvailable()
      .then((res) => setDoctors(res.data || []))
      .catch(console.error);

    patientsAPI
      .list({ per_page: 5 })
      .then((res) => setRecentPatients(res.data.patients || []))
      .catch(console.error);
  }, []);

  // Sync age with date of birth
  const handleDOBChange = (dob: string) => {
    setForm((prev) => {
      const birthYear = new Date(dob).getFullYear();
      const calculatedAge = Math.max(1, new Date().getFullYear() - birthYear);
      return { ...prev, date_of_birth: dob, age: calculatedAge };
    });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim()) {
      toast.error('First and Last Name are required');
      return;
    }
    if (!form.phone.trim()) {
      toast.error('Primary contact phone is required');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        date_of_birth: form.date_of_birth,
        age: Number(form.age),
        assigned_doctor_id: Number(form.assigned_doctor_id) || undefined,
        medical_history: `Admission Type: ${form.admission_type}; Symptoms: ${form.primary_symptoms}`,
      };

      const res = await patientsAPI.create(payload);
      const generatedUid = res.data?.patient_uid || `CS-${Math.floor(100000 + Math.random() * 900000)}`;

      toast.success(`Patient ${form.first_name} ${form.last_name} registered successfully! UID: ${generatedUid}`);

      setRegisteredSuccess({
        ...form,
        id: res.data?.id || Date.now(),
        patient_uid: generatedUid,
        created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });

      // Refresh recent patients
      patientsAPI
        .list({ per_page: 5 })
        .then((r) => setRecentPatients(r.data.patients || []))
        .catch(console.error);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to register patient');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm({
      first_name: '',
      last_name: '',
      date_of_birth: '1980-05-15',
      age: 46,
      gender: 'Male',
      blood_group: 'O+',
      phone: '',
      email: '',
      address: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      emergency_relation: 'Spouse',
      department: 'Cardiology (General)',
      ward: 'Cardiac Step-Down Ward',
      bed_number: 'Bed SD-201',
      room_number: 'Room 201',
      assigned_doctor_id: 0,
      admission_reason: '',
      primary_symptoms: 'Chest tightness, palpitations',
      admission_type: 'Urgent Observation',
      has_hypertension: false,
      has_diabetes: false,
      has_previous_heart_disease: false,
      is_smoker: false,
      alcohol_use: false,
      has_kidney_disease: false,
      allergies: '',
    });
    setRegisteredSuccess(null);
  };

  // Selected doctor info
  const selectedDoctor = doctors.find((d) => d.id === Number(form.assigned_doctor_id));

  // Count filled checklist items
  const checklistItems = [
    { label: 'Patient Full Name', isDone: Boolean(form.first_name.trim() && form.last_name.trim()) },
    { label: 'Primary Contact Phone', isDone: Boolean(form.phone.trim()) },
    { label: 'Ward & Bed Allocation', isDone: Boolean(form.ward && form.bed_number) },
    { label: 'Emergency Contact Info', isDone: Boolean(form.emergency_contact_name.trim() && form.emergency_contact_phone.trim()) },
    { label: 'Admission Reason & Symptoms', isDone: Boolean(form.admission_reason.trim() || form.primary_symptoms.trim()) },
  ];
  const completedChecklistCount = checklistItems.filter((i) => i.isDone).length;

  return (
    <div className="space-y-6 pb-16">
      {/* ── Header Banner: Royal Indigo/Violet Visual Identity ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-950/50 via-purple-950/30 to-surface-900 border border-indigo-500/25 p-5 shadow-2xl backdrop-blur-xl"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 p-3.5 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl shadow-lg shadow-indigo-500/25 border border-indigo-400/30 flex-shrink-0">
              📝
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
                  Patient Registration & Clinical Intake
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                  Intake Terminal
                </span>
              </div>
              <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
                Structured clinical admission form with automated UID creation, bed allocation & emergency contact records.
              </p>
            </div>
          </div>

          {/* Intake Readiness Badge */}
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-3">
              <div className="text-right">
                <p className="text-[10px] uppercase font-bold text-indigo-300">Intake Progress</p>
                <p className="text-xs font-bold text-white">
                  {completedChecklistCount} of {checklistItems.length} complete
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-xs">
                {Math.round((completedChecklistCount / checklistItems.length) * 100)}%
              </div>
            </div>

            <button
              onClick={resetForm}
              className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold rounded-xl border border-white/10 transition-all"
            >
              Clear Form
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Main Registration Studio Layout ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* ══════════════════════════════════════════════════════════════
            LEFT COLUMN (8 Cols): 4 Structured Step-Like Partition Cards
        ══════════════════════════════════════════════════════════════ */}
        <form onSubmit={handleRegister} className="xl:col-span-8 space-y-5">
          {/* ── CARD 1: Demographics & Identity ── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-surface-850 border border-white/10 p-5 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-xs">
                  1
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white">Patient Identity & Demographics</h3>
                  <p className="text-[11px] text-slate-400">Personal details, age, gender and blood group</p>
                </div>
              </div>
              <span className="text-[11px] text-indigo-400 font-semibold bg-indigo-500/10 px-2 py-0.5 rounded">
                Required
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  First Name <span className="text-indigo-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh"
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-surface-900 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Last Name <span className="text-indigo-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sharma"
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-surface-900 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Date of Birth</label>
                <input
                  type="date"
                  value={form.date_of_birth}
                  onChange={(e) => handleDOBChange(e.target.value)}
                  className="w-full px-3.5 py-2 bg-surface-900 border border-white/10 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Age</label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 bg-surface-900 border border-white/10 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Gender</label>
                <select
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  className="w-full px-3.5 py-2 bg-surface-900 border border-white/10 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Blood Group</label>
              <div className="flex flex-wrap gap-2">
                {BLOOD_GROUPS.map((bg) => (
                  <button
                    type="button"
                    key={bg}
                    onClick={() => setForm({ ...form, blood_group: bg })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      form.blood_group === bg
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
                    }`}
                  >
                    {bg}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* ── CARD 2: Contact & Emergency Information ── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl bg-surface-850 border border-white/10 p-5 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold text-xs">
                  2
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white">Contact & Emergency Next of Kin</h3>
                  <p className="text-[11px] text-slate-400">Primary phone, address and emergency contact person</p>
                </div>
              </div>
              <span className="text-[11px] text-purple-400 font-semibold bg-purple-500/10 px-2 py-0.5 rounded">
                Contact
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Primary Phone Number <span className="text-purple-400">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-surface-900 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
                <input
                  type="email"
                  placeholder="patient@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-surface-900 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Residential Address & City</label>
              <input
                type="text"
                placeholder="Flat 402, Green Meadows, MG Road, Bengaluru"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-surface-900 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Emergency Contact Block */}
            <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/20 space-y-3">
              <p className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                <span>🚨</span> Emergency Contact Details (Immediate Family)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Contact Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Sunita Sharma"
                    value={form.emergency_contact_name}
                    onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-900 border border-white/10 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Emergency Phone</label>
                  <input
                    type="tel"
                    placeholder="+91 98450 11223"
                    value={form.emergency_contact_phone}
                    onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-900 border border-white/10 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Relationship</label>
                  <select
                    value={form.emergency_relation}
                    onChange={(e) => setForm({ ...form, emergency_relation: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-900 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="Spouse">Spouse</option>
                    <option value="Son">Son</option>
                    <option value="Daughter">Daughter</option>
                    <option value="Parent">Parent</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Friend">Friend</option>
                  </select>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── CARD 3: Clinical Intake & Ward Allocation ── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl bg-surface-850 border border-white/10 p-5 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-300 flex items-center justify-center font-bold text-xs">
                  3
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white">Clinical Intake & Ward Allocation</h3>
                  <p className="text-[11px] text-slate-400">Department, ward, bed and assigned cardiologist</p>
                </div>
              </div>
              <span className="text-[11px] text-blue-400 font-semibold bg-blue-500/10 px-2 py-0.5 rounded">
                Clinical
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Admission Type</label>
                <select
                  value={form.admission_type}
                  onChange={(e) => setForm({ ...form, admission_type: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-surface-900 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Routine Checkup">Routine Cardiac Checkup</option>
                  <option value="Urgent Observation">Urgent Observation (Step-Down)</option>
                  <option value="Cardiac ICU Admission">Emergency ICU Admission</option>
                  <option value="Surgical Intake">Pre-Operative Surgical Intake</option>
                  <option value="Outpatient Consultation">Outpatient Triage</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Department</label>
                <select
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-surface-900 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Ward & Bed Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Assigned Ward</label>
                <select
                  value={form.ward}
                  onChange={(e) => {
                    const selectedWard = WARDS.find((w) => w.name === e.target.value);
                    setForm({
                      ...form,
                      ward: e.target.value,
                      bed_number: selectedWard?.beds[0] || 'Bed 101',
                    });
                  }}
                  className="w-full px-3.5 py-2 bg-surface-900 border border-white/10 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {WARDS.map((w) => (
                    <option key={w.name} value={w.name}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Bed Number</label>
                <input
                  type="text"
                  placeholder="e.g. Bed SD-201"
                  value={form.bed_number}
                  onChange={(e) => setForm({ ...form, bed_number: e.target.value })}
                  className="w-full px-3.5 py-2 bg-surface-900 border border-white/10 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Admitting Doctor</label>
                <select
                  value={form.assigned_doctor_id}
                  onChange={(e) => setForm({ ...form, assigned_doctor_id: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 bg-surface-900 border border-white/10 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={0}>-- Auto-Assign Available --</option>
                  {doctors.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.full_name} ({doc.specialization || 'Cardiologist'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Admission Reason & Symptoms */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Primary Admission Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Recurrent angina, post-MI follow-up, ECG irregularity"
                  value={form.admission_reason}
                  onChange={(e) => setForm({ ...form, admission_reason: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-surface-900 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Reported Symptoms</label>
                <input
                  type="text"
                  placeholder="e.g. Chest tightness, shortness of breath, dizziness"
                  value={form.primary_symptoms}
                  onChange={(e) => setForm({ ...form, primary_symptoms: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-surface-900 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </motion.div>

          {/* ── CARD 4: Cardiac Risk Factors & Medical History ── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl bg-surface-850 border border-white/10 p-5 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-300 flex items-center justify-center font-bold text-xs">
                  4
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white">Cardiac Risk Factors & Medical Profile</h3>
                  <p className="text-[11px] text-slate-400">Pre-existing cardiovascular conditions and risk indicators</p>
                </div>
              </div>
              <span className="text-[11px] text-rose-400 font-semibold bg-rose-500/10 px-2 py-0.5 rounded">
                Risk Factors
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
              {[
                { key: 'has_hypertension', label: 'Hypertension', icon: '🩺' },
                { key: 'has_diabetes', label: 'Diabetes (Type 2)', icon: '🩸' },
                { key: 'has_previous_heart_disease', label: 'Heart Disease', icon: '❤️' },
                { key: 'is_smoker', label: 'Smoker History', icon: '🚬' },
                { key: 'alcohol_use', label: 'Alcohol Use', icon: '🍷' },
                { key: 'has_kidney_disease', label: 'Renal / Kidney', icon: '🧬' },
              ].map(({ key, label, icon }) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => setForm({ ...form, [key]: !(form as any)[key] })}
                  className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    (form as any)[key]
                      ? 'bg-rose-500/20 border-rose-500/50 text-rose-200 shadow-md shadow-rose-950/40'
                      : 'bg-surface-900 border-white/5 text-slate-400 hover:border-white/20 hover:text-slate-200'
                  }`}
                >
                  <span className="text-lg">{icon}</span>
                  <span className="text-center text-[11px] leading-tight">{label}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                    (form as any)[key] ? 'bg-rose-500 text-white' : 'bg-white/10 text-slate-400'
                  }`}>
                    {(form as any)[key] ? 'YES' : 'NO'}
                  </span>
                </button>
              ))}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Known Drug Allergies & Precautions</label>
              <input
                type="text"
                placeholder="e.g. Penicillin, Aspirin intolerance, Contrast dye allergy"
                value={form.allergies}
                onChange={(e) => setForm({ ...form, allergies: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-surface-900 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </motion.div>

          {/* ── Submit Action Footer ── */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-400">
              * By registering, a unique patient record will be synced across CardioSense AI telemetry.
            </p>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={resetForm}
                className="px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-semibold transition-all w-full sm:w-auto"
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-sm shadow-xl shadow-indigo-600/30 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 w-full sm:w-auto cursor-pointer"
              >
                <span>{submitting ? 'Registering...' : '✨ Complete Patient Admission'}</span>
              </button>
            </div>
          </div>
        </form>

        {/* ══════════════════════════════════════════════════════════════
            RIGHT COLUMN (4 Cols): Live Patient Badge Preview & Checklist
        ══════════════════════════════════════════════════════════════ */}
        <div className="xl:col-span-4 space-y-5">
          {/* ── Live Digital Patient Badge Preview ── */}
          <motion.div
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-2xl bg-gradient-to-br from-indigo-950/60 via-surface-850 to-surface-900 border border-indigo-500/30 p-5 shadow-2xl relative overflow-hidden"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>🪪</span> Live Patient Badge
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {registeredSuccess?.patient_uid || 'PREVIEW'}
              </span>
            </div>

            <div className="pt-4 flex flex-col items-center text-center space-y-3">
              {/* Avatar Initial */}
              <div className="w-18 h-18 p-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-indigo-600/30 border border-indigo-300/30">
                {form.first_name || form.last_name
                  ? `${form.first_name?.[0] || ''}${form.last_name?.[0] || ''}`.toUpperCase()
                  : 'PT'}
              </div>

              <div>
                <h4 className="text-lg font-black text-white">
                  {form.first_name || form.last_name
                    ? `${form.first_name} ${form.last_name}`
                    : 'New Patient Name'}
                </h4>
                <p className="text-xs text-indigo-300 font-semibold mt-0.5">
                  {form.age} yrs • {form.gender} • Blood Group: <span className="text-white font-bold">{form.blood_group}</span>
                </p>
              </div>

              {/* Location Badge */}
              <div className="w-full p-3 rounded-xl bg-white/[0.04] border border-white/10 text-left space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Ward Unit:</span>
                  <span className="font-bold text-white">{form.ward}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Assigned Bed:</span>
                  <span className="font-mono text-indigo-300 font-bold">{form.bed_number}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Cardiologist:</span>
                  <span className="text-slate-200 truncate max-w-[140px]">
                    {selectedDoctor?.full_name || 'Dr. Assigned on Duty'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Contact:</span>
                  <span className="text-slate-300">{form.phone || 'Pending'}</span>
                </div>
              </div>

              {/* Risk Flags Count */}
              <div className="w-full pt-1 flex items-center justify-between text-xs px-1">
                <span className="text-slate-400">Active Risk Factors:</span>
                <span className="font-bold text-rose-400">
                  {[
                    form.has_hypertension,
                    form.has_diabetes,
                    form.has_previous_heart_disease,
                    form.is_smoker,
                    form.alcohol_use,
                    form.has_kidney_disease,
                  ].filter(Boolean).length}{' '}
                  identified
                </span>
              </div>
            </div>

            {/* Success Notification Box */}
            {registeredSuccess && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-4 p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs text-center space-y-2"
              >
                <p className="font-bold">✅ Registered Successfully!</p>
                <p className="text-[11px] text-emerald-200">UID: {registeredSuccess.patient_uid}</p>
                <div className="flex gap-2 justify-center pt-1">
                  <button
                    onClick={() => navigate(`/patients/${registeredSuccess.id}`)}
                    className="px-3 py-1 bg-emerald-600 text-white font-bold rounded-lg text-xs"
                  >
                    View Patient Chart →
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* ── Intake Checklist ── */}
          <div className="rounded-2xl bg-surface-850 border border-white/10 p-5 shadow-xl space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <span>📋</span> Admission Checklist
            </h4>
            <div className="space-y-2">
              {checklistItems.map((item, i) => (
                <div
                  key={i}
                  className={`p-2.5 rounded-xl text-xs flex items-center justify-between transition-all ${
                    item.isDone
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                      : 'bg-white/[0.02] border border-white/5 text-slate-400'
                  }`}
                >
                  <span>{item.label}</span>
                  <span className="font-bold">{item.isDone ? '✓ Done' : '○ Pending'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Recent Registrations Queue ── */}
          <div className="rounded-2xl bg-surface-850 border border-white/10 p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <span>⏱️</span> Recent Registrations
              </h4>
              <button
                onClick={() => navigate('/patients')}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold"
              >
                All →
              </button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {recentPatients.map((rp) => (
                <div
                  key={rp.id}
                  onClick={() => navigate(`/patients/${rp.id}`)}
                  className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-indigo-500/30 hover:bg-white/[0.05] transition-all cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-xs">
                      {(rp.first_name?.[0] || 'P').toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">
                        {rp.first_name} {rp.last_name}
                      </p>
                      <p className="text-[10px] text-slate-400">{rp.patient_uid || `PAT-${rp.id}`}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-medium text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                    {rp.ward || 'Ward A'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
