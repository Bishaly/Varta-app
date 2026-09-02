import React, { useState } from 'react';
import {
  MessageSquare,
  Users,
  Search,
  Plus,
  Lock,
  ShieldCheck,
  CalendarClock,
  BookOpen,
  Settings,
  Wifi,
  WifiOff,
  Check,
  CheckCheck,
  Copy,
  Clock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';

interface SidebarProps {
  onOpenNewChat: () => void;
  onOpenNewGroup: () => void;
  onOpenScheduled: () => void;
  onOpen2FA: () => void;
  onOpenDocs: () => void;
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onOpenNewChat,
  onOpenNewGroup,
  onOpenScheduled,
  onOpen2FA,
  onOpenDocs,
  onOpenSettings,
}) => {
  const { user } = useAuth();
  const {
    conversations,
    activeConversation,
    setActiveConversationId,
    isOnline,
    isWsConnected,
    offlineQueueCount,
    scheduledMessages,
    typingUsers,
  } = useChat();

  const [filter, setFilter] = useState<'all' | 'direct' | 'group'>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [copiedId, setCopiedId] = useState<boolean>(false);

  if (!user) return null;

  const copyUserId = () => {
    navigator.clipboard.writeText(`@${user.username}`);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const filteredConversations = conversations.filter((c) => {
    if (filter === 'direct' && c.type !== 'direct') return false;
    if (filter === 'group' && c.type !== 'group') return false;
    if (!searchFilter.trim()) return true;
    return (
      c.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(searchFilter.toLowerCase()))
    );
  });

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="w-full md:w-80 lg:w-96 h-full bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 select-none">
      {/* User Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
        <div
          id="user-profile-summary"
          onClick={onOpenSettings}
          className="flex items-center gap-3 cursor-pointer group min-w-0"
        >
          <div className="relative">
            <div
              className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${user.avatarColor} flex items-center justify-center text-base font-bold text-white shadow-md shadow-slate-950/60`}
            >
              {user.displayName.charAt(0).toUpperCase()}
            </div>
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${
                isWsConnected ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-xs font-bold text-slate-100 group-hover:text-emerald-400 transition-colors truncate">
                {user.displayName}
              </h2>
              {user.twoFactorEnabled && (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" title="2FA Guarded" />
              )}
            </div>
            {/* Telegram-style ID Display (No phone number!) */}
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[11px] font-mono text-slate-400 font-semibold truncate">
                @{user.username}
              </span>
              <button
                id="btn-copy-sidebar-id"
                onClick={(e) => {
                  e.stopPropagation();
                  copyUserId();
                }}
                className="text-[10px] text-slate-500 hover:text-emerald-400 transition-colors"
                title="Copy User ID"
              >
                {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          <button
            id="btn-new-chat-top"
            onClick={onOpenNewChat}
            className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800/80 rounded-xl transition-colors"
            title="New Direct Chat"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            id="btn-new-group-top"
            onClick={onOpenNewGroup}
            className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-800/80 rounded-xl transition-colors"
            title="Create Encrypted Group"
          >
            <Users className="w-4 h-4" />
          </button>
          <button
            id="btn-settings-top"
            onClick={onOpenSettings}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-xl transition-colors"
            title="Settings & Privacy"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-4 py-2.5 bg-slate-900/50">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            id="input-sidebar-search"
            type="text"
            placeholder="Search chats or ID..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 transition-colors"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 pb-2 flex items-center justify-between gap-1 border-b border-slate-800/60 text-xs">
        <div className="flex items-center gap-1">
          {[
            { id: 'all', label: 'All' },
            { id: 'direct', label: 'Direct' },
            { id: 'group', label: 'Groups' },
          ].map((t) => (
            <button
              key={t.id}
              id={`filter-tab-${t.id}`}
              onClick={() => setFilter(t.id as any)}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                filter === t.id
                  ? 'bg-slate-800 text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Scheduled Messages Button */}
        <button
          id="btn-open-scheduled-messages"
          onClick={onOpenScheduled}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
            scheduledMessages.length > 0
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800/50'
          }`}
          title="Scheduled Messages"
        >
          <CalendarClock className="w-3.5 h-3.5" />
          <span>Scheduled</span>
          {scheduledMessages.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 text-[10px] font-bold flex items-center justify-center">
              {scheduledMessages.length}
            </span>
          )}
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/30">
        {filteredConversations.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-xs flex flex-col items-center">
            <MessageSquare className="w-8 h-8 text-slate-600 mb-2" />
            <p className="font-semibold text-slate-400">No conversations yet</p>
            <p className="text-[11px] mt-1 max-w-[200px]">
              Click "+" above to search user IDs or create an encrypted group.
            </p>
            <button
              id="btn-start-first-chat"
              onClick={onOpenNewChat}
              className="mt-4 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md transition-all"
            >
              Find Users by ID
            </button>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isSelected = activeConversation?.id === conv.id;
            const isTyping = typingUsers[conv.id] && typingUsers[conv.id].length > 0;

            return (
              <div
                key={conv.id}
                id={`conversation-item-${conv.id}`}
                onClick={() => setActiveConversationId(conv.id)}
                className={`p-3.5 flex items-center gap-3 cursor-pointer transition-all border-l-2 ${
                  isSelected
                    ? 'bg-slate-800/90 border-emerald-500'
                    : 'bg-transparent border-transparent hover:bg-slate-800/40'
                }`}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div
                    className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${conv.avatarColor || 'from-emerald-500 to-teal-600'} flex items-center justify-center text-sm font-bold text-white shadow-sm`}
                  >
                    {conv.type === 'group' ? (
                      <Users className="w-5 h-5" />
                    ) : (
                      conv.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  {conv.type === 'direct' && conv.isOtherUserOnline && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900" />
                  )}
                </div>

                {/* Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between mb-0.5">
                    <h3 className="text-xs font-bold text-slate-200 truncate flex items-center gap-1.5">
                      {conv.name}
                      <Lock className="w-2.5 h-2.5 text-emerald-400 shrink-0" title="E2EE" />
                    </h3>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {formatTime(conv.lastMessage?.timestamp || conv.updatedAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-slate-400 truncate max-w-[180px]">
                      {isTyping ? (
                        <span className="text-emerald-400 font-medium animate-pulse">
                          typing...
                        </span>
                      ) : conv.lastMessage ? (
                        conv.lastMessage.text
                      ) : (
                        <span className="text-slate-500 italic">No messages yet</span>
                      )}
                    </p>

                    {/* Delivery Status or Unread count */}
                    {conv.lastMessage?.senderId === user.id && (
                      <span className="text-slate-400">
                        {conv.lastMessage.status === 'read' ? (
                          <CheckCheck className="w-3.5 h-3.5 text-sky-400" />
                        ) : conv.lastMessage.status === 'delivered' ? (
                          <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
                        ) : (
                          <Check className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Status Footer (Self-Host Docs & Connection Info) */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-[11px]">
        {/* Network & Offline Queue Status */}
        <div className="flex items-center gap-1.5">
          {isWsConnected ? (
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <Wifi className="w-3.5 h-3.5" />
              <span>Real-time</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-400 font-medium">
              <WifiOff className="w-3.5 h-3.5" />
              <span>Offline {offlineQueueCount > 0 ? `(${offlineQueueCount} queued)` : ''}</span>
            </span>
          )}
        </div>

        {/* 0-Cost Docs Modal Trigger */}
        <button
          id="btn-open-selfhost-docs"
          onClick={onOpenDocs}
          className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition-colors border border-slate-700/60 shadow-sm"
        >
          <BookOpen className="w-3 h-3 text-emerald-400" />
          <span>0-Cost Docs</span>
        </button>
      </div>
    </div>
  );
};
