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
      // 1. Generate E2EE KeyPair
      const keyPair = await generateUserKeyPair();
      const pubJwk = await exportKeyToJwk(keyPair.publicKey);
      const privJwk = await exportKeyToJwk(keyPair.privateKey);

      // 2. Register with server
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          displayName,
          password,
          publicKeyJwk: pubJwk,
          bio,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Registration failed' };
      }

      setUser(data.user);
      setToken(data.token);
      setPrivateKey(keyPair.privateKey);
      setPublicKey(keyPair.publicKey);
      setPublicKeyJwk(pubJwk);

      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(data.user));
      localStorage.setItem(LOCAL_STORAGE_PRIV_KEY, privJwk);

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during registration' };
    }
  };

  // Login
  const login = async (username: string, password: string, totpToken?: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, totpToken }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Login failed' };
      }

      if (data.needsTwoFactor) {
        setNeedsTwoFactor(true);
        setTempUserId(data.tempUserId);
        setPendingCredentials({ username, password });
        return { success: false, needsTwoFactor: true };
      }

      setUser(data.user);
      setToken(data.token);
      setNeedsTwoFactor(false);
      setTempUserId(null);
      setPendingCredentials(null);

      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(data.user));

      // Check/Restore crypto keys
      const savedPrivJwk = localStorage.getItem(LOCAL_STORAGE_PRIV_KEY);
      if (savedPrivJwk && data.user.publicKeyJwk) {
        try {
          const privKey = await importPrivateKeyFromJwk(savedPrivJwk);
          const pubKey = await importPublicKeyFromJwk(data.user.publicKeyJwk);
          setPrivateKey(privKey);
          setPublicKey(pubKey);
          setPublicKeyJwk(data.user.publicKeyJwk);
        } catch {
          await initializeCryptoKeys(data.user);
        }
      } else {
        await initializeCryptoKeys(data.user);
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
