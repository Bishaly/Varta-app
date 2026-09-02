import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthState } from '../types';
import {
  generateUserKeyPair,
  exportKeyToJwk,
  importPublicKeyFromJwk,
  importPrivateKeyFromJwk,
} from '../utils/crypto';

interface AuthContextType {
  user: User | null;
  token: string | null;
  privateKey: CryptoKey | null;
  publicKey: CryptoKey | null;
  publicKeyJwk: string | null;
  isAuthenticated: boolean;
  needsTwoFactor: boolean;
  tempUserId: string | null;
  login: (username: string, password: string, totpToken?: string) => Promise<{ success: boolean; error?: string; needsTwoFactor?: boolean }>;
  register: (username: string, displayName: string, password: string, bio?: string) => Promise<{ success: boolean; error?: string }>;
  verifyTwoFactorLogin: (totpToken: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateUser: (updatedFields: Partial<User>) => void;
  quickSwitchUser: (userId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_USER_KEY = 'ciphergram_user_session';
const LOCAL_STORAGE_PRIV_KEY = 'ciphergram_priv_key_jwk';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [privateKey, setPrivateKey] = useState<CryptoKey | null>(null);
  const [publicKey, setPublicKey] = useState<CryptoKey | null>(null);
  const [publicKeyJwk, setPublicKeyJwk] = useState<string | null>(null);
  const [needsTwoFactor, setNeedsTwoFactor] = useState<boolean>(false);
  const [tempUserId, setTempUserId] = useState<string | null>(null);
  const [pendingCredentials, setPendingCredentials] = useState<{ username: string; password: string } | null>(null);

  // Load session on startup
  useEffect(() => {
    async function loadSavedSession() {
      try {
        const savedUserStr = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
        const savedPrivJwk = localStorage.getItem(LOCAL_STORAGE_PRIV_KEY);

        if (savedUserStr) {
          const savedUser: User = JSON.parse(savedUserStr);
          setUser(savedUser);
          setToken(`token_${savedUser.id}_session`);

          if (savedPrivJwk && savedUser.publicKeyJwk) {
            const privKey = await importPrivateKeyFromJwk(savedPrivJwk);
            const pubKey = await importPublicKeyFromJwk(savedUser.publicKeyJwk);
            setPrivateKey(privKey);
            setPublicKey(pubKey);
            setPublicKeyJwk(savedUser.publicKeyJwk);
          } else {
            // Generate keys if missing
            await initializeCryptoKeys(savedUser);
          }
        }
      } catch (err) {
        console.error('Failed to load session:', err);
      }
    }
    loadSavedSession();
  }, []);

  // Helper to initialize or re-generate cryptographic keypair
  async function initializeCryptoKeys(targetUser: User): Promise<{ privKey: CryptoKey; pubKey: CryptoKey; pubKeyJwk: string }> {
    const keyPair = await generateUserKeyPair();
    const pubJwk = await exportKeyToJwk(keyPair.publicKey);
    const privJwk = await exportKeyToJwk(keyPair.privateKey);

    setPrivateKey(keyPair.privateKey);
    setPublicKey(keyPair.publicKey);
    setPublicKeyJwk(pubJwk);

    localStorage.setItem(LOCAL_STORAGE_PRIV_KEY, privJwk);

    // Save public key on server
    try {
      await fetch('/api/users/public-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: targetUser.id, publicKeyJwk: pubJwk }),
      });
      targetUser.publicKeyJwk = pubJwk;
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(targetUser));
    } catch (err) {
      console.error('Failed to sync public key:', err);
    }

    return { privKey: keyPair.privateKey, pubKey: keyPair.publicKey, pubKeyJwk: pubJwk };
  }

  // Register
  const register = async (username: string, displayName: string, password: string, bio?: string) => {
    try {
      const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, '');
      if (cleanUsername.length < 3) {
        return { success: false, error: 'User ID must be at least 3 characters (letters, numbers, underscore).' };
      }

      // 1. Generate E2EE KeyPair
      const keyPair = await generateUserKeyPair();
      const pubJwk = await exportKeyToJwk(keyPair.publicKey);
      const privJwk = await exportKeyToJwk(keyPair.privateKey);

      // 2. Try registering with server API
      let serverUser: User | null = null;
      let serverToken: string | null = null;

      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: cleanUsername,
            displayName,
            password,
            publicKeyJwk: pubJwk,
            bio,
          }),
        });

        const text = await res.text();
        let data: any = null;
        try {
          data = JSON.parse(text);
        } catch {
          data = null;
        }

        if (res.ok && data?.user) {
          serverUser = data.user;
          serverToken = data.token;
        } else if (data && data.error) {
          return { success: false, error: data.error };
        }
      } catch (networkErr) {
        console.warn('Backend server unreachable, falling back to local storage:', networkErr);
      }

      // 3. Fallback to local storage (for Android APK / Offline / Standalone mode)
      const localUsersRaw = localStorage.getItem('varta_local_users_db');
      const localUsers: Record<string, any> = localUsersRaw ? JSON.parse(localUsersRaw) : {};

      if (!serverUser) {
        const existing = Object.values(localUsers).find((u: any) => u.username === cleanUsername);
        if (existing) {
          return { success: false, error: 'User ID is already taken. Please choose another ID.' };
        }

        const userId = `usr_${Math.random().toString(36).substring(2, 10)}`;
        const avatarColors = [
          'from-emerald-500 to-teal-600',
          'from-indigo-500 to-cyan-600',
          'from-rose-500 to-pink-600',
          'from-amber-500 to-orange-600',
          'from-violet-500 to-purple-600',
          'from-blue-500 to-sky-600',
        ];
        const avatarColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];

        serverUser = {
          id: userId,
          username: cleanUsername,
          displayName,
          avatarColor,
          bio: bio || 'Varta private encrypted user',
          publicKeyJwk: pubJwk,
          twoFactorEnabled: false,
          createdAt: Date.now(),
          lastSeen: Date.now(),
        };
        serverToken = `token_${userId}_local_${Date.now()}`;
      }

      // Save locally
      localUsers[serverUser.id] = {
        ...serverUser,
        passwordHash: password,
      };
      localStorage.setItem('varta_local_users_db', JSON.stringify(localUsers));

      setUser(serverUser);
      setToken(serverToken);
      setPrivateKey(keyPair.privateKey);
      setPublicKey(keyPair.publicKey);
      setPublicKeyJwk(pubJwk);

      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(serverUser));
      localStorage.setItem(LOCAL_STORAGE_PRIV_KEY, privJwk);

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error during identity creation' };
    }
  };

  // Login
  const login = async (username: string, password: string, totpToken?: string) => {
    try {
      const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, '');

      // 1. Try server login
      let loggedInUser: User | null = null;
      let sessionToken: string | null = null;

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: cleanUsername, password, totpToken }),
        });

        const text = await res.text();
        let data: any = null;
        try {
          data = JSON.parse(text);
        } catch {
          data = null;
        }

        if (res.ok && data?.user) {
          loggedInUser = data.user;
          sessionToken = data.token;
        } else if (data?.needsTwoFactor) {
          setNeedsTwoFactor(true);
          setTempUserId(data.tempUserId);
          setPendingCredentials({ username: cleanUsername, password });
          return { success: false, needsTwoFactor: true };
        } else if (data && data.error && res.status === 401) {
          return { success: false, error: data.error };
        }
      } catch (netErr) {
        console.warn('Server offline/unreachable, checking local storage:', netErr);
      }

      // 2. Fallback to local users storage
      if (!loggedInUser) {
        const localUsersRaw = localStorage.getItem('varta_local_users_db');
        const localUsers: Record<string, any> = localUsersRaw ? JSON.parse(localUsersRaw) : {};
        const matched = Object.values(localUsers).find(
          (u: any) => u.username === cleanUsername || u.id === username
        );

        if (matched) {
          if (matched.passwordHash === password) {
            loggedInUser = {
              id: matched.id,
              username: matched.username,
              displayName: matched.displayName,
              avatarColor: matched.avatarColor,
              bio: matched.bio,
              publicKeyJwk: matched.publicKeyJwk,
              twoFactorEnabled: matched.twoFactorEnabled || false,
              createdAt: matched.createdAt,
              lastSeen: Date.now(),
            };
            sessionToken = `token_${matched.id}_local`;
          } else {
            return { success: false, error: 'Incorrect password.' };
          }
        } else {
          return { success: false, error: 'User ID not found. Please create an account.' };
        }
      }

      setUser(loggedInUser);
      setToken(sessionToken);
      setNeedsTwoFactor(false);
      setTempUserId(null);
      setPendingCredentials(null);

      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(loggedInUser));

      // Check/Restore crypto keys
      const savedPrivJwk = localStorage.getItem(LOCAL_STORAGE_PRIV_KEY);
      if (savedPrivJwk && loggedInUser.publicKeyJwk) {
        try {
          const privKey = await importPrivateKeyFromJwk(savedPrivJwk);
          const pubKey = await importPublicKeyFromJwk(loggedInUser.publicKeyJwk);
          setPrivateKey(privKey);
          setPublicKey(pubKey);
          setPublicKeyJwk(loggedInUser.publicKeyJwk);
        } catch {
          await initializeCryptoKeys(loggedInUser);
        }
      } else {
        await initializeCryptoKeys(loggedInUser);
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Login error' };
    }
  };

  // Verify 2FA during login
  const verifyTwoFactorLogin = async (totpToken: string) => {
    if (!pendingCredentials) {
      return { success: false, error: 'Session expired. Please log in again.' };
    }
    return await login(pendingCredentials.username, pendingCredentials.password, totpToken);
  };

  // Logout
  const logout = () => {
    setUser(null);
    setToken(null);
    setPrivateKey(null);
    setPublicKey(null);
    setPublicKeyJwk(null);
    setNeedsTwoFactor(false);
    setTempUserId(null);
    setPendingCredentials(null);
    localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
  };

  // Update User state
  const updateUser = (updatedFields: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...updatedFields };
    setUser(updated);
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(updated));
  };

  // Quick switch for demo testing
  const quickSwitchUser = async (targetUserId: string) => {
    try {
      const res = await fetch(`/api/users/${targetUserId}`);
      if (res.ok) {
        const u = await res.json();
        setUser(u);
        setToken(`token_${u.id}_quick`);
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(u));
        await initializeCryptoKeys(u);
      }
    } catch (err) {
      console.error('Quick switch error:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        privateKey,
        publicKey,
        publicKeyJwk,
        isAuthenticated: !!user,
        needsTwoFactor,
        tempUserId,
        login,
        register,
        verifyTwoFactorLogin,
        logout,
        updateUser,
        quickSwitchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
