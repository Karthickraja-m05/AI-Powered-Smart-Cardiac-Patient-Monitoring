import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { notificationsAPI, dashboardAPI } from '../../services/api';
import type { InAppNotification, Alert } from '../../types';

// ── Web Audio API Synthesizer for Zero-Dependency Clinical Chimes ──
function playClinicalSound(type: 'notification' | 'emergency' | 'acknowledge') {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === 'notification') {
      // Pleasant dual-tone hospital chime (E5 -> G#5)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      osc2.frequency.setValueAtTime(830.61, ctx.currentTime + 0.1); // G#5

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.2);
      osc2.start(ctx.currentTime + 0.1);
      osc2.stop(ctx.currentTime + 0.6);
    } else if (type === 'emergency') {
      // Urgent pulsing two-tone cardiac alert alarm (880Hz / 660Hz rapid cycle)
      const now = ctx.currentTime;
      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(i % 2 === 0 ? 880 : 700, now + i * 0.2);

        gain.gain.setValueAtTime(0.2, now + i * 0.2);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.2 + 0.18);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + i * 0.2);
        osc.stop(now + i * 0.2 + 0.2);
      }
    } else if (type === 'acknowledge') {
      // Crisp confirmation tone (C6)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1046.5, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch {
    // Gracefully ignore audio autoplay policies
  }
}

interface NotificationCenterProps {
  onEmergencyActiveChange?: (active: boolean, count: number) => void;
}

export default function NotificationCenter({ onEmergencyActiveChange }: NotificationCenterProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'all' | 'alerts' | 'appointments' | 'system'>('all');
  const [loading, setLoading] = useState(false);

  // Live Emergency Alert Modal State
  const [activeEmergencyAlert, setActiveEmergencyAlert] = useState<any | null>(null);
  const [ackNote, setAckNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const drawerRef = useRef<HTMLDivElement | null>(null);

  // Load initial notifications & badge count
  const fetchNotifications = async () => {
    try {
      const res = await notificationsAPI.list({ limit: 30 });
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unread_count || 0);
    } catch {
      // Handled gracefully
    }
  };

  // Check for critical active emergency alerts
  const checkActiveEmergencies = async () => {
    try {
      const res = await dashboardAPI.getAlerts(5, false, 'emergency');
      if (res.data && res.data.length > 0) {
        onEmergencyActiveChange?.(true, res.data.length);
      } else {
        const crit = await dashboardAPI.getAlerts(5, false, 'critical');
        const hasCrit = crit.data && crit.data.length > 0;
        onEmergencyActiveChange?.(hasCrit, crit.data?.length || 0);
      }
    } catch {
      // Ignored
    }
  };

  // ── WebSocket Connection for Real-Time Event Stream ──
  useEffect(() => {
    fetchNotifications();
    checkActiveEmergencies();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/ws/live`;

    const connectWebSocket = () => {
      try {
        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
          console.log('[NotificationCenter] WebSocket Connected');
        };

        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            const { event: eventType, data } = payload;

            if (eventType === 'emergency_alert') {
              playClinicalSound('emergency');
              setActiveEmergencyAlert(data);
              toast.error(`🚨 ${data.title}: ${data.patient_name}`, { duration: 7000 });
              fetchNotifications();
              onEmergencyActiveChange?.(true, 1);
            } else if (eventType === 'alert_acknowledged' || eventType === 'alert_resolved') {
              fetchNotifications();
              checkActiveEmergencies();
            } else if (eventType === 'appointment_created') {
              playClinicalSound('notification');
              toast(`📅 New Appointment: ${data.patient_name} with ${data.doctor_name}`, {
                icon: '📅',
                duration: 5000,
              });
              fetchNotifications();
            } else if (eventType === 'appointment_updated') {
              fetchNotifications();
            }
          } catch (err) {
            console.error('[NotificationCenter] WS parse error:', err);
          }
        };

        ws.onerror = () => {
          // Socket error
        };

        ws.onclose = () => {
          // Attempt reconnection after 5 seconds
          setTimeout(connectWebSocket, 5000);
        };
      } catch {
        // Fallback to polling
      }
    };

    connectWebSocket();

    // 4-Second Polling fallback for guaranteed reliability
    const interval = setInterval(() => {
      fetchNotifications();
      checkActiveEmergencies();
    }, 4000);

    return () => {
      clearInterval(interval);
      if (socketRef.current) socketRef.current.close();
    };
  }, []);

  // Close drawer when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleMarkRead = async (id: number) => {
    try {
      await notificationsAPI.markRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
      playClinicalSound('acknowledge');
    } catch {
      // Ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      playClinicalSound('acknowledge');
      toast.success('All notifications marked as read');
    } catch {
      // Ignore
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await notificationsAPI.delete(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      toast.success('Notification dismissed');
    } catch {
      // Ignore
    }
  };

  // Emergency Modal Action: Acknowledge
  const handleAcknowledgeAlert = async () => {
    if (!activeEmergencyAlert) return;
    setActionLoading(true);
    try {
      await dashboardAPI.acknowledgeAlert(activeEmergencyAlert.id, ackNote || 'Acknowledged by clinician on duty');
      playClinicalSound('acknowledge');
      toast.success('Emergency alert acknowledged & logged to audit trail');
      setActiveEmergencyAlert(null);
      setAckNote('');
      checkActiveEmergencies();
    } catch {
      toast.error('Failed to acknowledge alert');
    } finally {
      setActionLoading(false);
    }
  };

  // Emergency Modal Action: Escalate
  const handleEscalateAlert = async () => {
    if (!activeEmergencyAlert) return;
    setActionLoading(true);
    try {
      await dashboardAPI.escalateAlert(activeEmergencyAlert.id, 'Escalated by clinician to Chief Cardiologist and Admin');
      toast.error('🚨 Alert escalated to Chief Cardiologist & Supervisors!');
      setActiveEmergencyAlert(null);
      checkActiveEmergencies();
    } catch {
      toast.error('Failed to escalate alert');
    } finally {
      setActionLoading(false);
    }
  };

  // Filter notifications by tab
  const filtered = notifications.filter((n) => {
    if (activeTab === 'alerts') return n.title.includes('🚨') || n.title.includes('CRITICAL') || n.title.includes('ALERT') || n.title.includes('Warning');
    if (activeTab === 'appointments') return n.title.includes('📅') || n.title.includes('Appointment') || n.title.includes('Consultation');
    if (activeTab === 'system') return !n.title.includes('🚨') && !n.title.includes('📅');
    return true;
  });

  return (
    <div className="relative">
      {/* ── Bell Trigger Button ── */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer group"
        title="Live Clinical Notifications & Alerts"
        id="notification-bell-btn"
      >
        <span className="text-lg group-hover:scale-110 transition-transform inline-block">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-rose-500 text-white text-[11px] font-black flex items-center justify-center border-2 border-surface-900 animate-pulse shadow-lg shadow-rose-500/50">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* ── Slide-Out Notification Drawer ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={drawerRef}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl bg-surface-900/95 backdrop-blur-2xl border border-white/15 shadow-2xl z-50 overflow-hidden flex flex-col max-h-[80vh]"
          >
            {/* Drawer Header */}
            <div className="p-4 border-b border-white/10 bg-gradient-to-r from-surface-850 to-surface-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">🔔</span>
                <h3 className="font-bold text-white text-sm">Notifications & Dispatch</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[10px] font-extrabold border border-rose-500/30">
                    {unreadCount} unread
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-brand-400 hover:text-brand-300 font-semibold cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center text-xs"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 p-2 border-b border-white/5 bg-white/[0.02]">
              {[
                { id: 'all', label: 'All' },
                { id: 'alerts', label: '🚨 Alerts' },
                { id: 'appointments', label: '📅 Appts' },
                { id: 'system', label: '⚙️ System' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === tab.id
                      ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Notification Stream List */}
            <div className="flex-1 overflow-y-auto divide-y divide-white/5 max-h-[380px]">
              {filtered.map((notif) => {
                const isAlert = notif.title.includes('🚨') || notif.title.includes('CRITICAL');
                const isAppt = notif.title.includes('📅');
                return (
                  <div
                    key={notif.id}
                    className={`p-3.5 transition-colors flex items-start gap-3 hover:bg-white/[0.03] ${
                      !notif.is_read ? 'bg-white/[0.04]' : ''
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 mt-0.5 ${
                        isAlert
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : isAppt
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}
                    >
                      {isAlert ? '🚨' : isAppt ? '📅' : '💬'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className={`text-xs font-bold truncate ${!notif.is_read ? 'text-white' : 'text-slate-300'}`}>
                          {notif.title}
                        </p>
                        {!notif.is_read && (
                          <span className="w-2 h-2 rounded-full bg-brand-400 flex-shrink-0 animate-pulse" />
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {notif.message}
                      </p>

                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-white/[0.03] text-[10px] text-slate-500">
                        <span>{new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <div className="flex items-center gap-2">
                          {notif.patient_id && (
                            <button
                              onClick={() => {
                                setIsOpen(false);
                                navigate(`/patients/${notif.patient_id}`);
                              }}
                              className="text-brand-400 hover:text-brand-300 font-semibold cursor-pointer"
                            >
                              View Patient →
                            </button>
                          )}
                          {!notif.is_read && (
                            <button
                              onClick={() => handleMarkRead(notif.id)}
                              className="text-slate-400 hover:text-white cursor-pointer"
                              title="Mark Read"
                            >
                              ✓ Read
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(notif.id)}
                            className="text-slate-500 hover:text-rose-400 cursor-pointer"
                            title="Dismiss"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filtered.length === 0 && (
                <div className="text-center py-12 text-slate-500 text-xs">
                  <span className="text-2xl block mb-2">🔕</span>
                  No notifications in this tab.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Live Emergency Alert Pop-Up Modal ── */}
      <AnimatePresence>
        {activeEmergencyAlert && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-surface-900 border-2 border-rose-500 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl shadow-rose-950/80 flex flex-col"
            >
              {/* Emergency Header */}
              <div className="px-6 py-4 bg-gradient-to-r from-red-600 via-rose-600 to-red-800 text-white flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🚨</span>
                  <div>
                    <h3 className="font-extrabold text-base tracking-wide uppercase">
                      Code Emergency Alert
                    </h3>
                    <p className="text-xs text-rose-100 font-mono">Immediate physician intervention dispatched</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-black/30 text-white text-xs font-black uppercase tracking-wider">
                  {activeEmergencyAlert.severity || 'CRITICAL'}
                </span>
              </div>

              {/* Alert Body */}
              <div className="p-6 space-y-4">
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-black text-white">{activeEmergencyAlert.title}</p>
                    <span className="text-xs text-rose-300 font-mono">
                      {activeEmergencyAlert.patient_uid || `PAT-${activeEmergencyAlert.patient_id}`}
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed font-medium">
                    {activeEmergencyAlert.message}
                  </p>
                  <div className="pt-2 border-t border-rose-500/20 grid grid-cols-2 gap-2 text-xs text-slate-300">
                    <p>📍 Location: <strong className="text-white">{activeEmergencyAlert.ward || 'ICU'} / {activeEmergencyAlert.bed || 'Bed 1'}</strong></p>
                    <p>👤 Patient: <strong className="text-white">{activeEmergencyAlert.patient_name || `Patient #${activeEmergencyAlert.patient_id}`}</strong></p>
                  </div>
                </div>

                {/* Optional Clinical Note */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Clinical Acknowledgment Note (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Attending bedside, ordered IV Metoprolol & 12-lead ECG..."
                    value={ackNote}
                    onChange={(e) => setAckNote(e.target.value)}
                    className="w-full px-3.5 py-2 bg-surface-800 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex items-center justify-between gap-3">
                  <button
                    onClick={handleEscalateAlert}
                    disabled={actionLoading}
                    className="px-4 py-2.5 rounded-xl bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 border border-orange-500/40 text-xs font-bold transition-all cursor-pointer"
                  >
                    ⬆️ Escalate to Chief
                  </button>

                  <div className="flex items-center gap-2">
                    {activeEmergencyAlert.patient_id && (
                      <button
                        onClick={() => {
                          const pid = activeEmergencyAlert.patient_id;
                          setActiveEmergencyAlert(null);
                          navigate(`/patients/${pid}`);
                        }}
                        className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-bold transition-all cursor-pointer"
                      >
                        Open EMR
                      </button>
                    )}

                    <button
                      onClick={handleAcknowledgeAlert}
                      disabled={actionLoading}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-extrabold shadow-lg shadow-emerald-900/40 transition-all cursor-pointer"
                    >
                      ✓ Acknowledge Alert
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
