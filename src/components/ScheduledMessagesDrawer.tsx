import React, { useState, useEffect } from 'react';
import { CalendarClock, X, Trash2, Send, Clock, MessageSquare, AlertCircle } from 'lucide-react';
import { useChat } from '../context/ChatContext';
import { Message } from '../types';

interface ScheduledMessagesDrawerProps {
  onClose: () => void;
}

export const ScheduledMessagesDrawer: React.FC<ScheduledMessagesDrawerProps> = ({ onClose }) => {
  const { scheduledMessages, cancelScheduledMessage, sendMessage } = useChat();
  const [now, setNow] = useState<number>(Date.now());

  // Update timer every second
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatCountdown = (targetTime?: number) => {
    if (!targetTime) return 'Soon';
    const diffMs = targetTime - now;
    if (diffMs <= 0) return 'Sending now...';

    const diffSecs = Math.floor(diffMs / 1000);
    const hours = Math.floor(diffSecs / 3600);
    const minutes = Math.floor((diffSecs % 3600) / 60);
    const seconds = diffSecs % 60;

    if (hours > 0) {
      return `in ${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
      return `in ${minutes}m ${seconds}s`;
    }
    return `in ${seconds}s`;
  };

  const handleSendNow = async (msg: Message) => {
    await cancelScheduledMessage(msg.id);
    await sendMessage(
      msg.decryptedContent || msg.ciphertext,
      msg.type,
      msg.fileData,
      msg.replyTo
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border-l border-slate-700/80 w-full max-w-md h-full p-6 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Scheduled Messages</h2>
              <p className="text-xs text-slate-400">
                {scheduledMessages.length} message{scheduledMessages.length === 1 ? '' : 's'} queued
              </p>
            </div>
          </div>
          <button
            id="btn-close-scheduled-drawer"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of scheduled messages */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {scheduledMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
              <Clock className="w-12 h-12 text-slate-600 mb-3" />
              <p className="text-sm font-semibold text-slate-300">No Scheduled Messages</p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                When composing a message, click the Schedule Clock icon to schedule messages for automatic future dispatch.
              </p>
            </div>
          ) : (
            scheduledMessages.map((msg) => (
              <div
                key={msg.id}
                className="bg-slate-950/70 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-4 transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 bg-amber-950/40 border border-amber-800/40 px-2.5 py-1 rounded-full">
                    <Clock className="w-3.5 h-3.5 animate-spin" />
                    <span>{formatCountdown(msg.scheduledFor)}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {msg.scheduledFor ? new Date(msg.scheduledFor).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>

                <p className="text-sm text-slate-200 line-clamp-3 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80 mb-3 font-normal">
                  {msg.decryptedContent || msg.ciphertext || '[Attachment]'}
                </p>

                <div className="flex items-center justify-between pt-1 border-t border-slate-800/50">
                  <button
                    id={`btn-cancel-scheduled-${msg.id}`}
                    onClick={() => cancelScheduledMessage(msg.id)}
                    className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 hover:bg-rose-500/10 px-2 py-1 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Cancel
                  </button>

                  <button
                    id={`btn-send-scheduled-now-${msg.id}`}
                    onClick={() => handleSendNow(msg)}
                    className="text-xs bg-emerald-600/90 hover:bg-emerald-500 text-white flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors"
                  >
                    <Send className="w-3 h-3" />
                    Send Now
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
