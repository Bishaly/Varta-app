import React, { useState } from 'react';
import {
  Settings,
  X,
  User,
  Shield,
  Key,
  Download,
  Upload,
  Lock,
  Trash2,
  Check,
  AlertCircle,
  Copy,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { exportEncryptedKeyBackup, importEncryptedKeyBackup } from '../utils/crypto';

interface SettingsModalProps {
  onClose: () => void;
  onOpen2FA: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, onOpen2FA }) => {
  const { user, updateUser, logout, quickSwitchUser, privateKey, publicKeyJwk } = useAuth();

  const [displayName, setDisplayName] = useState<string>(user?.displayName || '');
  const [bio, setBio] = useState<string>(user?.bio || '');
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'backup' | 'switch'>('profile');

  // Key Backup Passphrase
  const [backupPassphrase, setBackupPassphrase] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [importJson, setImportJson] = useState<string>('');
  const [importPassphrase, setImportPassphrase] = useState<string>('');
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [copiedId, setCopiedId] = useState<boolean>(false);

  if (!user) return null;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser({ displayName: displayName.trim(), bio: bio.trim() });
    setStatusMsg({ text: 'Profile updated successfully!', type: 'success' });
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const handleExportBackup = async () => {
    if (!backupPassphrase || backupPassphrase.length < 6) {
      setStatusMsg({ text: 'Passphrase must be at least 6 characters.', type: 'error' });
      return;
    }

    try {
      setIsExporting(true);
      const privKeyJwk = localStorage.getItem('ciphergram_priv_key_jwk') || '';
      const backupContent = await exportEncryptedKeyBackup(
        privKeyJwk,
        user.publicKeyJwk || '',
        user.username,
        backupPassphrase
      );

      const blob = new Blob([backupContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ciphergram_keys_${user.username}.cipherkey`;
      a.click();
      URL.revokeObjectURL(url);

      setStatusMsg({ text: 'Encrypted key backup downloaded securely!', type: 'success' });
      setBackupPassphrase('');
    } catch (err) {
      setStatusMsg({ text: 'Failed to export backup.', type: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportBackup = async () => {
    if (!importJson || !importPassphrase) {
      setStatusMsg({ text: 'Please provide backup JSON and passphrase.', type: 'error' });
      return;
    }

    try {
      const decrypted = await importEncryptedKeyBackup(importJson, importPassphrase);
      localStorage.setItem('ciphergram_priv_key_jwk', decrypted.privateKeyJwk);
      updateUser({ publicKeyJwk: decrypted.publicKeyJwk });
      setStatusMsg({ text: 'Keys imported successfully! Refreshing session...', type: 'success' });
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setStatusMsg({ text: 'Decryption failed. Invalid passphrase or corrupted backup.', type: 'error' });
    }
  };

  const clearLocalDecryptedCache = () => {
    localStorage.removeItem('ciphergram_decrypted_cache');
    setStatusMsg({ text: 'Local decrypted message cache cleared.', type: 'success' });
    setTimeout(() => setStatusMsg(null), 2500);
  };

  const copyUserId = () => {
    navigator.clipboard.writeText(`@${user.username}`);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-xl h-[85vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Settings & Security</h2>
              <p className="text-xs text-slate-400">Manage identity, E2EE keys, and privacy controls</p>
            </div>
          </div>
          <button
            id="btn-close-settings-modal"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 pb-2 border-b border-slate-800 bg-slate-950/30">
          {[
            { id: 'profile', label: 'My Identity', icon: User },
            { id: 'security', label: '2FA & Privacy', icon: Shield },
            { id: 'backup', label: 'Key Backup', icon: Key },
            { id: 'switch', label: 'Demo Switch', icon: Users },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-settings-${tab.id}`}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Status Toast */}
        {statusMsg && (
          <div
            className={`mx-6 mt-3 p-2.5 rounded-xl text-xs flex items-center gap-2 ${
              statusMsg.type === 'success'
                ? 'bg-emerald-950/60 border border-emerald-800/60 text-emerald-300'
                : 'bg-rose-950/60 border border-rose-800/60 text-rose-300'
            }`}
          >
            {statusMsg.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {statusMsg.text}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-300">
          {/* TAB 1: PROFILE */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-slate-950/70 border border-slate-800 rounded-2xl">
                <div
                  className={`w-14 h-14 rounded-full bg-gradient-to-tr ${user.avatarColor} flex items-center justify-center text-xl font-bold text-white shadow-md`}
                >
                  {user.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-slate-100 truncate">{user.displayName}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-xs text-emerald-400 font-semibold">@{user.username}</span>
                    <button
                      type="button"
                      id="btn-copy-settings-username"
                      onClick={copyUserId}
                      className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
                    >
                      {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">UID: {user.id}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Display Name</label>
                <input
                  id="input-settings-display-name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Status Bio</label>
                <input
                  id="input-settings-bio"
                  type="text"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  id="btn-save-profile"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md transition-all"
                >
                  Save Profile Changes
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: SECURITY */}
          {activeTab === 'security' && (
            <div className="space-y-4">
              {/* 2FA Status Card */}
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-100">Two-Factor Authentication (2FA)</h4>
                    <p className="text-[11px] text-slate-400">
                      {user.twoFactorEnabled
                        ? 'Enforced with TOTP Authenticator App'
                        : 'Disabled - Protect your account with 2FA'}
                    </p>
                  </div>
                </div>
                <button
                  id="btn-open-2fa-from-settings"
                  onClick={onOpen2FA}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    user.twoFactorEnabled
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                  }`}
                >
                  {user.twoFactorEnabled ? 'Manage 2FA' : 'Enable 2FA'}
                </button>
              </div>

              {/* Privacy Shield Info */}
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-2">
                <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  Zero Phone Number Privacy Shield
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Your phone number is never collected or broadcasted. Other users can only discover and communicate with you through your unique ID handle: <strong className="text-slate-200">@{user.username}</strong>.
                </p>
              </div>

              {/* Clear Decrypted Cache */}
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-100">Clear Local Decrypted Cache</h4>
                  <p className="text-[11px] text-slate-400">
                    Purge in-memory and local unencrypted cache from this browser session.
                  </p>
                </div>
                <button
                  id="btn-clear-local-cache"
                  onClick={clearLocalDecryptedCache}
                  className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-medium transition-colors"
                >
                  Clear Cache
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: KEY BACKUP */}
          {activeTab === 'backup' && (
            <div className="space-y-5">
              {/* Export Backup */}
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-100">
                  <Download className="w-4 h-4 text-emerald-400" />
                  Export Encrypted Key Backup (.cipherkey)
                </div>
                <p className="text-xs text-slate-400">
                  Save your private ECDH key encrypted with a master passphrase to transfer your identity across devices.
                </p>
                <div className="space-y-2">
                  <input
                    id="input-backup-passphrase"
                    type="password"
                    placeholder="Enter strong backup passphrase (min 6 chars)..."
                    value={backupPassphrase}
                    onChange={(e) => setBackupPassphrase(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    id="btn-export-key-backup"
                    onClick={handleExportBackup}
                    disabled={isExporting}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md transition-all flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {isExporting ? 'Encrypting & Exporting...' : 'Export Key Backup File'}
                  </button>
                </div>
              </div>

              {/* Import Backup */}
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-100">
                  <Upload className="w-4 h-4 text-indigo-400" />
                  Import Key Backup File
                </div>
                <textarea
                  id="textarea-import-key-backup"
                  placeholder="Paste your .cipherkey backup JSON content here..."
                  value={importJson}
                  onChange={(e) => setImportJson(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                />
                <input
                  id="input-import-backup-passphrase"
                  type="password"
                  placeholder="Enter backup passphrase to decrypt..."
                  value={importPassphrase}
                  onChange={(e) => setImportPassphrase(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
                <button
                  id="btn-import-key-backup"
                  onClick={handleImportBackup}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Restore Cryptographic Keys
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: SWITCH ACCOUNTS (FOR QUICK LOCAL DEMO) */}
          {activeTab === 'switch' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-2">
                <h4 className="text-xs font-bold text-slate-100">Test Multi-User E2EE on One Device</h4>
                <p className="text-xs text-slate-400">
                  Quickly switch between pre-seeded personas to test live E2EE chat, group messaging, and real-time typing across two separate user sessions.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  id="btn-quick-switch-alice"
                  onClick={async () => {
                    await quickSwitchUser('usr_cipher_alice');
                    onClose();
                  }}
                  className="p-3 bg-slate-950 border border-emerald-800/40 hover:border-emerald-500 rounded-2xl text-left transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                      A
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-200 group-hover:text-emerald-400 transition-colors">
                        Alice (Security)
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono">@alice_sec</p>
                    </div>
                  </div>
                </button>

                <button
                  id="btn-quick-switch-bob"
                  onClick={async () => {
                    await quickSwitchUser('usr_cipher_bob');
                    onClose();
                  }}
                  className="p-3 bg-slate-950 border border-indigo-800/40 hover:border-indigo-500 rounded-2xl text-left transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-600 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                      B
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-200 group-hover:text-indigo-400 transition-colors">
                        Bob (OpenSource)
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono">@bob_dev</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <button
            id="btn-logout"
            onClick={() => {
              logout();
              onClose();
            }}
            className="text-xs text-rose-400 hover:text-rose-300 font-medium"
          >
            Log Out of CipherGram
          </button>
          <button
            id="btn-done-settings"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
