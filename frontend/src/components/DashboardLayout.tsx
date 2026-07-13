import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore';

interface Props {
  children: React.ReactNode;
}

const navItems = [
  { path: '/', icon: '📊', label: 'Dashboard' },
  { path: '/patients', icon: '👥', label: 'Patients' },
  { path: '/monitoring', icon: '💓', label: 'Live Monitoring' },
];

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  hospital_admin: 'Hospital Admin',
  doctor: 'Doctor',
  nurse: 'Nurse',
  receptionist: 'Receptionist',
  patient: 'Patient',
};

export default function DashboardLayout({ children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.full_name
    ?.split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Mobile Overlay ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Sidebar ── */}
      <aside
        className={`
          fixed lg:relative z-50 h-full flex flex-col
          bg-surface-950/95 backdrop-blur-xl border-r border-white/5
          transition-all duration-300 ease-in-out sidebar-gradient
          ${sidebarOpen ? 'w-64' : 'w-20'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/5">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-brand-500/20">
            <span className="text-xl animate-heartbeat">🫀</span>
          </div>
          {sidebarOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overflow-hidden">
              <h1 className="text-base font-display font-bold text-white whitespace-nowrap">CardioSense AI</h1>
              <p className="text-[10px] text-slate-500 whitespace-nowrap">Patient Monitoring</p>
            </motion.div>
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'active' : ''} ${!sidebarOpen ? 'justify-center px-0' : ''}`
              }
            >
              <span className="text-lg flex-shrink-0">{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Collapse Toggle (desktop) */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="hidden lg:flex items-center justify-center p-3 mx-3 mb-2 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
        >
          {sidebarOpen ? '◀' : '▶'}
        </button>

        {/* User Profile */}
        <div className="border-t border-white/5 p-4">
          <div className={`flex items-center gap-3 ${!sidebarOpen ? 'justify-center' : ''}`}>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {initials}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">{user?.full_name}</p>
                <p className="text-[10px] text-slate-500">{roleLabels[user?.role || ''] || user?.role}</p>
              </div>
            )}
            {sidebarOpen && (
              <button
                onClick={handleLogout}
                className="btn-icon flex-shrink-0"
                title="Logout"
              >
                🚪
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-y-auto">
        {/* Top bar (mobile) */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-white/5 bg-surface-900/80 backdrop-blur-sm sticky top-0 z-30">
          <button
            onClick={() => setMobileOpen(true)}
            className="btn-icon"
          >
            ☰
          </button>
          <span className="text-sm font-semibold text-brand-400 font-display">CardioSense AI</span>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white text-[10px] font-bold">
            {initials}
          </div>
        </div>

        {/* Medical Disclaimer Bar */}
        <div className="disclaimer-bar mx-4 lg:mx-6 mt-4 mb-2">
          <span>⚕️</span>
          <span>Clinical decision support tool only — does NOT diagnose medical conditions. All results must be reviewed by licensed clinicians.</span>
        </div>

        {/* Page Content */}
        <div className="p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
