import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { auditAPI } from '../../services/api';
import type { AuditLogEntry } from '../../types';

const actionIcons: Record<string, string> = {
  create: '➕', update: '✏️', delete: '🗑️', login: '🔑', logout: '🚪',
  view: '👁️', discharge: '📤', transfer: '🔄', reassign: '🔁',
  administer_med: '💊', acknowledge_alert: '🔔', upload: '📎', status_change: '🔄',
};

export default function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    auditAPI.getLogs({
      page,
      per_page: 50,
      action: actionFilter || undefined,
    }).then(res => { setLogs(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [page, actionFilter]);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white">📋 Audit Logs</h1>
        <p className="text-slate-400 text-sm mt-1">Complete system activity trail for compliance and security</p>
      </motion.div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {['', 'login', 'create', 'update', 'delete', 'transfer', 'discharge'].map(a => (
          <button key={a} onClick={() => { setActionFilter(a); setPage(1); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              actionFilter === a
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10'
            }`}>
            {a ? `${actionIcons[a] || '📋'} ${a}` : '📋 All Actions'}
          </button>
        ))}
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12"><div className="animate-spin w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full" /></div>
      ) : (
        <div className="bg-surface-800/50 border border-white/5 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Time</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">User</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Action</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Entity</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Description</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => (
                  <motion.tr
                    key={log.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-white/5 hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3 text-xs text-slate-400">{new Date(log.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs text-slate-300">{log.username || 'System'}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 text-xs text-slate-300">
                        {actionIcons[log.action] || '📋'} {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {log.entity_type}{log.entity_id ? ` #${log.entity_id}` : ''}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 max-w-xs truncate">{log.description || '—'}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          {logs.length === 0 && (
            <div className="text-center py-12 text-slate-500 text-sm">No audit logs found</div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
              className="px-3 py-1.5 bg-white/5 text-slate-400 text-xs rounded-lg disabled:opacity-30">← Previous</button>
            <span className="text-xs text-slate-500">Page {page}</span>
            <button onClick={() => setPage(page + 1)} disabled={logs.length < 50}
              className="px-3 py-1.5 bg-white/5 text-slate-400 text-xs rounded-lg disabled:opacity-30">Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}
