import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import type { UserRole } from '../../types';

interface LayoutConfig {
  title: string;
  subtitle: string;
  icon: string;
  navItems: { path: string; icon: string; label: string }[];
  themeClass: string;
  gradientFrom: string;
  gradientTo: string;
  accentColor: string;
}

const layoutConfigs: Record<UserRole, LayoutConfig> = {
  super_admin: {
    title: 'CardioSense AI',
    subtitle: 'Super Admin Console',
    icon: '🏛️',
    themeClass: 'theme-superadmin',
    gradientFrom: 'from-slate-700',
    gradientTo: 'to-slate-900',
    accentColor: 'text-amber-400',
    navItems: [
      { path: '/', icon: '📊', label: 'Dashboard' },
      { path: '/patients', icon: '👥', label: 'All Patients' },
      { path: '/monitoring', icon: '💓', label: 'Live Monitoring' },
      { path: '/hospitals', icon: '🏥', label: 'Hospitals' },
      { path: '/departments', icon: '🏢', label: 'Departments' },
      { path: '/users', icon: '👤', label: 'Manage Users' },
      { path: '/audit', icon: '📋', label: 'Audit Logs' },
      { path: '/shifts', icon: '🕐', label: 'Shift Management' },
      { path: '/carbon', icon: '🌱', label: 'Carbon Reports' },
    ],
  },
  hospital_admin: {
    title: 'CardioSense AI',
    subtitle: 'Hospital Admin',
    icon: '🏥',
    themeClass: 'theme-hospitaladmin',
    gradientFrom: 'from-teal-700',
    gradientTo: 'to-emerald-900',
    accentColor: 'text-emerald-400',
    navItems: [
      { path: '/', icon: '📊', label: 'Dashboard' },
      { path: '/patients', icon: '👥', label: 'Patients' },
      { path: '/monitoring', icon: '💓', label: 'Live Monitoring' },
      { path: '/departments', icon: '🏢', label: 'Departments' },
      { path: '/shifts', icon: '🕐', label: 'Shift Management' },
      { path: '/users', icon: '👤', label: 'Staff' },
    ],
  },
  doctor: {
    title: 'CardioSense AI',
    subtitle: 'Doctor Portal',
    icon: '⚕️',
    themeClass: 'theme-doctor',
    gradientFrom: 'from-blue-700',
    gradientTo: 'to-blue-950',
    accentColor: 'text-blue-400',
    navItems: [
      { path: '/', icon: '📊', label: 'My Dashboard' },
      { path: '/patients', icon: '👥', label: 'My Patients' },
      { path: '/monitoring', icon: '💓', label: 'Live Monitoring' },
      { path: '/availability', icon: '🟢', label: 'My Availability' },
      { path: '/shifts', icon: '🕐', label: 'My Shifts' },
    ],
  },
  nurse: {
    title: 'CardioSense AI',
    subtitle: 'Nurse Station',
    icon: '💉',
    themeClass: 'theme-nurse',
    gradientFrom: 'from-green-700',
    gradientTo: 'to-green-950',
    accentColor: 'text-green-400',
    navItems: [
      { path: '/', icon: '📊', label: 'My Dashboard' },
      { path: '/patients', icon: '👥', label: 'My Patients' },
      { path: '/monitoring', icon: '💓', label: 'Vital Monitoring' },
      { path: '/shifts', icon: '🕐', label: 'My Shifts' },
    ],
  },
  receptionist: {
    title: 'CardioSense AI',
    subtitle: 'Reception Desk',
    icon: '🛎️',
    themeClass: 'theme-receptionist',
    gradientFrom: 'from-purple-700',
    gradientTo: 'to-purple-950',
    accentColor: 'text-purple-400',
    navItems: [
      { path: '/', icon: '📊', label: 'Dashboard' },
      { path: '/patients', icon: '👥', label: 'Patients' },
      { path: '/register', icon: '📝', label: 'Register Patient' },
      { path: '/appointments', icon: '📅', label: 'Appointments' },
      { path: '/doctor-search', icon: '🔍', label: 'Find Doctor' },
      { path: '/visitors', icon: '🎫', label: 'Visitors' },
    ],
  },
  patient: {
    title: 'CardioSense AI',
    subtitle: 'My Health Portal',
    icon: '❤️',
    themeClass: 'theme-patient',
    gradientFrom: 'from-sky-50',
    gradientTo: 'to-white',
    accentColor: 'text-sky-600',
    navItems: [
      { path: '/', icon: '🏠', label: 'My Dashboard' },
      { path: '/vitals', icon: '💓', label: 'My Vitals' },
      { path: '/medications', icon: '💊', label: 'Medications' },
      { path: '/reports', icon: '📄', label: 'Reports' },
      { path: '/messages', icon: '💬', label: 'Messages' },
    ],
  },
  caregiver: {
    title: 'CardioSense AI',
    subtitle: 'Caregiver Portal',
    icon: '🤝',
    themeClass: 'theme-caregiver',
    gradientFrom: 'from-orange-700',
    gradientTo: 'to-orange-950',
    accentColor: 'text-orange-400',
    navItems: [
      { path: '/', icon: '📊', label: 'Dashboard' },
      { path: '/patient-status', icon: '💓', label: 'Patient Status' },
      { path: '/doctor-search', icon: '🔍', label: 'Find Doctor' },
      { path: '/medications', icon: '💊', label: 'Medications' },
      { path: '/visitors', icon: '🎫', label: 'Visitor Info' },
      { path: '/messages', icon: '💬', label: 'Messages' },
    ],
  },
};

const statusColors: Record<string, string> = {
  available: 'bg-emerald-500',
  busy: 'bg-amber-500',
  in_surgery: 'bg-red-500',
  emergency: 'bg-red-600',
  meeting: 'bg-blue-500',
  off_duty: 'bg-slate-500',
  vacation: 'bg-purple-500',
};

interface Props {
  children: React.ReactNode;
}

export default function RoleBasedLayout({ children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const role = (user?.role || 'patient') as UserRole;
  const config = layoutConfigs[role] || layoutConfigs.patient;
  const isPatientTheme = role === 'patient';

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
    <div className={`flex h-screen overflow-hidden ${config.themeClass}`}>
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
          ${isPatientTheme
            ? 'bg-white/95 border-r border-slate-200'
            : 'bg-surface-950/95 backdrop-blur-xl border-r border-white/5'
          }
          transition-all duration-300 ease-in-out
          ${sidebarOpen ? 'w-64' : 'w-20'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className={`flex items-center gap-3 px-5 py-5 border-b ${
          isPatientTheme ? 'border-slate-200' : 'border-white/5'
        }`}>
          <div className={`flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br ${config.gradientFrom} ${config.gradientTo} flex items-center justify-center shadow-lg`}>
            <span className="text-xl">{config.icon}</span>
          </div>
          {sidebarOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overflow-hidden">
              <h1 className={`text-base font-bold whitespace-nowrap ${
                isPatientTheme ? 'text-slate-800' : 'text-white'
              }`}>{config.title}</h1>
              <p className={`text-[10px] whitespace-nowrap ${
                isPatientTheme ? 'text-slate-500' : 'text-slate-500'
              }`}>{config.subtitle}</p>
            </motion.div>
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {config.navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                ${!sidebarOpen ? 'justify-center px-0' : ''}
                ${isActive
                  ? isPatientTheme
                    ? 'bg-sky-50 text-sky-700 shadow-sm'
                    : 'bg-white/10 text-white shadow-sm'
                  : isPatientTheme
                    ? 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`
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
          className={`hidden lg:flex items-center justify-center p-3 mx-3 mb-2 rounded-xl transition-colors ${
            isPatientTheme
              ? 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
              : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
          }`}
        >
          {sidebarOpen ? '◀' : '▶'}
        </button>

        {/* User Profile */}
        <div className={`border-t p-4 ${isPatientTheme ? 'border-slate-200' : 'border-white/5'}`}>
          <div className={`flex items-center gap-3 ${!sidebarOpen ? 'justify-center' : ''}`}>
            <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${config.gradientFrom} ${config.gradientTo} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
              {initials}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${
                  isPatientTheme ? 'text-slate-800' : 'text-slate-200'
                }`}>{user?.full_name}</p>
                <p className={`text-[10px] ${config.accentColor}`}>
                  {role.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </p>
              </div>
            )}
            {sidebarOpen && (
              <button
                onClick={handleLogout}
                className={`flex-shrink-0 p-1.5 rounded-lg transition-colors ${
                  isPatientTheme
                    ? 'text-slate-400 hover:text-red-500 hover:bg-red-50'
                    : 'text-slate-500 hover:text-red-400 hover:bg-white/5'
                }`}
                title="Logout"
              >
                🚪
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className={`flex-1 overflow-y-auto ${isPatientTheme ? 'bg-slate-50' : ''}`}>
        {/* Top bar (mobile) */}
        <div className={`lg:hidden flex items-center justify-between px-4 py-3 border-b sticky top-0 z-30 ${
          isPatientTheme
            ? 'border-slate-200 bg-white/90 backdrop-blur-sm'
            : 'border-white/5 bg-surface-900/80 backdrop-blur-sm'
        }`}>
          <button
            onClick={() => setMobileOpen(true)}
            className={`p-1.5 rounded-lg ${isPatientTheme ? 'text-slate-600' : 'text-slate-300'}`}
          >
            ☰
          </button>
          <span className={`text-sm font-semibold ${config.accentColor}`}>{config.title}</span>
          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${config.gradientFrom} ${config.gradientTo} flex items-center justify-center text-white text-[10px] font-bold`}>
            {initials}
          </div>
        </div>

        {/* Medical Disclaimer Bar */}
        <div className={`mx-4 lg:mx-6 mt-4 mb-2 px-4 py-2 rounded-lg text-xs flex items-center gap-2 ${
          isPatientTheme
            ? 'bg-sky-50 text-sky-700 border border-sky-200'
            : 'bg-amber-500/10 text-amber-300/80 border border-amber-500/20'
        }`}>
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
