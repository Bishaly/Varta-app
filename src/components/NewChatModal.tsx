import React, { useState, useEffect } from 'react';
import { MessageSquarePlus, X, Search, ShieldCheck, Lock, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { User } from '../types';

interface NewChatModalProps {
  onClose: () => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({ onClose }) => {
  const { user } = useAuth();
  const { createDirectChat } = useChat();

  const [query, setQuery] = useState<string>('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function searchUsers() {
      try {
        setLoading(true);
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}&currentUserId=${user?.id || ''}`);
        if (res.ok) {
          const list: User[] = await res.json();
          setUsers(list);
        }
      } catch (err) {
        console.error('Search users error:', err);
      } finally {
        setLoading(false);
      }
    }
    const timeout = setTimeout(searchUsers, 200);
    return () => clearTimeout(timeout);
  }, [query, user]);

  const handleStartChat = async (targetUser: User) => {
    await createDirectChat(targetUser);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-md p-6 shadow-2xl relative max-h-[85vh] flex flex-col">
        {/* Close Button */}
        <button
          id="btn-close-new-chat-modal"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
            <MessageSquarePlus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">New Encrypted Chat</h2>
            <p className="text-xs text-slate-400">Search by Telegram-style User ID / Handle</p>
          </div>
        </div>

        {/* Search input */}
        <div className="relative mb-4">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="input-search-new-chat-user"
            type="text"
            placeholder="Search by ID or username (e.g. @bob_dev)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* Privacy reminder */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 mb-3 flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-[11px] text-slate-400">
            Privacy First: Phone numbers are never required or exposed.
          </span>
        </div>

        {/* User list */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px]">
          {loading ? (
            <div className="text-center py-10 text-xs text-slate-500">Searching contacts...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-500">
              No users matching "{query}".
            </div>
          ) : (
            users.map((u) => (
              <div
                key={u.id}
                id={`chat-target-${u.id}`}
                onClick={() => handleStartChat(u)}
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/40 border border-slate-800/80 hover:bg-slate-800/60 hover:border-emerald-500/40 cursor-pointer transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-full bg-gradient-to-tr ${u.avatarColor} flex items-center justify-center text-sm font-bold text-white shadow-sm shrink-0`}
                  >
                    {u.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-semibold text-slate-200 truncate">{u.displayName}</p>
                      {u.publicKeyJwk && (
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" title="E2EE Ready" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono">@{u.username}</p>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">{u.bio || 'Encrypted user'}</p>
                  </div>
                </div>

                <button
                  id={`btn-start-chat-${u.id}`}
                  className="p-2 bg-emerald-500/10 group-hover:bg-emerald-600 text-emerald-400 group-hover:text-white rounded-xl transition-all"
                  title="Start Chat"
                >
                  <UserPlus className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
