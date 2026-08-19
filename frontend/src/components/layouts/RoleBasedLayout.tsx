import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import type { UserRole } from '../../types';
import ThemeToggle from '../common/ThemeToggle';

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
    accentColor: 'text-teal-400',
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
    subtitle: 'Reception & Admissions',
    icon: '🖥️',
    themeClass: 'theme-receptionist',
    gradientFrom: 'from-cyan-700',
    gradientTo: 'to-blue-950',
    accentColor: 'text-cyan-400',
    navItems: [
      { path: '/', icon: '📊', label: 'Dashboard' },
      { path: '/patients', icon: '👥', label: 'Patients' },
      { path: '/register', icon: '📝', label: 'Register Patient' },
      { path: '/visitors', icon: '🎫', label: 'Visitor Pass' },
      { path: '/appointments', icon: '📅', label: 'Appointments' },
    ],
  },
  patient: {
    title: 'CardioSense AI',
    subtitle: 'My Health Portal',
    icon: '🫀',
    themeClass: 'theme-patient',
    gradientFrom: 'from-brand-600',
    gradientTo: 'to-teal-800',
    accentColor: 'text-brand-400',
    navItems: [
      { path: '/', icon: '📊', label: 'Health Overview' },
      { path: '/appointments', icon: '📅', label: 'My Appointments' },
    ],
  },
  caregiver: {
    title: 'CardioSense AI',
    subtitle: 'Caregiver Portal',
    icon: '🤝',
    themeClass: 'theme-caregiver',
    gradientFrom: 'from-pink-700',
    gradientTo: 'to-rose-950',
    accentColor: 'text-pink-400',
    navItems: [
      { path: '/', icon: '📊', label: 'Patient Overview' },
      { path: '/appointments', icon: '📅', label: 'Appointments' },
    ],
  },
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
    <div className={`relative flex h-screen overflow-hidden ${config.themeClass}`}>
      {/* ── Ambient Background Lighting & Particle Glows ── */}
      <div className="ambient-bg-container">
        <div className="ambient-glow-1" />
        <div className="ambient-glow-2" />
      </div>

      {/* ── Mobile Overlay ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Sidebar ── */}
      <aside
        className={`
          fixed lg:relative z-50 h-full flex flex-col
          transition-all duration-300 ease-in-out
          ${sidebarOpen ? 'w-64' : 'w-20'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo Header */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/5">
          <div className={`flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br ${config.gradientFrom} ${config.gradientTo} flex items-center justify-center shadow-lg`}>
            <span className="text-xl floating-icon">{config.icon}</span>
          </div>
          {sidebarOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overflow-hidden">
              <h1 className="text-base font-bold whitespace-nowrap text-white">{config.title}</h1>
              <p className="text-[10px] whitespace-nowrap text-slate-400">{config.subtitle}</p>
            </motion.div>
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
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
                  ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30 shadow-md font-semibold'
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
          className="hidden lg:flex items-center justify-center p-3 mx-3 mb-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors cursor-pointer"
          title={sidebarOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
        >
          {sidebarOpen ? '◀' : '▶'}
        </button>

        {/* User Profile */}
        <div className="border-t border-white/5 p-4">
          <div className={`flex items-center gap-3 ${!sidebarOpen ? 'justify-center' : ''}`}>
            <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${config.gradientFrom} ${config.gradientTo} flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-md`}>
              {initials}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-white">{user?.full_name}</p>
                <p className={`text-[10px] font-semibold ${config.accentColor}`}>
                  {role.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </p>
              </div>
            )}
            {sidebarOpen && (
              <button
                onClick={handleLogout}
                className="flex-shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/5 transition-colors cursor-pointer"
                title="Sign Out"
              >
                🚪
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main Content Area with Top Navigation Bar ── */}
      <main className="flex-1 overflow-y-auto relative z-10 flex flex-col">
        {/* Top Header Navigation Bar */}
        <header className="sticky top-0 z-30 px-4 lg:px-6 py-3 border-b border-white/5 bg-surface-900/60 backdrop-blur-xl flex items-center justify-between gap-4 transition-all">
          {/* Left: Mobile trigger & Medical Disclaimer */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-white/5 border border-white/10 text-slate-200 hover:text-white"
            >
              ☰
            </button>

            {/* Medical Disclaimer Banner */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-medium truncate">
              <span>⚕️</span>
              <span className="truncate">Clinical decision support tool only — does NOT diagnose medical conditions.</span>
            </div>
          </div>

          {/* Right: Theme Toggle & User Status Indicator */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* ☀️/🌙 Animated Theme Toggle Switch */}
            <ThemeToggle />

            {/* Mobile initials avatar */}
            <div className="lg:hidden w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold shadow-md">
              {initials}
            </div>
          </div>
        </header>

        {/* Mobile Disclaimer (when on tiny screens) */}
        <div className="sm:hidden mx-4 mt-3 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] flex items-center gap-2">
          <span>⚕️</span>
          <span>Clinical decision support tool only.</span>
        </div>

        {/* Dynamic Page Content */}
        <div className="flex-1 p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
