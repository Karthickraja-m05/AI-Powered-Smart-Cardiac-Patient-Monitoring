import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { authAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
      toast.error(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-surface-950">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl animate-pulse-slow delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-emerald-500 shadow-2xl shadow-brand-500/30 mb-4"
          >
            <span className="text-4xl">🫀</span>
          </motion.div>
          <h1 className="text-3xl font-display font-bold bg-gradient-to-r from-brand-400 via-white to-emerald-400 bg-clip-text text-transparent">
            CardioSense AI
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Smart Cardiac Patient Monitoring System
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-card p-8">
          <h2 className="text-xl font-semibold text-center mb-6">Sign In</h2>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                Username
              </label>
              <input
                id="login-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-field"
                placeholder="Enter username"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="Enter password"
              />
            </div>

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>🔐 Sign In</>
              )}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 p-4 bg-brand-500/5 border border-brand-500/10 rounded-xl">
            <p className="text-xs font-semibold text-brand-400 mb-2">Demo Credentials</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
              <div>
                <span className="text-slate-500">Admin:</span>{' '}
                <button
                  className="text-brand-400 hover:underline"
                  onClick={() => { setUsername('admin'); setPassword('cardio123'); }}
                >
                  admin
                </button>
              </div>
              <div>
                <span className="text-slate-500">Doctor:</span>{' '}
                <button
                  className="text-brand-400 hover:underline"
                  onClick={() => { setUsername('dr.sharma'); setPassword('cardio123'); }}
                >
                  dr.sharma
                </button>
              </div>
              <div>
                <span className="text-slate-500">Nurse:</span>{' '}
                <button
                  className="text-brand-400 hover:underline"
                  onClick={() => { setUsername('nurse.anitha'); setPassword('cardio123'); }}
                >
                  nurse.anitha
                </button>
              </div>
              <div>
                <span className="text-slate-500">Password:</span>{' '}
                <span className="text-slate-300 font-mono">cardio123</span>
              </div>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="disclaimer-bar mt-4 justify-center text-center">
          <span>⚕️</span>
          <span>Clinical decision support tool — not for diagnosis. Results must be reviewed by clinicians.</span>
        </div>
      </motion.div>
    </div>
  );
}
