import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import type { UserRole } from '../../types';
import ThemeToggle from '../common/ThemeToggle';
import NotificationCenter from '../common/NotificationCenter';
import { AlertOctagon, ArrowRight, ShieldAlert } from 'lucide-react';

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
      { path: '/appointments', icon: '📅', label: 'Appointments' },
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
      { path: '/appointments', icon: '📅', label: 'Appointments' },
      { path: '/departments', icon: '🏢', label: 'Departments' },
      { path: '/shifts', icon: '🕐', label: 'Shift Management' },
      { path: '/audit', icon: '📋', label: 'Audit Logs' },
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
      { path: '/appointments', icon: '📅', label: 'My Consultations' },
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
      { path: '/appointments', icon: '📅', label: 'Appointments' },
      { path: '/visitors', icon: '🎫', label: 'Visitor Pass' },
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
  const [activeStickyAlert, setActiveStickyAlert] = useState<any | null>(null);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const wsRef = useRef<WebSocket | null>(null);

  const role = (user?.role || 'patient') as UserRole;
  const config = layoutConfigs[role] || layoutConfigs.patient;

  // Real-time WebSocket connection to hospital broadcast bus
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;
    let isCancelled = false;

    const connectWebSocket = () => {
      if (isCancelled) return;
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const wsUrl = `${protocol}//${host}/api/ws/live?user_id=${user?.id || ''}`;
        
        ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('[CareBridge WS] Connected to live hospital channel');
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            const { type, payload } = data;

            if (type === 'emergency_alert') {
              setActiveStickyAlert(payload);
              window.dispatchEvent(new CustomEvent('carebridge:emergency_alert', { detail: payload }));
            } else if (type === 'alert_acknowledged' || type === 'alert_resolved') {
              if (activeStickyAlert && activeStickyAlert.id === payload.id) {
                setActiveStickyAlert(null);
              }
              window.dispatchEvent(new CustomEvent('carebridge:alert_updated', { detail: payload }));
            } else if (type === 'appointment_created' || type === 'appointment_updated') {
              window.dispatchEvent(new CustomEvent('carebridge:appointment_synced', { detail: payload }));
              window.dispatchEvent(new CustomEvent('carebridge:notification', { detail: payload }));
            } else if (type === 'audit_logged') {
              window.dispatchEvent(new CustomEvent('carebridge:audit_logged', { detail: payload }));
            }
          } catch (e) {
            console.error('[CareBridge WS] Parse error:', e);
          }
        };

        ws.onclose = () => {
          if (!isCancelled) {
            reconnectTimeout = setTimeout(connectWebSocket, 4000);
          }
        };

        ws.onerror = (err) => {
          console.warn('[CareBridge WS] Connection error (falling back to automatic retry)');
        };
      } catch (err) {
        if (!isCancelled) {
          reconnectTimeout = setTimeout(connectWebSocket, 4000);
        }
      }
    };

    connectWebSocket();

    return () => {
      isCancelled = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, [user?.id]);

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
        {/* Sticky Emergency Banner if critical alert is broadcasting */}
        {activeStickyAlert && (
          <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white px-4 py-2.5 flex items-center justify-between shadow-lg shadow-red-950/40 z-40 border-b border-red-500/50 animate-pulse">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-5 h-5 flex-shrink-0 text-white" />
              <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-md">
                {activeStickyAlert.severity || 'CRITICAL'} ALERT
              </span>
              <span className="text-xs font-medium">
                <strong>{activeStickyAlert.patient_name || 'Patient'}</strong> ({activeStickyAlert.ward || 'Ward'} • {activeStickyAlert.bed || 'Bed'}): {activeStickyAlert.title}
              </span>
            </div>
            <button
              onClick={() => setActiveStickyAlert(null)}
              className="text-xs font-semibold underline hover:text-white/80 transition-colors ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

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

          {/* Right: Notification Center, Theme Toggle & User Status Indicator */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* 🔔 In-App Clinical Notification Center & Sound Alerts */}
            <NotificationCenter />

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
