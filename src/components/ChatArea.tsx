import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Search,
  Paperclip,
  Smile,
  Send,
  Mic,
  CalendarClock,
  Clock,
  Check,
  CheckCheck,
  ChevronDown,
  FileText,
  Download,
  Play,
  Pause,
  Reply,
  X,
  Image as ImageIcon,
  ArrowLeft,
  Users,
  Info,
  Timer,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { Message, FileAttachment } from '../types';
import { VoiceRecorder } from './VoiceRecorder';

interface ChatAreaProps {
  onOpenSafetyNumber: () => void;
  onBackToSidebar?: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({ onOpenSafetyNumber, onBackToSidebar }) => {
  const { user } = useAuth();
  const {
    activeConversation,
    messages,
    sendMessage,
    scheduleMessage,
    updateConversationSettings,
    sendTypingSignal,
    typingUsers,
  } = useChat();

  const [inputContent, setInputContent] = useState<string>('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState<boolean>(false);
  const [showScheduler, setShowScheduler] = useState<boolean>(false);
  const [scheduledDateTime, setScheduledDateTime] = useState<string>('');
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [searchInChat, setSearchInChat] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showDisappearingMenu, setShowDisappearingMenu] = useState<boolean>(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Audio playback state
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeConversation]);

  if (!user || !activeConversation) {
    return (
      <div className="flex-1 h-full bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-slate-500">
        <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 text-emerald-500 shadow-inner">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-slate-200">Varta Secure Messenger</h2>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          Select a chat from the sidebar or click "+" to start an end-to-end encrypted conversation.
        </p>
      </div>
    );
  }

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputContent.trim()) return;

    const content = inputContent.trim();
    setInputContent('');
    sendTypingSignal(false);

    const reply = replyingTo
      ? {
          id: replyingTo.id,
          senderDisplayName: replyingTo.senderDisplayName,
          textPreview: replyingTo.decryptedContent || replyingTo.ciphertext,
        }
      : undefined;

    setReplyingTo(null);
    await sendMessage(content, 'text', undefined, reply);
  };

  const handleScheduleSend = async () => {
    if (!inputContent.trim() || !scheduledDateTime) return;
    const timestamp = new Date(scheduledDateTime).getTime();
    if (timestamp <= Date.now()) {
      alert('Scheduled time must be in the future.');
      return;
    }

    const content = inputContent.trim();
    setInputContent('');
    setShowScheduler(false);
    setScheduledDateTime('');

    const reply = replyingTo
      ? {
          id: replyingTo.id,
          senderDisplayName: replyingTo.senderDisplayName,
          textPreview: replyingTo.decryptedContent || replyingTo.ciphertext,
        }
      : undefined;

    setReplyingTo(null);
    await scheduleMessage(content, timestamp, 'text', undefined, reply);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      const isImg = file.type.startsWith('image/');
      const fileAttachment: FileAttachment = {
        name: file.name,
        size: file.size,
        mimeType: file.type,
        dataUrl: base64Data,
      };

      await sendMessage(
        isImg ? `📷 ${file.name}` : `📎 ${file.name}`,
        isImg ? 'image' : 'file',
        fileAttachment
      );
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSendVoiceNote = async (fileData: FileAttachment) => {
    setIsRecordingVoice(false);
    await sendMessage('🎤 Voice message', 'audio', fileData);
  };

  const toggleAudio = (msgId: string, dataUrl?: string) => {
    if (!dataUrl) return;

    if (playingAudioId === msgId) {
      audioPlayerRef.current?.pause();
      setPlayingAudioId(null);
    } else {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.src = dataUrl;
        audioPlayerRef.current.playbackRate = playbackSpeed;
        audioPlayerRef.current.play();
        setPlayingAudioId(msgId);
      }
    }
  };

  const cyclePlaybackSpeed = () => {
    const speeds = [1, 1.5, 2];
    const nextIndex = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    const newSpeed = speeds[nextIndex];
    setPlaybackSpeed(newSpeed);
    if (audioPlayerRef.current) {
      audioPlayerRef.current.playbackRate = newSpeed;
    }
  };

  const filteredMessages = messages.filter((m) => {
    if (!searchInChat.trim()) return true;
    const content = m.decryptedContent || m.ciphertext;
    return content.toLowerCase().includes(searchInChat.toLowerCase());
  });

  const emojis = ['👍', '❤️', '🔥', '🔒', '🚀', '🎉', '👏', '😂', '🤝', '⚡', '✨', '👌'];

  const disappearingOptions = [
    { label: 'Off', val: 0 },
    { label: '30 Seconds', val: 30 },
    { label: '5 Minutes', val: 300 },
    { label: '1 Hour', val: 3600 },
    { label: '24 Hours', val: 86400 },
    { label: '7 Days', val: 604800 },
  ];

  const formatTimerLabel = (secs: number) => {
    if (secs === 0) return 'Off';
    if (secs < 60) return `${secs}s`;
    if (secs < 3600) return `${Math.floor(secs / 60)}m`;
    if (secs < 86400) return `${Math.floor(secs / 3600)}h`;
    return `${Math.floor(secs / 86400)}d`;
  };

  return (
    <div className="flex-1 h-full bg-slate-950 flex flex-col min-w-0 relative">
      {/* Hidden Global Audio Element for Voice Notes */}
      <audio
        ref={audioPlayerRef}
        onEnded={() => setPlayingAudioId(null)}
        className="hidden"
      />

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Top Header */}
      <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between z-10">
        <div className="flex items-center gap-3 min-w-0">
          {onBackToSidebar && (
            <button
              id="btn-back-to-sidebar"
              onClick={onBackToSidebar}
              className="md:hidden p-1.5 text-slate-400 hover:text-slate-200"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div
            className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${activeConversation.avatarColor || 'from-emerald-500 to-teal-600'} flex items-center justify-center text-sm font-bold text-white shadow-sm shrink-0`}
          >
            {activeConversation.type === 'group' ? (
              <Users className="w-5 h-5" />
            ) : (
              activeConversation.name.charAt(0).toUpperCase()
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-100 truncate">
                {activeConversation.name}
              </h2>
              {/* E2EE Shield Pill (Clickable to verify Safety Number) */}
              <button
                id="btn-verify-safety-badge"
                onClick={onOpenSafetyNumber}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-semibold transition-colors"
                title="Click to verify E2EE Safety Number"
              >
                <ShieldCheck className="w-3 h-3" />
                <span>E2EE</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-400 truncate">
              {activeConversation.type === 'group'
                ? `${activeConversation.participants.length} members • Encrypted Group`
                : activeConversation.isOtherUserOnline
                ? 'Online'
                : 'Offline'}
            </p>
          </div>
        </div>

        {/* Header Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* Disappearing Timer Button */}
          <div className="relative">
            <button
              id="btn-disappearing-timer"
              onClick={() => setShowDisappearingMenu(!showDisappearingMenu)}
              className={`p-2 rounded-xl text-xs flex items-center gap-1 transition-colors ${
                activeConversation.disappearingTimer > 0
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="Disappearing Messages Timer"
            >
              <Timer className="w-4 h-4" />
              {activeConversation.disappearingTimer > 0 && (
                <span className="text-[10px] font-bold">
                  {formatTimerLabel(activeConversation.disappearingTimer)}
                </span>
              )}
            </button>

            {/* Disappearing Dropdown */}
            {showDisappearingMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-slate-900 border border-slate-700 rounded-2xl shadow-xl p-2 z-30 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Disappearing Messages
                </div>
                {disappearingOptions.map((opt) => (
                  <button
                    key={opt.val}
                    id={`opt-disappearing-${opt.val}`}
                    onClick={async () => {
                      await updateConversationSettings(activeConversation.id, {
                        disappearingTimer: opt.val,
                      });
                      setShowDisappearingMenu(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                      activeConversation.disappearingTimer === opt.val
                        ? 'bg-emerald-600 text-white font-semibold'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {activeConversation.disappearingTimer === opt.val && (
                      <Check className="w-3.5 h-3.5" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search in chat toggle */}
          <button
            id="btn-toggle-search-in-chat"
            onClick={() => setIsSearching(!isSearching)}
            className={`p-2 rounded-xl transition-colors ${
              isSearching
                ? 'bg-slate-800 text-emerald-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="Search inside chat"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* In-Chat Search Bar */}
      {isSearching && (
        <div className="p-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-500 ml-2" />
          <input
            id="input-search-inside-chat"
            type="text"
            placeholder="Search text in this chat..."
            value={searchInChat}
            onChange={(e) => setSearchInChat(e.target.value)}
            autoFocus
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          />
          <button
            onClick={() => {
              setIsSearching(false);
              setSearchInChat('');
            }}
            className="p-1.5 text-slate-400 hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* E2EE Security Shield Banner */}
        <div className="p-3 bg-emerald-950/20 border border-emerald-800/30 rounded-2xl text-center max-w-md mx-auto">
          <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-400 mb-1">
            <Lock className="w-3.5 h-3.5" />
            <span>End-to-End Encrypted</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Messages and files are encrypted with ECDH P-256 and AES-256-GCM. No telecom phone numbers are
            revealed.
          </p>
        </div>

        {/* Message Bubbles */}
        {filteredMessages.map((msg) => {
          const isMe = msg.senderId === user.id;

          return (
            <div
              key={msg.id}
              id={`message-bubble-${msg.id}`}
              className={`flex flex-col group ${isMe ? 'items-end' : 'items-start'}`}
            >
              {/* Sender Name in group chats */}
              {!isMe && activeConversation.type === 'group' && (
                <span className="text-[10px] font-bold text-emerald-400 ml-3 mb-1">
                  {msg.senderDisplayName} (@{msg.senderUsername})
                </span>
              )}

              <div
                className={`relative max-w-[85%] sm:max-w-md p-3 rounded-2xl text-xs leading-relaxed shadow-md transition-all ${
                  isMe
                    ? 'bg-emerald-700 text-slate-100 rounded-br-sm'
                    : 'bg-slate-800/90 text-slate-200 border border-slate-700/60 rounded-bl-sm'
                }`}
              >
                {/* Reply Quote preview */}
                {msg.replyTo && (
                  <div
                    className={`p-2 rounded-xl mb-2 border-l-2 text-[11px] ${
                      isMe
                        ? 'bg-emerald-800/80 border-emerald-300 text-emerald-100'
                        : 'bg-slate-900/80 border-emerald-500 text-slate-300'
                    }`}
                  >
                    <p className="font-semibold text-[10px] opacity-90">{msg.replyTo.senderDisplayName}</p>
                    <p className="truncate line-clamp-1">{msg.replyTo.textPreview}</p>
                  </div>
                )}

                {/* TYPE: Image */}
                {msg.type === 'image' && msg.fileData?.dataUrl && (
                  <div className="mb-2 rounded-xl overflow-hidden cursor-pointer">
                    <img
                      src={msg.fileData.dataUrl}
                      alt={msg.fileData.name}
                      onClick={() => setLightboxImage(msg.fileData!.dataUrl!)}
                      className="max-h-60 w-full object-cover rounded-xl hover:opacity-95 transition-opacity"
                    />
                  </div>
                )}

                {/* TYPE: Voice Note / Audio */}
                {msg.type === 'audio' && msg.fileData?.dataUrl && (
                  <div className="flex items-center gap-3 p-1.5 min-w-[200px]">
                    <button
                      id={`btn-play-voice-${msg.id}`}
                      onClick={() => toggleAudio(msg.id, msg.fileData?.dataUrl)}
                      className="w-9 h-9 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shadow-md hover:scale-105 transition-transform"
                    >
                      {playingAudioId === msg.id ? (
                        <Pause className="w-4 h-4 fill-current" />
                      ) : (
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      )}
                    </button>

                    <div className="flex-1">
                      <div className="flex items-center justify-between text-[10px] opacity-80 mb-1">
                        <span>Voice Note</span>
                        <span>{msg.fileData.duration ? `${msg.fileData.duration}s` : '0:12'}</span>
                      </div>
                      <div className="h-1.5 bg-black/20 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-white rounded-full ${
                            playingAudioId === msg.id ? 'w-full animate-pulse' : 'w-1/3'
                          }`}
                        />
                      </div>
                    </div>

                    <button
                      onClick={cyclePlaybackSpeed}
                      className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-black/20 hover:bg-black/40"
                    >
                      {playbackSpeed}x
                    </button>
                  </div>
                )}

                {/* TYPE: Document/File */}
                {msg.type === 'file' && msg.fileData && (
                  <div className="flex items-center gap-3 p-2 bg-black/20 rounded-xl mb-2">
                    <FileText className="w-6 h-6 text-emerald-300 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-xs truncate">{msg.fileData.name}</p>
                      <p className="text-[10px] opacity-75">
                        {(msg.fileData.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    {msg.fileData.dataUrl && (
                      <a
                        href={msg.fileData.dataUrl}
                        download={msg.fileData.name}
                        className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white"
                        title="Download file"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                )}

                {/* Message Text Content */}
                {msg.type !== 'audio' && (
                  <p className="whitespace-pre-wrap break-words">
                    {msg.decryptedContent || msg.ciphertext}
                  </p>
                )}

                {/* Message Metadata (Timestamp + Delivery Ticks + Disappearing badge) */}
                <div className="flex items-center justify-end gap-1.5 mt-1 text-[10px] opacity-75 select-none font-mono">
                  {msg.disappearsAt && (
                    <span className="flex items-center gap-0.5 text-amber-300" title="Disappearing message">
                      <Timer className="w-3 h-3" />
                    </span>
                  )}
                  <span>
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>

                  {isMe && (
                    <span>
                      {msg.status === 'read' ? (
                        <CheckCheck className="w-3.5 h-3.5 text-sky-300" title="Read" />
                      ) : msg.status === 'delivered' ? (
                        <CheckCheck className="w-3.5 h-3.5 opacity-90" title="Delivered" />
                      ) : msg.status === 'sent' ? (
                        <Check className="w-3.5 h-3.5 opacity-90" title="Sent" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-amber-300 animate-spin" title="Queued/Offline" />
                      )}
                    </span>
                  )}
                </div>

                {/* Quick Reply Button (hover) */}
                <button
                  id={`btn-reply-msg-${msg.id}`}
                  onClick={() => setReplyingTo(msg)}
                  className="absolute -top-3 right-2 opacity-0 group-hover:opacity-100 p-1 bg-slate-900 text-slate-300 hover:text-emerald-400 rounded-full border border-slate-700 shadow-md transition-all"
                  title="Reply"
                >
                  <Reply className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Replying Banner */}
      {replyingTo && (
        <div className="px-4 py-2 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs border-l-2 border-emerald-500 pl-2">
            <span className="font-semibold text-emerald-400">Replying to {replyingTo.senderDisplayName}:</span>
            <span className="text-slate-300 truncate max-w-xs">{replyingTo.decryptedContent || replyingTo.ciphertext}</span>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="p-1 text-slate-400 hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Send Later / Scheduling Modal Popover */}
      {showScheduler && (
        <div className="absolute bottom-20 left-4 right-4 sm:left-auto sm:right-16 z-30 p-4 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-sm animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
              <CalendarClock className="w-4 h-4 text-amber-400" />
              Schedule Message ("Send Later")
            </span>
            <button onClick={() => setShowScheduler(false)} className="text-slate-400 hover:text-slate-200">
              <X className="w-4 h-4" />
            </button>
          </div>
          <input
            id="input-schedule-datetime"
            type="datetime-local"
            value={scheduledDateTime}
            onChange={(e) => setScheduledDateTime(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 mb-3 focus:outline-none focus:border-amber-500"
          />
          <button
            id="btn-confirm-schedule-send"
            onClick={handleScheduleSend}
            disabled={!inputContent.trim() || !scheduledDateTime}
            className="w-full py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
          >
            <Clock className="w-3.5 h-3.5" />
            Schedule Message
          </button>
        </div>
      )}

      {/* Emoji Picker Popover */}
      {showEmojiPicker && (
        <div className="absolute bottom-20 left-4 z-30 p-2.5 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl grid grid-cols-6 gap-1.5 animate-in fade-in">
          {emojis.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                setInputContent((prev) => prev + emoji);
                setShowEmojiPicker(false);
              }}
              className="w-8 h-8 flex items-center justify-center text-lg hover:bg-slate-800 rounded-lg transition-transform hover:scale-125"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Bottom Composer Bar */}
      <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
        {isRecordingVoice ? (
          /* Voice Recorder in progress */
          <VoiceRecorder
            onSendVoiceNote={handleSendVoiceNote}
            onCancel={() => setIsRecordingVoice(false)}
          />
        ) : (
          <>
            {/* Emoji Button */}
            <button
              id="btn-toggle-emoji-picker"
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-full transition-colors"
              title="Add Emoji"
            >
              <Smile className="w-5 h-5" />
            </button>

            {/* Attachment Button */}
            <button
              id="btn-attach-file"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-full transition-colors"
              title="Attach File or Image"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            {/* Message Input */}
            <form onSubmit={handleSend} className="flex-1 flex items-center gap-2">
              <input
                id="input-chat-message"
                type="text"
                placeholder="Type encrypted message (Enter to send)..."
                value={inputContent}
                onChange={(e) => {
                  setInputContent(e.target.value);
                  sendTypingSignal(true);
                }}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />

              {/* Schedule / Send Later Button */}
              <button
                id="btn-open-scheduler-modal"
                type="button"
                onClick={() => setShowScheduler(!showScheduler)}
                className={`p-2 rounded-full transition-colors ${
                  showScheduler
                    ? 'text-amber-400 bg-amber-500/10'
                    : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800'
                }`}
                title="Schedule Message (Send Later)"
              >
                <CalendarClock className="w-5 h-5" />
              </button>

              {/* Voice Note or Send Button */}
              {inputContent.trim() ? (
                <button
                  id="btn-send-chat-message"
                  type="submit"
                  className="p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full shadow-md shadow-emerald-950 transition-transform active:scale-95"
                  title="Send Encrypted Message"
                >
                  <Send className="w-4 h-4" />
                </button>
              ) : (
                <button
                  id="btn-start-voice-record"
                  type="button"
                  onClick={() => setIsRecordingVoice(true)}
                  className="p-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-full transition-transform active:scale-95"
                  title="Record Voice Note"
                >
                  <Mic className="w-4 h-4" />
                </button>
              )}
            </form>
          </>
        )}
      </div>

      {/* Lightbox Modal for Images */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-3 text-white hover:text-emerald-400 rounded-full"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={lightboxImage}
            alt="Full size view"
            className="max-h-[85vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};
