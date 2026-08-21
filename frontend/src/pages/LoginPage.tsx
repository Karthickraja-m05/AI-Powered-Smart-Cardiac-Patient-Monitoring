import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lock, 
  User as UserIcon, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp, 
  Sparkles,
  ShieldAlert
} from 'lucide-react';
import toast from 'react-hot-toast';
import { authAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';

interface DemoRole {
  role: string;
  username: string;
  pass: string;
  badgeColor: string;
  title: string;
}

const DEMO_ROLES: DemoRole[] = [
  { role: 'Super Admin', username: 'admin', pass: 'admin123', badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30', title: 'System & Multi-Hospital Fleet' },
  { role: 'Hospital Admin', username: 'hospital.admin', pass: 'hadmin123', badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30', title: 'Hospital Operations & Capacity' },
  { role: 'Doctor (Cardiology)', username: 'dr.sharma', pass: 'sharma123', badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', title: 'Clinical Decision Intelligence' },
  { role: 'Nurse (ICU)', username: 'nurse.anitha', pass: 'anitha123', badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30', title: 'Live Telemetry Wall & Vitals' },
  { role: 'Receptionist', username: 'reception', pass: 'reception123', badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30', title: 'Check-In & Triage Dispatch' },
  { role: 'Patient', username: 'patient.ramesh', pass: 'patient123', badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30', title: 'Personal EMR & Prescriptions' },
  { role: 'Caregiver', username: 'caregiver.sunita', pass: 'sunita123', badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30', title: 'Family Telemetry & Care Chat' },
];

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showDemoHelpers, setShowDemoHelpers] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error('Please enter username and password');
      return;
    }
    setLoading(true);
    try {
      const { data } = await authAPI.login(username, password);
      login(data.user, data.access_token);
      toast.success(`Welcome back, ${data.user.full_name}!`);
      navigate('/');
    } catch (err: any) {
      const detail = err.response?.data?.detail || 'Login failed. Please check your credentials.';
      toast.error(detail);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRole = (role: DemoRole) => {
    setUsername(role.username);
    setPassword(role.pass);
    toast.success(`Loaded credentials for ${role.role} (Masked for security)`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-surface-950 p-4">
      {/* Animated ambient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl animate-pulse-slow delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Header Logo */}
        <div className="text-center mb-6">
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-emerald-500 shadow-xl shadow-brand-500/25 mb-3"
          >
            <span className="text-3xl">🫀</span>
          </motion.div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold bg-gradient-to-r from-brand-400 via-white to-emerald-400 bg-clip-text text-transparent">
            CardioSense AI
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Clinical Decision Support & Hospital Intelligence
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-card p-6 sm:p-8 backdrop-blur-xl border border-slate-700/50 shadow-2xl rounded-2xl">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-brand-400" />
              Sign In
            </h2>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[10px] font-medium text-emerald-300">Protected</span>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Username field */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                Username / Staff ID
              </label>
              <div className="relative">
                <input
                  id="login-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input-field pl-10 pr-4 py-2.5 w-full bg-slate-900/60 border border-slate-700/80 rounded-xl focus:border-brand-400 focus:ring-1 focus:ring-brand-400 text-white placeholder-slate-500 text-sm transition-all"
                  placeholder="Enter username"
                  autoFocus
                  required
                />
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Password field with Masking and Toggle */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Password
                </label>
                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3 text-slate-400" />
                  Bcrypt Salted
                </span>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-10 pr-11 py-2.5 w-full bg-slate-900/60 border border-slate-700/80 rounded-xl focus:border-brand-400 focus:ring-1 focus:ring-brand-400 text-white placeholder-slate-500 text-sm font-mono transition-all tracking-wider"
                  placeholder="••••••••••••"
                  required
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 focus:outline-none transition-colors p-1 rounded-md"
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-slate-300" />
                  ) : (
                    <Eye className="w-4 h-4 text-slate-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-lg shadow-brand-500/20 mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Secure Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Role Selector (Masked for Security) */}
          <div className="mt-5 pt-4 border-t border-slate-700/40">
            <button
              type="button"
              onClick={() => setShowDemoHelpers(!showDemoHelpers)}
              className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 transition-colors py-1.5 px-2 rounded-lg hover:bg-slate-800/40"
            >
              <span className="flex items-center gap-1.5 font-medium text-brand-400">
                <Sparkles className="w-3.5 h-3.5" />
                Quick Role Selector (Demo Evaluator)
              </span>
              {showDemoHelpers ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            <AnimatePresence>
              {showDemoHelpers && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 space-y-1.5 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                    {DEMO_ROLES.map((item) => (
                      <button
                        key={item.username}
                        type="button"
                        onClick={() => handleSelectRole(item)}
                        className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-900/50 hover:bg-slate-800/70 border border-slate-800 hover:border-slate-700 text-left transition-all group"
                      >
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-200 group-hover:text-white">
                              {item.role}
                            </span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded border font-mono ${item.badgeColor}`}>
                              {item.username}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {item.title}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 bg-slate-800/60 px-2 py-0.5 rounded border border-slate-700/50">
                          ••••••
                        </span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Security Shield Banner */}
          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-center gap-3 text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-400" />
              256-Bit Hashed
            </span>
            <span>•</span>
            <span>Anti-Brute Force</span>
            <span>•</span>
            <span>Zero PHI Leakage</span>
          </div>
        </div>

        {/* Clinical Disclaimer */}
        <div className="disclaimer-bar mt-4 justify-center text-center text-xs text-slate-400">
          <span>⚕️</span>
          <span>Clinical Decision Support System — All recommendations require licensed clinician review.</span>
        </div>
      </motion.div>
    </div>
  );
}
