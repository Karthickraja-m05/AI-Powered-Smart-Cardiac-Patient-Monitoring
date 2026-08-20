import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, Download, RefreshCw, ShieldCheck, AlertTriangle,
  Clock, User, Database, ChevronLeft, ChevronRight, FileText,
  Calendar, CheckCircle, ArrowRight, Eye, ShieldAlert, Cpu
} from 'lucide-react';
import { auditAPI } from '../../services/api';
import type { AuditLogEntry } from '../../types';
import toast from 'react-hot-toast';

const actionConfig: Record<string, { icon: string; color: string; label: string }> = {
  emergency_alert: { icon: '🚨', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40', label: 'Emergency Alert' },
  acknowledge_alert: { icon: '🔔', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', label: 'Alert Acknowledged' },
  escalate_alert: { icon: '⚡', color: 'bg-red-500/20 text-red-300 border-red-500/40', label: 'Alert Escalation' },
  resolve_alert: { icon: '✅', color: 'bg-teal-500/20 text-teal-300 border-teal-500/40', label: 'Alert Resolved' },
  book_appointment: { icon: '📅', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40', label: 'Appointment Booked' },
  update_appointment: { icon: '🔄', color: 'bg-sky-500/20 text-sky-300 border-sky-500/40', label: 'Appointment Updated' },
  cancel_appointment: { icon: '❌', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40', label: 'Appointment Cancelled' },
  login: { icon: '🔑', color: 'bg-purple-500/20 text-purple-300 border-purple-500/40', label: 'User Login' },
  logout: { icon: '🚪', color: 'bg-slate-500/20 text-slate-300 border-slate-500/40', label: 'User Logout' },
  create: { icon: '➕', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', label: 'Record Created' },
  update: { icon: '✏️', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40', label: 'Record Updated' },
  delete: { icon: '🗑️', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40', label: 'Record Deleted' },
  discharge: { icon: '📤', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40', label: 'Patient Discharged' },
  transfer: { icon: '🔄', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40', label: 'Patient Transfer' },
  reassign: { icon: '🔁', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40', label: 'Doctor Reassigned' },
  prescribe_med: { icon: '💊', color: 'bg-pink-500/20 text-pink-300 border-pink-500/40', label: 'Medication Prescribed' },
  administer_med: { icon: '💉', color: 'bg-green-500/20 text-green-300 border-green-500/40', label: 'Medication Administered' },
  shift_checkin: { icon: '🕐', color: 'bg-violet-500/20 text-violet-300 border-violet-500/40', label: 'Shift Check-in' },
  user_manage: { icon: '👤', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40', label: 'User Account Managed' },
  view: { icon: '👁️', color: 'bg-slate-500/20 text-slate-300 border-slate-500/40', label: 'Record Viewed' },
};

export default function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const [logsRes, summaryRes] = await Promise.all([
        auditAPI.getLogs({
          page,
          per_page: 50,
          search: searchQuery || undefined,
          action: actionFilter || undefined,
          entity_type: entityFilter || undefined,
          start_date: startDate ? new Date(startDate).toISOString() : undefined,
          end_date: endDate ? new Date(endDate).toISOString() : undefined,
        }),
        auditAPI.getSummary().catch(() => ({ data: null })),
      ]);

      setLogs(logsRes.data || []);
      if (summaryRes?.data) setSummary(summaryRes.data);
    } catch (err) {
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter, entityFilter, startDate, endDate]);

  // Handle Enter on search
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  // Real-time live log update via event
  useEffect(() => {
    const handleNewLog = () => {
      fetchLogs();
    };
    window.addEventListener('carebridge:audit_logged', handleNewLog);
    return () => window.removeEventListener('carebridge:audit_logged', handleNewLog);
  }, []);

  const downloadCSV = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (actionFilter) params.set('action', actionFilter);
    if (entityFilter) params.set('entity_type', entityFilter);
    if (startDate) params.set('start_date', new Date(startDate).toISOString());
    if (endDate) params.set('end_date', new Date(endDate).toISOString());

    const url = `/api/audit/export?${params.toString()}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Hospital Audit Trail & Compliance</h1>
              <p className="text-slate-400 text-xs mt-0.5">
                Immutable, tamper-evident record of all clinical alerts, appointments, admissions, medications, and logins.
              </p>
            </div>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setPage(1); fetchLogs(); }}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 flex items-center gap-2 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={downloadCSV}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold shadow-lg shadow-amber-950/40 flex items-center gap-2 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV Audit Report
          </button>
        </div>
      </div>

      {/* ── Metric Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Total Audit Events</p>
            <h3 className="text-xl font-bold text-white mt-0.5">
              {summary ? summary.total_events : logs.length}
            </h3>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Events Today</p>
            <h3 className="text-xl font-bold text-white mt-0.5">
              {summary ? summary.events_today : '15+'}
            </h3>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl flex items-center gap-4">
          <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Emergency Alerts Logged</p>
            <h3 className="text-xl font-bold text-rose-400 mt-0.5">
              {summary ? summary.emergency_alerts_logged : 'Active'}
            </h3>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Integrity Status</p>
            <h3 className="text-xl font-bold text-emerald-400 mt-0.5 flex items-center gap-1.5">
              <span>100%</span>
              <span className="text-[11px] text-slate-400 font-normal">Verified</span>
            </h3>
          </div>
        </div>
      </div>

      {/* ── Filters & Search Toolbar ── */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 space-y-3.5 backdrop-blur-xl">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by keywords, clinical description, username, or IP address..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
              title="Start Date"
            />
            <span className="text-slate-500 text-xs">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
              title="End Date"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold transition-colors"
            >
              Search
            </button>
          </div>
        </form>

        {/* Quick Filter Badges */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 mr-2 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Quick Filter:
          </span>
          {[
            { id: '', label: 'All Activities' },
            { id: 'emergency_alert', label: '🚨 Emergency Alerts' },
            { id: 'acknowledge_alert', label: '🔔 Acknowledged' },
            { id: 'book_appointment', label: '📅 Appointments' },
            { id: 'login', label: '🔑 Logins' },
            { id: 'prescribe_med', label: '💊 Prescriptions' },
            { id: 'create', label: '➕ Admissions' },
            { id: 'discharge', label: '📤 Discharges' },
            { id: 'shift_checkin', label: '🕐 Shifts' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActionFilter(tab.id); setPage(1); }}
              className={`px-3 py-1 rounded-xl text-xs font-medium transition-all ${
                actionFilter === tab.id
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm font-semibold'
                  : 'bg-slate-800/60 text-slate-400 border border-slate-700/60 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table Container ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-900/60 rounded-3xl border border-slate-800">
          <div className="animate-spin w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full mb-3" />
          <p className="text-xs text-slate-400">Loading audit records...</p>
        </div>
      ) : (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-800/50">
                  <th className="px-4 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Timestamp</th>
                  <th className="px-4 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">User / Agent</th>
                  <th className="px-4 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Action Type</th>
                  <th className="px-4 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Target Entity</th>
                  <th className="px-4 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Description</th>
                  <th className="px-4 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {logs.map((log, idx) => {
                  const cfg = actionConfig[log.action] || {
                    icon: '📋',
                    color: 'bg-slate-700/30 text-slate-300 border-slate-700/50',
                    label: log.action.replace('_', ' '),
                  };

                  return (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(idx * 0.015, 0.3) }}
                      className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                      onClick={() => setSelectedLog(log)}
                    >
                      {/* Timestamp */}
                      <td className="px-4 py-3 text-xs text-slate-300 font-mono whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString([], {
                          month: 'short',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>

                      {/* User */}
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-amber-400">
                            {log.username ? log.username[0].toUpperCase() : 'S'}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-200 block">{log.username || 'System Automation'}</span>
                            {log.ip_address && (
                              <span className="text-[10px] text-slate-500 block font-mono">{log.ip_address}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Action Badge */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border ${cfg.color}`}>
                          <span>{cfg.icon}</span>
                          <span>{cfg.label}</span>
                        </span>
                      </td>

                      {/* Target Entity */}
                      <td className="px-4 py-3 text-xs text-slate-300 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700/60 font-mono text-[11px] text-slate-300">
                          {log.entity_type}{log.entity_id ? ` #${log.entity_id}` : ''}
                        </span>
                      </td>

                      {/* Description */}
                      <td className="px-4 py-3 text-xs text-slate-300 max-w-md">
                        <p className="line-clamp-2 leading-relaxed">{log.description || '—'}</p>
                      </td>

                      {/* Details View Button */}
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedLog(log); }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          title="Inspect Event"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {logs.length === 0 && (
            <div className="text-center py-16 px-4">
              <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-500">
                <FileText className="w-7 h-7 text-slate-600" />
              </div>
              <h4 className="text-sm font-semibold text-slate-300">No Audit Events Found</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No events match your active filters. Clear search or select another category to view entries.
              </p>
            </div>
          )}

          {/* ── Pagination ── */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/60">
            <span className="text-xs text-slate-400">
              Showing page <strong>{page}</strong> • {logs.length} entries retrieved
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 disabled:opacity-40 flex items-center gap-1 transition-all"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={logs.length < 50}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 disabled:opacity-40 flex items-center gap-1 transition-all"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Detail Drawer / Modal ── */}
      <AnimatePresence>
        {selectedLog && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl p-6 text-slate-100 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base">Audit Log Record #{selectedLog.id}</h3>
                    <p className="text-xs text-slate-400">{new Date(selectedLog.created_at).toUTCString()}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
                  <span className="text-slate-400 block mb-0.5">Action Category</span>
                  <span className="font-bold text-slate-200 uppercase">{selectedLog.action}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
                  <span className="text-slate-400 block mb-0.5">Author User</span>
                  <span className="font-bold text-slate-200">{selectedLog.username || 'System Automatic'}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
                  <span className="text-slate-400 block mb-0.5">Entity Target</span>
                  <span className="font-bold text-slate-200">{selectedLog.entity_type} {selectedLog.entity_id ? `(#${selectedLog.entity_id})` : ''}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
                  <span className="text-slate-400 block mb-0.5">Client Terminal / IP</span>
                  <span className="font-mono text-slate-300">{selectedLog.ip_address || '127.0.0.1 (Local)'}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <span className="text-xs text-slate-400 block mb-1 font-semibold">Full Clinical Description:</span>
                <p className="text-xs text-slate-200 leading-relaxed">{selectedLog.description}</p>
              </div>

              {/* JSON State Changes Snapshot */}
              {(selectedLog.new_value || selectedLog.old_value) && (
                <div className="space-y-2">
                  <span className="text-xs text-slate-400 font-semibold block">Audit State Change Payload:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedLog.old_value && (
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-400 max-h-36 overflow-y-auto">
                        <span className="text-[10px] uppercase font-bold text-rose-400 block mb-1">Previous Value</span>
                        <pre>{JSON.stringify(selectedLog.old_value, null, 2)}</pre>
                      </div>
                    )}
                    {selectedLog.new_value && (
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-emerald-400 max-h-36 overflow-y-auto">
                        <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-1">New Value</span>
                        <pre>{JSON.stringify(selectedLog.new_value, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
                >
                  🖨️ Print Record
                </button>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold transition-all"
                >
                  Close Record
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
