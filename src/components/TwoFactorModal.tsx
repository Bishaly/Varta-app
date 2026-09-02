import React, { useState, useEffect } from 'react';
import { ShieldCheck, X, Copy, Check, QrCode, Key, AlertTriangle, Download, Lock } from 'lucide-react';
import { generateTotpSetup, verifyTotpToken, TotpSetupResult } from '../utils/totp';
import { User } from '../types';

interface TwoFactorModalProps {
  user: User;
  onClose: () => void;
  onUpdateUser: (updatedFields: Partial<User>) => void;
}

export const TwoFactorModal: React.FC<TwoFactorModalProps> = ({ user, onClose, onUpdateUser }) => {
  const [step, setStep] = useState<'status' | 'setup' | 'backup'>(user.twoFactorEnabled ? 'status' : 'setup');
  const [setupData, setSetupData] = useState<TotpSetupResult | null>(null);
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isCopiedSecret, setIsCopiedSecret] = useState<boolean>(false);
  const [isCopiedBackup, setIsCopiedBackup] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!user.twoFactorEnabled) {
      initSetup();
    }
  }, [user]);

  const initSetup = async () => {
    try {
      setLoading(true);
      const data = await generateTotpSetup(user.username, 'CipherGram');
      setSetupData(data);
      setStep('setup');
    } catch (err) {
      console.error('2FA setup init error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndEnable = async () => {
    if (!setupData) return;
    setErrorMsg('');

    const isValid = verifyTotpToken(verificationCode, setupData.secret);
    if (!isValid) {
      setErrorMsg('Invalid 6-digit verification code. Please check your authenticator app.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/auth/2fa/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          enabled: true,
          secret: setupData.secret,
          backupCodes: setupData.backupCodes,
        }),
      });

      if (res.ok) {
        onUpdateUser({
          twoFactorEnabled: true,
          twoFactorSecret: setupData.secret,
          backupCodes: setupData.backupCodes,
        });
        setStep('backup');
      } else {
        setErrorMsg('Failed to update 2FA on server.');
      }
    } catch (err) {
      setErrorMsg('Network error updating 2FA.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/2fa/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          enabled: false,
        }),
      });

      if (res.ok) {
        onUpdateUser({
          twoFactorEnabled: false,
          twoFactorSecret: undefined,
          backupCodes: [],
        });
        onClose();
      }
    } catch (err) {
      console.error('Failed to disable 2FA:', err);
    } finally {
      setLoading(false);
    }
  };

  const copySecret = () => {
    if (!setupData) return;
    navigator.clipboard.writeText(setupData.secret);
    setIsCopiedSecret(true);
    setTimeout(() => setIsCopiedSecret(false), 2000);
  };

  const copyBackupCodes = () => {
    const codes = (setupData?.backupCodes || user.backupCodes || []).join('\n');
    navigator.clipboard.writeText(codes);
    setIsCopiedBackup(true);
    setTimeout(() => setIsCopiedBackup(false), 2000);
  };

  const downloadBackupCodes = () => {
    const codes = setupData?.backupCodes || user.backupCodes || [];
    const content = `CIPHERGRAM 2FA EMERGENCY BACKUP CODES\nUser ID: ${user.username} (${user.id})\nDate: ${new Date().toISOString()}\n\nEach code can be used once for emergency login if you lose access to your authenticator app:\n\n${codes.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n\nKeep this file in a secure location.`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ciphergram_backup_codes_${user.username}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          id="btn-close-2fa-modal"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 2FA Status View if already enabled */}
        {step === 'status' && (
          <div>
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-100">Two-Factor Authentication</h2>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-semibold mt-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                2FA Active & Enforced
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl">
                <h3 className="text-sm font-semibold text-slate-200 mb-1 flex items-center gap-2">
                  <Key className="w-4 h-4 text-emerald-400" />
                  TOTP Authenticator Protection
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Your CipherGram account is guarded with standard Time-based One-Time Passwords (TOTP).
                  Every login requires a 6-digit code from Google Authenticator, Bitwarden, or Aegis.
                </p>
              </div>

              {user.backupCodes && user.backupCodes.length > 0 && (
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                      <Lock className="w-4 h-4 text-amber-400" />
                      Emergency Backup Codes ({user.backupCodes.length} remaining)
                    </h3>
                    <button
                      id="btn-download-backup-codes"
                      onClick={downloadBackupCodes}
                      className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {user.backupCodes.map((code, idx) => (
                      <div
                        key={idx}
                        className="font-mono text-xs text-slate-300 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800 text-center"
                      >
                        {code}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                id="btn-reconfigure-2fa"
                onClick={initSetup}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-medium transition-colors"
              >
                Re-configure Authenticator
              </button>
              <button
                id="btn-disable-2fa"
                onClick={handleDisable2FA}
                disabled={loading}
                className="py-2.5 px-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-sm font-medium transition-colors"
              >
                Disable 2FA
              </button>
            </div>
          </div>
        )}

        {/* 2FA Setup Step */}
        {step === 'setup' && (
          <div>
            <div className="text-center mb-5">
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-100">Setup Two-Factor Verification</h2>
              <p className="text-xs text-slate-400 mt-1">
                Scan this QR code with Google Authenticator, Aegis, Bitwarden, or 1Password.
              </p>
            </div>

            {setupData && (
              <div className="space-y-4">
                {/* QR Code */}
                <div className="bg-white p-3 rounded-2xl w-fit mx-auto shadow-md border border-slate-700 flex flex-col items-center">
                  <img src={setupData.qrCodeUrl} alt="2FA QR Code" className="w-44 h-44 rounded-xl" />
                </div>

                {/* Secret Key manual entry */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase">
                      Manual Secret Key (Base32)
                    </span>
                    <button
                      id="btn-copy-totp-secret"
                      onClick={copySecret}
                      className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                    >
                      {isCopiedSecret ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {isCopiedSecret ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <div className="font-mono text-xs text-emerald-400 font-semibold tracking-wider break-all bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                    {setupData.secret}
                  </div>
                </div>

                {/* Verification Code Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Enter 6-Digit Code from Authenticator App:
                  </label>
                  <input
                    id="input-2fa-verify-code"
                    type="text"
                    maxLength={6}
                    placeholder="000000"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full bg-slate-950 border border-slate-700 text-center font-mono text-2xl tracking-[0.5em] text-slate-100 rounded-xl py-3 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                {errorMsg && (
                  <div className="text-xs text-rose-400 flex items-center gap-1.5 bg-rose-950/30 border border-rose-800/40 p-2.5 rounded-xl">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    {errorMsg}
                  </div>
                )}

                <button
                  id="btn-verify-enable-2fa"
                  onClick={handleVerifyAndEnable}
                  disabled={verificationCode.length !== 6 || loading}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-emerald-900/30"
                >
                  {loading ? 'Verifying...' : 'Verify & Enable 2FA'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step: Backup Codes Confirmation */}
        {step === 'backup' && setupData && (
          <div>
            <div className="text-center mb-5">
              <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Check className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-100">2FA Successfully Enabled!</h2>
              <p className="text-xs text-slate-400 mt-1">
                Save your emergency backup recovery codes in case you lose your device.
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 mb-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  One-Time Backup Codes
                </span>
                <button
                  id="btn-copy-backup-codes"
                  onClick={copyBackupCodes}
                  className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                >
                  {isCopiedBackup ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {isCopiedBackup ? 'Copied' : 'Copy All'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5 mb-3">
                {setupData.backupCodes.map((code, idx) => (
                  <div
                    key={idx}
                    className="font-mono text-xs text-slate-200 bg-slate-900 p-2 rounded-lg border border-slate-800 text-center font-bold tracking-wider"
                  >
                    {code}
                  </div>
                ))}
              </div>

              <button
                id="btn-download-backup-codes-file"
                onClick={downloadBackupCodes}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Download Backup Codes File (.txt)
              </button>
            </div>

            <button
              id="btn-done-2fa"
              onClick={onClose}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-sm transition-all"
            >
              I Have Saved My Backup Codes
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
