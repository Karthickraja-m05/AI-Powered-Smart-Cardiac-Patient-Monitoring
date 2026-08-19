import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { chatAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import type { ChatMessage } from '../../types';

const roleColors: Record<string, string> = {
  doctor: 'bg-blue-500',
  nurse: 'bg-green-500',
  receptionist: 'bg-purple-500',
  caregiver: 'bg-orange-500',
  patient: 'bg-sky-500',
  super_admin: 'bg-amber-500',
  hospital_admin: 'bg-teal-500',
};

interface Props {
  patientId: number;
}

export default function CareTeamChat({ patientId }: Props) {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    try {
      const res = await chatAPI.getMessages(patientId, 100);
      setMessages(res.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => {
    fetchMessages();
    // Poll for new messages every 5 seconds
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [patientId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    setSending(true);
    try {
      await chatAPI.sendMessage({
        patient_id: patientId,
        message: newMessage.trim(),
        message_type: 'text',
        is_urgent: isUrgent,
      });
      setNewMessage('');
      setIsUrgent(false);
      await fetchMessages();
    } catch (e) { console.error(e); }
    setSending(false);
  };

  return (
    <div className="bg-surface-800/50 border border-white/5 rounded-2xl overflow-hidden flex flex-col" style={{ height: '500px' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-surface-900/50">
        <div className="flex items-center gap-2">
          <span className="text-lg">💬</span>
          <h3 className="text-sm font-semibold text-white">Care Team Chat</h3>
          <span className="text-[10px] text-slate-500">(Patient #{patientId})</span>
        </div>
        <span className="flex items-center gap-1 text-xs text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-slate-500 py-12">
            <span className="text-3xl block mb-2">💬</span>
            <p className="text-sm">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMine = msg.sender_id === user?.id;
            const roleColor = roleColors[msg.sender_role || 'patient'] || 'bg-slate-500';

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] ${isMine ? 'order-1' : ''}`}>
                  {!isMine && (
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-5 h-5 rounded-full ${roleColor} flex items-center justify-center text-white text-[8px] font-bold`}>
                        {msg.sender_name?.[0] || '?'}
                      </span>
                      <span className="text-xs text-slate-400">{msg.sender_name}</span>
                      <span className="text-[10px] text-slate-500 capitalize">{msg.sender_role?.replace('_', ' ')}</span>
                    </div>
                  )}
                  <div className={`px-4 py-2.5 rounded-2xl text-sm ${
                    isMine
                      ? 'bg-blue-600 text-white rounded-br-md'
                      : msg.is_urgent
                        ? 'bg-red-500/20 text-red-200 border border-red-500/30 rounded-bl-md'
                        : 'bg-white/10 text-slate-200 rounded-bl-md'
                  }`}>
                    {msg.is_urgent && <span className="text-xs font-bold text-red-400 block mb-1">⚠️ URGENT</span>}
                    <p>{msg.message}</p>
                  </div>
                  <p className={`text-[10px] text-slate-500 mt-1 ${isMine ? 'text-right' : ''}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </motion.div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-white/5 p-3 bg-surface-900/30">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsUrgent(!isUrgent)}
            className={`p-2 rounded-xl transition-all flex-shrink-0 ${
              isUrgent
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-white/5 text-slate-500 hover:text-amber-400 border border-white/5'
            }`}
            title={isUrgent ? 'Urgent ON' : 'Mark as urgent'}
          >
            ⚠️
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
          />
          <button
            onClick={sendMessage}
            disabled={sending || !newMessage.trim()}
            className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all disabled:opacity-50 flex-shrink-0"
          >
            {sending ? '...' : '➤'}
          </button>
        </div>
      </div>
    </div>
  );
}
