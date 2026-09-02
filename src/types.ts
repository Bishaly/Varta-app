export type MessageType = 'text' | 'image' | 'file' | 'audio' | 'system';
export type MessageStatus = 'queued' | 'sending' | 'sent' | 'delivered' | 'read' | 'scheduled';

export interface FileAttachment {
  name: string;
  size: number;
  mimeType: string;
  dataUrl?: string; // Encrypted base64 or object URL
  duration?: number; // for audio
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderUsername: string;
  senderDisplayName: string;
  ciphertext: string; // Base64 encrypted payload (AES-256-GCM)
  iv: string; // Base64 IV (12 bytes)
  salt?: string;
  isEncrypted: boolean;
  type: MessageType;
  fileData?: FileAttachment;
  decryptedContent?: string; // In-memory decrypted text / JSON
  timestamp: number;
  status: MessageStatus;
  scheduledFor?: number; // Timestamp if scheduled
  disappearsAt?: number; // Timestamp when message expires
  disappearingDuration?: number; // Duration in seconds (e.g., 30, 300, 3600, 86400)
  replyTo?: {
    id: string;
    senderDisplayName: string;
    textPreview: string;
  };
}

export interface User {
  id: string; // e.g., 'usr_78ab42'
  username: string; // e.g., 'vishal_dev' (unique handle, no phone number)
  displayName: string;
  avatarColor: string;
  avatarUrl?: string;
  bio?: string;
  publicKeyJwk?: string; // Exported JWK string for ECDH/RSA
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  backupCodes?: string[];
  createdAt: number;
  lastSeen: number;
  isOnline?: boolean;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  name: string;
  description?: string;
  avatarColor?: string;
  avatarUrl?: string;
  participants: string[]; // User IDs
  adminIds: string[]; // User IDs for groups
  createdAt: number;
  updatedAt: number;
  disappearingTimer: number; // 0 = off, 30, 300, 3600, 86400, 604800 (seconds)
  groupKeyMap?: Record<string, string>; // Encrypted group master key per user ID
  lastMessage?: {
    text: string;
    senderId: string;
    senderDisplayName: string;
    timestamp: number;
    status?: MessageStatus;
  };
  unreadCount?: number;
  isPinned?: boolean;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  privateKey: CryptoKey | null;
  publicKey: CryptoKey | null;
  publicKeyJwk: string | null;
  isAuthenticated: boolean;
  needsTwoFactor: boolean;
  tempUserId?: string;
}

export interface SafetyNumberData {
  userId1: string;
  userId2: string;
  name1: string;
  name2: string;
  safetyNumber: string; // 60-digit Signal-style verification number
  qrPayload: string;
  verified: boolean;
}
