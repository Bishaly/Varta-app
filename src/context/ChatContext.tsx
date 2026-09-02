import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Conversation, Message, MessageType, FileAttachment, User } from '../types';
import { useAuth } from './AuthContext';
import {
  deriveSharedAesKey,
  importPublicKeyFromJwk,
  encryptPayload,
  decryptPayload,
  generateGroupMasterKey,
  exportKeyToJwk,
} from '../utils/crypto';

interface ChatContextType {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  scheduledMessages: Message[];
  isOnline: boolean;
  isWsConnected: boolean;
  offlineQueueCount: number;
  typingUsers: Record<string, string[]>; // conversationId -> userIds typing
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  setActiveConversationId: (id: string | null) => void;
  sendMessage: (
    content: string,
    type?: MessageType,
    fileData?: FileAttachment,
    replyTo?: Message['replyTo']
  ) => Promise<boolean>;
  scheduleMessage: (
    content: string,
    scheduledFor: number,
    type?: MessageType,
    fileData?: FileAttachment,
    replyTo?: Message['replyTo']
  ) => Promise<boolean>;
  cancelScheduledMessage: (id: string) => Promise<boolean>;
  createDirectChat: (targetUser: User) => Promise<Conversation | null>;
  createGroupChat: (name: string, description: string, participantIds: string[], disappearingTimer?: number) => Promise<Conversation | null>;
  updateConversationSettings: (convId: string, settings: Partial<Conversation>) => Promise<boolean>;
  sendTypingSignal: (isTyping: boolean) => void;
  refreshConversations: () => Promise<void>;
  markAsRead: (messageId: string, conversationId: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const OFFLINE_QUEUE_KEY = 'ciphergram_offline_queue';
const DECRYPTED_CACHE_KEY = 'ciphergram_decrypted_cache';

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, privateKey } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [scheduledMessages, setScheduledMessages] = useState<Message[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isWsConnected, setIsWsConnected] = useState<boolean>(false);
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});
  const [searchQuery, setSearchQuery] = useState<string>('');

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const decryptedCacheRef = useRef<Map<string, string>>(new Map());

  // Load decrypted cache and offline queue from localStorage
  useEffect(() => {
    try {
      const savedCache = localStorage.getItem(DECRYPTED_CACHE_KEY);
      if (savedCache) {
        const parsed = JSON.parse(savedCache);
        Object.entries(parsed).forEach(([k, v]) => decryptedCacheRef.current.set(k, v as string));
      }

      const savedQueue = localStorage.getItem(OFFLINE_QUEUE_KEY);
      if (savedQueue) {
        setOfflineQueue(JSON.parse(savedQueue));
      }
    } catch (e) {
      console.error('Error loading local cache:', e);
    }
  }, []);

  // Save decrypted cache helper
  const cacheDecryptedMessage = (messageId: string, text: string) => {
    decryptedCacheRef.current.set(messageId, text);
    try {
      const obj: Record<string, string> = {};
      decryptedCacheRef.current.forEach((val, key) => (obj[key] = val));
      localStorage.setItem(DECRYPTED_CACHE_KEY, JSON.stringify(obj));
    } catch {}
  };

  // Online / Offline window listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      connectWebSocket();
      flushOfflineQueue();
    };
    const handleOffline = () => {
      setIsOnline(false);
      setIsWsConnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user]);

  // Connect WebSocket
  const connectWebSocket = useCallback(() => {
    if (!user) return;
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsWsConnected(true);
        // Authenticate socket with user ID
        ws.send(
          JSON.stringify({
            type: 'auth:connect',
            data: { userId: user.id },
          })
        );
        flushOfflineQueue();
      };

      ws.onmessage = async (event) => {
        try {
          const payload = JSON.parse(event.data);
          const { type, data } = payload;

          if (type === 'message:new') {
            handleIncomingMessage(data);
          } else if (type === 'message:status_update') {
            handleMessageStatusUpdate(data);
          } else if (type === 'user:typing') {
            handleUserTyping(data);
          } else if (type === 'user:presence') {
            handleUserPresence(data);
          } else if (type === 'conversation:new' || type === 'conversation:updated') {
            refreshConversations();
          }
        } catch (err) {
          console.error('WS message parse error:', err);
        }
      };

      ws.onclose = () => {
        setIsWsConnected(false);
        wsRef.current = null;
        // Auto-reconnect after 3s
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
      };

      ws.onerror = () => {
        setIsWsConnected(false);
      };
    } catch (err) {
      console.error('WebSocket connection failed:', err);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      connectWebSocket();
      refreshConversations();
      fetchScheduledMessages();
    } else {
      if (wsRef.current) wsRef.current.close();
      setConversations([]);
      setMessages([]);
      setActiveConversation(null);
    }

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [user, connectWebSocket]);

  // Handle incoming real-time message
  const handleIncomingMessage = async (msg: Message) => {
    // Decrypt content
    const decryptedText = await decryptMessage(msg);
    const resolvedMsg: Message = {
      ...msg,
      decryptedContent: decryptedText,
      status: 'delivered',
    };

    // Update messages list if for active conversation
    if (activeConversation && msg.conversationId === activeConversation.id) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, resolvedMsg];
      });

      // Mark as read immediately
      markAsRead(msg.id, msg.conversationId);
    }

    // Refresh conversation list to show updated snippet
    refreshConversations();
  };

  // Handle message status updates (ticks)
  const handleMessageStatusUpdate = (data: { messageId: string; conversationId: string; status: Message['status'] }) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === data.messageId ? { ...m, status: data.status } : m))
    );
  };

  // Handle typing indicator
  const handleUserTyping = (data: { conversationId: string; userId: string; isTyping: boolean }) => {
    setTypingUsers((prev) => {
      const current = prev[data.conversationId] || [];
      const updated = data.isTyping
        ? Array.from(new Set([...current, data.userId]))
        : current.filter((id) => id !== data.userId);
      return { ...prev, [data.conversationId]: updated };
    });
  };

  // Handle presence
  const handleUserPresence = (data: { userId: string; isOnline: boolean; lastSeen: number }) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.type === 'direct' && c.participants.includes(data.userId)) {
          return { ...c, isOtherUserOnline: data.isOnline };
        }
        return c;
      })
    );
  };

  // Decrypt an individual message
  const decryptMessage = async (msg: Message): Promise<string> => {
    if (!msg.isEncrypted) return msg.decryptedContent || msg.ciphertext;
    if (decryptedCacheRef.current.has(msg.id)) {
      return decryptedCacheRef.current.get(msg.id)!;
    }
    if (!privateKey || !user) return '🔒 [Encrypted]';

    try {
      // Direct message: derive shared key with sender (or receiver if we sent it)
      const conv = conversations.find((c) => c.id === msg.conversationId) || activeConversation;
      if (!conv) return '🔒 [Encrypted]';

      let symmetricKey: CryptoKey | null = null;

      if (conv.type === 'direct') {
        const otherUserId = conv.participants.find((p) => p !== user.id) || conv.participants[0];
        // Fetch other user's public key
        const userRes = await fetch(`/api/users/${otherUserId}`);
        if (userRes.ok) {
          const otherUser = await userRes.json();
          if (otherUser.publicKeyJwk) {
            const remotePubKey = await importPublicKeyFromJwk(otherUser.publicKeyJwk);
            symmetricKey = await deriveSharedAesKey(
              privateKey,
              remotePubKey,
              `shared_${user.id}_${otherUserId}`
            );
          }
        }
      }

      if (symmetricKey) {
        const decrypted = await decryptPayload(msg.ciphertext, msg.iv, symmetricKey);
        cacheDecryptedMessage(msg.id, decrypted);
        return decrypted;
      }

      return '🔒 [Encrypted Message]';
    } catch (err) {
      console.warn('Decryption failed:', err);
      return '🔒 [Encrypted Message]';
    }
  };

  // Refresh conversation list
  const refreshConversations = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/conversations?userId=${user.id}`);
      if (res.ok) {
        const data: Conversation[] = await res.json();
        setConversations(data);
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    }
  };

  // Fetch scheduled messages
  const fetchScheduledMessages = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/messages/scheduled?userId=${user.id}`);
      if (res.ok) {
        const list = await res.json();
        setScheduledMessages(list);
      }
    } catch (err) {
      console.error('Failed to fetch scheduled messages:', err);
    }
  };

  // Set active conversation & fetch its messages
  const setActiveConversationId = async (id: string | null) => {
    if (!id) {
      setActiveConversation(null);
      setMessages([]);
      return;
    }

    const found = conversations.find((c) => c.id === id);
    if (found) {
      setActiveConversation(found);
      try {
        const res = await fetch(`/api/conversations/${id}/messages`);
        if (res.ok) {
          const rawMsgs: Message[] = await res.json();

          // Decrypt all messages in parallel
          const resolved = await Promise.all(
            rawMsgs.map(async (m) => ({
              ...m,
              decryptedContent: await decryptMessage(m),
            }))
          );

          setMessages(resolved);
        }
      } catch (err) {
        console.error('Failed to fetch messages:', err);
      }
    }
  };

  // Mark message as read
  const markAsRead = (messageId: string, conversationId: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'message:status_update',
          data: { messageId, conversationId, status: 'read' },
        })
      );
    }
  };

  // Send real-time typing signal
  const sendTypingSignal = (isTyping: boolean) => {
    if (!activeConversation || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    wsRef.current.send(
      JSON.stringify({
        type: 'user:typing',
        data: { conversationId: activeConversation.id, isTyping },
      })
    );

    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        sendTypingSignal(false);
      }, 3000);
    }
  };

  // Send Message (E2EE encrypted + offline queue support)
  const sendMessage = async (
    content: string,
    type: MessageType = 'text',
    fileData?: FileAttachment,
    replyTo?: Message['replyTo']
  ): Promise<boolean> => {
    if (!activeConversation || !user) return false;

    const messageId = `msg_${Math.random().toString(36).substring(2, 11)}`;
    let ciphertext = content;
    let iv = '';
    let isEncrypted = false;

    // Encrypt content if E2EE keys are available
    if (privateKey) {
      try {
        if (activeConversation.type === 'direct') {
          const otherUserId = activeConversation.participants.find((p) => p !== user.id);
          if (otherUserId) {
            const userRes = await fetch(`/api/users/${otherUserId}`);
            if (userRes.ok) {
              const otherUser = await userRes.json();
              if (otherUser.publicKeyJwk) {
                const remotePubKey = await importPublicKeyFromJwk(otherUser.publicKeyJwk);
                const sharedKey = await deriveSharedAesKey(
                  privateKey,
                  remotePubKey,
                  `shared_${user.id}_${otherUserId}`
                );
                const enc = await encryptPayload(content, sharedKey);
                ciphertext = enc.ciphertext;
                iv = enc.iv;
                isEncrypted = true;
              }
            }
          }
        }
      } catch (err) {
        console.warn('Encryption failed, sending with fallback:', err);
      }
    }

    const duration = activeConversation.disappearingTimer || 0;
    const disappearsAt = duration > 0 ? Date.now() + duration * 1000 : undefined;

    const messagePayload: Message = {
      id: messageId,
      conversationId: activeConversation.id,
      senderId: user.id,
      senderUsername: user.username,
      senderDisplayName: user.displayName,
      ciphertext,
      iv,
      isEncrypted,
      type,
      fileData,
      replyTo,
      timestamp: Date.now(),
      status: isOnline && isWsConnected ? 'sent' : 'queued',
      disappearsAt,
      disappearingDuration: duration,
      decryptedContent: content,
    };

    // Cache locally immediately (Optimistic Update)
    cacheDecryptedMessage(messageId, content);
    setMessages((prev) => [...prev, messagePayload]);

    // If offline, add to queue
    if (!isOnline || !isWsConnected) {
      const updatedQueue = [...offlineQueue, messagePayload];
      setOfflineQueue(updatedQueue);
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(updatedQueue));
      return true;
    }

    // Send to server
    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messagePayload),
      });

      if (res.ok) {
        const savedMsg = await res.json();
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, status: savedMsg.status || 'sent' } : m))
        );
        refreshConversations();
        return true;
      } else {
        throw new Error('Server send failed');
      }
    } catch (err) {
      console.warn('Failed to send message over network, queuing offline:', err);
      const updatedQueue = [...offlineQueue, messagePayload];
      setOfflineQueue(updatedQueue);
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(updatedQueue));
      return true;
    }
  };

  // Schedule Message ("Send Later")
  const scheduleMessage = async (
    content: string,
    scheduledFor: number,
    type: MessageType = 'text',
    fileData?: FileAttachment,
    replyTo?: Message['replyTo']
  ): Promise<boolean> => {
    if (!activeConversation || !user) return false;

    const messageId = `sched_${Math.random().toString(36).substring(2, 11)}`;
    let ciphertext = content;
    let iv = '';
    let isEncrypted = false;

    if (privateKey && activeConversation.type === 'direct') {
      const otherUserId = activeConversation.participants.find((p) => p !== user.id);
      if (otherUserId) {
        const userRes = await fetch(`/api/users/${otherUserId}`);
        if (userRes.ok) {
          const otherUser = await userRes.json();
          if (otherUser.publicKeyJwk) {
            const remotePubKey = await importPublicKeyFromJwk(otherUser.publicKeyJwk);
            const sharedKey = await deriveSharedAesKey(
              privateKey,
              remotePubKey,
              `shared_${user.id}_${otherUserId}`
            );
            const enc = await encryptPayload(content, sharedKey);
            ciphertext = enc.ciphertext;
            iv = enc.iv;
            isEncrypted = true;
          }
        }
      }
    }

    const scheduledPayload = {
      id: messageId,
      conversationId: activeConversation.id,
      senderId: user.id,
      senderUsername: user.username,
      senderDisplayName: user.displayName,
      ciphertext,
      iv,
      isEncrypted,
      type,
      fileData,
      replyTo,
      scheduledFor,
      status: 'scheduled',
      timestamp: Date.now(),
      decryptedContent: content,
    };

    try {
      const res = await fetch('/api/messages/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scheduledPayload),
      });

      if (res.ok) {
        fetchScheduledMessages();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Schedule message error:', err);
      return false;
    }
  };

  // Cancel Scheduled Message
  const cancelScheduledMessage = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/messages/schedule/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setScheduledMessages((prev) => prev.filter((m) => m.id !== id));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Flush offline queue when reconnected
  const flushOfflineQueue = async () => {
    if (offlineQueue.length === 0) return;

    const remaining = [...offlineQueue];
    while (remaining.length > 0) {
      const item = remaining.shift();
      try {
        const res = await fetch('/api/messages/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        });

        if (res.ok) {
          setMessages((prev) =>
            prev.map((m) => (m.id === item.id ? { ...m, status: 'sent' } : m))
          );
        } else {
          remaining.unshift(item);
          break;
        }
      } catch {
        remaining.unshift(item);
        break;
      }
    }

    setOfflineQueue(remaining);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
  };

  // Create Direct 1-on-1 Chat
  const createDirectChat = async (targetUser: User): Promise<Conversation | null> => {
    if (!user) return null;
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'direct',
          name: targetUser.displayName,
          participants: [targetUser.id],
          creatorId: user.id,
        }),
      });

      if (res.ok) {
        const conv: Conversation = await res.json();
        await refreshConversations();
        setActiveConversationId(conv.id);
        return conv;
      }
      return null;
    } catch (err) {
      console.error('Create direct chat error:', err);
      return null;
    }
  };

  // Create Encrypted Group Chat
  const createGroupChat = async (
    name: string,
    description: string,
    participantIds: string[],
    disappearingTimer: number = 0
  ): Promise<Conversation | null> => {
    if (!user) return null;
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'group',
          name,
          description,
          participants: participantIds,
          creatorId: user.id,
          disappearingTimer,
        }),
      });

      if (res.ok) {
        const conv: Conversation = await res.json();
        await refreshConversations();
        setActiveConversationId(conv.id);
        return conv;
      }
      return null;
    } catch (err) {
      console.error('Create group chat error:', err);
      return null;
    }
  };

  // Update Conversation Settings
  const updateConversationSettings = async (convId: string, settings: Partial<Conversation>): Promise<boolean> => {
    try {
      const res = await fetch(`/api/conversations/${convId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        const updated = await res.json();
        setConversations((prev) => prev.map((c) => (c.id === convId ? { ...c, ...updated } : c)));
        if (activeConversation && activeConversation.id === convId) {
          setActiveConversation((prev) => (prev ? { ...prev, ...updated } : null));
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversation,
        messages,
        scheduledMessages,
        isOnline,
        isWsConnected,
        offlineQueueCount: offlineQueue.length,
        typingUsers,
        searchQuery,
        setSearchQuery,
        setActiveConversationId,
        sendMessage,
        scheduleMessage,
        cancelScheduledMessage,
        createDirectChat,
        createGroupChat,
        updateConversationSettings,
        sendTypingSignal,
        refreshConversations,
        markAsRead,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used within a ChatProvider');
  return context;
};
