import React, { useState, useEffect, useRef } from 'react';
import {
  Bell, AlertTriangle, CheckCircle, Clock, Volume2, VolumeX,
  X, ExternalLink, ShieldAlert, ArrowUpRight, Check, Heart, Calendar, FileText
} from 'lucide-react';
import { notificationsAPI, dashboardAPI } from '../../services/api';
import type { InAppNotification } from '../../types';
import toast from 'react-hot-toast';

interface NotificationCenterProps {
  onAlertAcknowledge?: (alertId: number) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ onAlertAcknowledge }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeEmergencyAlert, setActiveEmergencyAlert] = useState<any | null>(null);
  const [ackNotes, setAckNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Play Web Audio API synthesized alert chime
  const playAlertSound = (severity: 'critical' | 'normal' = 'normal') => {
    if (!soundEnabled) return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (severity === 'critical') {
        // High-pitched double beep alarm
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, now); // A5
        osc.frequency.setValueAtTime(1046.5, now + 0.12); // C6
        osc.frequency.setValueAtTime(880, now + 0.24);
        osc.frequency.setValueAtTime(1046.5, now + 0.36);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.55);
        osc.start(now);
        osc.stop(now + 0.55);
      } else {
        // Subtle soft chime
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.18); // A5

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      }
    } catch (e) {
      console.warn('Audio tone synthesis error:', e);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await notificationsAPI.list({ limit: 20 });
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unread_count || 0);
    } catch (err) {
      // Best-effort polling
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Poll notifications every 8s as fallback
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 8000);
    return () => clearInterval(interval);
  }, []);

  // Listen to live window custom events emitted by global WebSocket
  useEffect(() => {
    const handleLiveEmergency = (e: any) => {
      const payload = e.detail;
      playAlertSound('critical');
      setActiveEmergencyAlert(payload);
      fetchNotifications();
      toast.error(`🚨 EMERGENCY: ${payload.title || 'Patient Deterioration Alert'}`, {
        duration: 8000,
        position: 'top-right',
      });
    };

    const handleLiveNotification = (e: any) => {
      playAlertSound('normal');
      fetchNotifications();
    };

    window.addEventListener('carebridge:emergency_alert', handleLiveEmergency);
    window.addEventListener('carebridge:notification', handleLiveNotification);

    return () => {
      window.removeEventListener('carebridge:emergency_alert', handleLiveEmergency);
      window.removeEventListener('carebridge:notification', handleLiveNotification);
    };
  }, [soundEnabled]);

  const handleMarkRead = async (id: number) => {
    try {
      await notificationsAPI.markRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (e) {
      toast.error('Failed to mark all as read');
    }
  };

  const handleAcknowledgeEmergency = async () => {
    if (!activeEmergencyAlert) return;
    setIsProcessing(true);
    try {
      await dashboardAPI.acknowledgeAlert(activeEmergencyAlert.id, ackNotes || 'Under immediate clinical review');
      toast.success(`Alert #${activeEmergencyAlert.id} acknowledged`);
      if (onAlertAcknowledge) onAlertAcknowledge(activeEmergencyAlert.id);
      setActiveEmergencyAlert(null);
      setAckNotes('');
      fetchNotifications();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to acknowledge alert');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEscalateEmergency = async () => {
    if (!activeEmergencyAlert) return;
    setIsProcessing(true);
    try {
      await dashboardAPI.escalateAlert(activeEmergencyAlert.id, 'Clinical escalation: Priority supervisor intervention');
      toast.success(`Alert #${activeEmergencyAlert.id} escalated to Chief Cardiologist`);
      setActiveEmergencyAlert(null);
      fetchNotifications();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to escalate alert');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
      if (diffSec < 60) return 'Just now';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Clinical Notification Center"
        className="relative p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 transition-all border border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
      >
        <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'text-rose-400 animate-pulse' : ''}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] px-1 items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-red-600 text-[11px] font-bold text-white shadow-lg shadow-rose-500/40 border border-slate-900 animate-bounce">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-96 max-w-[90vw] rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl shadow-black/80 z-50 overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-800/80 border-b border-slate-700/60">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400">
                <Bell className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-slate-100 text-sm">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                title={soundEnabled ? 'Mute Alert Chime' : 'Unmute Alert Chime'}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
              >
                {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs font-medium text-blue-400 hover:text-blue-300 hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-800/60 custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center mx-auto mb-3 text-slate-500">
                  <CheckCircle className="w-6 h-6 text-emerald-500/60" />
                </div>
                <p className="text-sm font-medium text-slate-300">All caught up!</p>
                <p className="text-xs text-slate-500 mt-1">No active clinical alerts or notifications.</p>
              </div>
            ) : (
              notifications.map((n) => {
                const isEmergency = n.title.toLowerCase().includes('critical') || n.title.toLowerCase().includes('emergency') || n.title.toLowerCase().includes('alert');
                const isAppointment = n.title.toLowerCase().includes('consultation') || n.title.toLowerCase().includes('appointment');
                const isMed = n.title.toLowerCase().includes('medication') || n.title.toLowerCase().includes('dose');

                return (
                  <div
                    key={n.id}
                    onClick={() => !n.is_read && handleMarkRead(n.id)}
                    className={`p-3.5 transition-all cursor-pointer flex gap-3 hover:bg-slate-800/60 ${
                      !n.is_read ? 'bg-slate-800/30 font-medium' : 'opacity-75'
                    }`}
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      {isEmergency ? (
                        <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                      ) : isAppointment ? (
                        <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          <Calendar className="w-4 h-4" />
                        </div>
                      ) : isMed ? (
                        <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          <Heart className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="p-2 rounded-xl bg-slate-700 text-slate-300">
                          <FileText className="w-4 h-4" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className={`text-xs font-semibold truncate ${
                          isEmergency ? 'text-rose-300' : 'text-slate-200'
                        }`}>
                          {n.title}
                        </h4>
                        <span className="text-[10px] text-slate-500 flex-shrink-0">
                          {formatTimeAgo(n.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                        {n.message}
                      </p>
                      {n.patient_name && (
                        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-blue-400/90 font-mono">
                          <span>Patient: {n.patient_name}</span>
                          {n.patient_uid && <span className="text-slate-500">({n.patient_uid})</span>}
                        </div>
                      )}
                    </div>

                    {!n.is_read && (
                      <div className="self-center">
                        <span className="w-2 h-2 rounded-full bg-rose-500 block"></span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Live High-Priority Emergency Modal */}
      {activeEmergencyAlert && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border-2 border-rose-500/80 shadow-2xl shadow-rose-950/80 overflow-hidden text-slate-100 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white/20 backdrop-blur animate-pulse">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight">EMERGENCY CLINICAL ALERT</h3>
                  <p className="text-xs text-rose-100 font-medium">Automatic Emergency Dispatch & Multi-Role Notification</p>
                </div>
              </div>
              <button
                onClick={() => setActiveEmergencyAlert(null)}
                className="p-1 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/40">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-rose-500/30 text-rose-300 border border-rose-500/40">
                      {activeEmergencyAlert.severity || 'CRITICAL'} RISK
                    </span>
                    <h4 className="text-base font-bold text-white mt-2">
                      {activeEmergencyAlert.title || 'Hemodynamic Instability'}
                    </h4>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400">Triggered</span>
                    <p className="text-xs font-mono font-bold text-rose-400">Just Now</p>
                  </div>
                </div>
                <p className="text-sm text-slate-200 mt-2 leading-relaxed">
                  {activeEmergencyAlert.message}
                </p>
              </div>

              {/* Patient Info Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
                  <span className="text-slate-400 block mb-0.5">Patient Name</span>
                  <span className="font-bold text-slate-200 text-sm">{activeEmergencyAlert.patient_name || 'Patient'}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
                  <span className="text-slate-400 block mb-0.5">Location</span>
                  <span className="font-bold text-slate-200 text-sm">
                    {activeEmergencyAlert.ward || 'Cardiac Ward'} • {activeEmergencyAlert.bed || activeEmergencyAlert.bed_number || 'Bed 1'}
                  </span>
                </div>
                {activeEmergencyAlert.trigger_value && (
                  <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
                    <span className="text-slate-400 block mb-0.5">Observed Value</span>
                    <span className="font-bold text-rose-400 text-sm">{activeEmergencyAlert.trigger_value}</span>
                  </div>
                )}
                {activeEmergencyAlert.threshold && (
                  <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
                    <span className="text-slate-400 block mb-0.5">Safe Threshold</span>
                    <span className="font-bold text-emerald-400 text-sm">{activeEmergencyAlert.threshold}</span>
                  </div>
                )}
              </div>

              {/* Resolution Notes Input */}
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">
                  Clinical Action / Triage Notes (Logged to Audit Trail):
                </label>
                <input
                  type="text"
                  value={ackNotes}
                  onChange={(e) => setAckNotes(e.target.value)}
                  placeholder="e.g. Attending bedside, ordered ECG, IV push stat"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleAcknowledgeEmergency}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/40 transition-all disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  Acknowledge & Accept
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleEscalateEmergency}
                  className="py-3 px-4 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-rose-950/60 transition-all disabled:opacity-50"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  Escalate Tier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
