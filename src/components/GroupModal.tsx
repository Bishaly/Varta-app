import React, { useState, useEffect } from 'react';
import { Users, X, Check, Shield, Search, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { User } from '../types';

interface GroupModalProps {
  onClose: () => void;
}

export const GroupModal: React.FC<GroupModalProps> = ({ onClose }) => {
  const { user } = useAuth();
  const { createGroupChat } = useChat();

  const [groupName, setGroupName] = useState<string>('');
  const [groupDescription, setGroupDescription] = useState<string>('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [disappearingTimer, setDisappearingTimer] = useState<number>(0);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch(`/api/users/search?currentUserId=${user?.id || ''}`);
        if (res.ok) {
          const list: User[] = await res.json();
          setAllUsers(list);
        }
      } catch (err) {
        console.error('Failed to load users list:', err);
      }
    }
    fetchUsers();
  }, [user]);

  const toggleUser = (userId: string) => {
    if (selectedUserIds.includes(userId)) {
      setSelectedUserIds(selectedUserIds.filter((id) => id !== userId));
    } else {
      setSelectedUserIds([...selectedUserIds, userId]);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || selectedUserIds.length === 0) return;

    try {
      setIsSubmitting(true);
      await createGroupChat(
        groupName.trim(),
        groupDescription.trim(),
        selectedUserIds,
        disappearingTimer
      );
      onClose();
    } catch (err) {
      console.error('Error creating group:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = allUsers.filter(
    (u) =>
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
        {/* Close Button */}
        <button
          id="btn-close-group-modal"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100">Create Encrypted Group</h2>
            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              Private group with shared cryptographic master keys
            </p>
          </div>
        </div>

        <form onSubmit={handleCreate} className="flex-1 flex flex-col overflow-hidden">
          <div className="space-y-4 mb-4">
            {/* Group Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Group Name *</label>
              <input
                id="input-group-name"
                type="text"
                placeholder="e.g. Core Security Team"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* Group Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Group Description (Optional)</label>
              <input
                id="input-group-description"
                type="text"
                placeholder="Topic or guidelines for this group"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* Disappearing Timer Default */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Disappearing Messages Default Timer
              </label>
              <select
                id="select-group-disappearing-timer"
                value={disappearingTimer}
                onChange={(e) => setDisappearingTimer(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value={0}>Off (Messages do not expire)</option>
                <option value={30}>30 Seconds</option>
                <option value={300}>5 Minutes</option>
                <option value={3600}>1 Hour</option>
                <option value={86400}>24 Hours (1 Day)</option>
                <option value={604800}>7 Days</option>
              </select>
            </div>
          </div>

          {/* Member Selection */}
          <div className="flex-1 flex flex-col min-h-0 border-t border-slate-800 pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300">
                Select Members ({selectedUserIds.length} selected)
              </span>
              <div className="relative w-48">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  id="input-group-search-users"
                  type="text"
                  placeholder="Search by ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-44">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500">
                  No other registered users found.
                </div>
              ) : (
                filteredUsers.map((u) => {
                  const isSelected = selectedUserIds.includes(u.id);
                  return (
                    <div
                      key={u.id}
                      id={`user-select-${u.id}`}
                      onClick={() => toggleUser(u.id)}
                      className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors border ${
                        isSelected
                          ? 'bg-indigo-950/40 border-indigo-700/60'
                          : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-full bg-gradient-to-tr ${u.avatarColor} flex items-center justify-center text-xs font-bold text-white shadow-sm shrink-0`}
                        >
                          {u.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-200 truncate">{u.displayName}</p>
                          <p className="text-[11px] text-slate-400 font-mono">@{u.username}</p>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'border-slate-700 bg-slate-900'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-4 border-t border-slate-800 mt-2 flex gap-3">
            <button
              type="button"
              id="btn-cancel-group"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="btn-submit-create-group"
              disabled={!groupName.trim() || selectedUserIds.length === 0 || isSubmitting}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-900/30 transition-all"
            >
              {isSubmitting ? 'Creating Group...' : 'Create Encrypted Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
