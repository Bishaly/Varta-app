import React, { useState } from 'react';
import { ShieldCheck, Lock, User, Key, AlertCircle, ArrowRight, Check, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AuthModal: React.FC = () => {
  const { login, register, verifyTwoFactorLogin, needsTwoFactor, quickSwitchUser } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const [totpCode, setTotpCode] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (needsTwoFactor) {
        const res = await verifyTwoFactorLogin(totpCode.trim());
        if (!res.success) {
          setErrorMsg(res.error || 'Invalid 2FA verification code.');
        }
      } else if (mode === 'register') {
        if (!username.trim() || !displayName.trim() || !password) {
          setErrorMsg('Please complete all required fields.');
          setLoading(false);
          return;
        }
        const res = await register(username.trim(), displayName.trim(), password, bio.trim());
        if (!res.success) {
          setErrorMsg(res.error || 'Registration failed.');
        }
      } else {
        if (!username.trim() || !password) {
          setErrorMsg('Please enter your User ID and password.');
          setLoading(false);
          return;
        }
        const res = await login(username.trim(), password);
        if (!res.success && !res.needsTwoFactor) {
          setErrorMsg(res.error || 'Login failed.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Glow orb */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-gradient-to-tr from-emerald-600 to-teal-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-950/50">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Varta</h1>
          <p className="text-xs text-slate-400 mt-1">
            Privacy-First E2EE Messenger • Zero Phone Numbers • 0 Kharcha
          </p>
        </div>

        {/* Tab switch if not in 2FA mode */}
        {!needsTwoFactor && (
          <div className="flex bg-slate-950 p-1 rounded-2xl mb-5 border border-slate-800">
            <button
              id="tab-auth-login"
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg('');
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                mode === 'login'
                  ? 'bg-slate-800 text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              id="tab-auth-register"
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMsg('');
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                mode === 'register'
                  ? 'bg-slate-800 text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Error notice */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-950/50 border border-rose-800/50 rounded-xl text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {needsTwoFactor ? (
            /* 2FA TOTP STEP */
            <div className="space-y-4 animate-in fade-in">
              <div className="text-center">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full text-xs font-semibold">
                  <Lock className="w-3.5 h-3.5" />
                  Two-Factor Verification Required
                </span>
                <p className="text-xs text-slate-400 mt-2">
                  Enter the 6-digit TOTP code from your authenticator app (or one-time backup code).
                </p>
              </div>

              <div>
                <input
                  id="input-auth-2fa-totp"
                  type="text"
                  placeholder="000000 / BACKUP-CODE"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  autoFocus
                  required
                  className="w-full bg-slate-950 border border-slate-700 text-center font-mono text-xl tracking-wider text-slate-100 rounded-xl py-3 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <button
                id="btn-auth-verify-2fa"
                type="submit"
                disabled={loading || !totpCode.trim()}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl font-semibold text-xs transition-all shadow-lg shadow-emerald-950"
              >
                {loading ? 'Verifying 2FA...' : 'Authenticate & Unlock Keys'}
              </button>
            </div>
          ) : (
            /* STANDARD LOGIN / REGISTER */
            <>
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Display Name
                  </label>
                  <input
                    id="input-auth-display-name"
                    type="text"
                    placeholder="e.g. Vishal Sharma"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Telegram-Style User ID (No Phone Number)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-mono font-bold">
                    @
                  </span>
                  <input
                    id="input-auth-username"
                    type="text"
                    placeholder="username_id"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3.5 py-2.5 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
                <input
                  id="input-auth-password"
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Bio / Status (Optional)
                  </label>
                  <input
                    id="input-auth-bio"
                    type="text"
                    placeholder="e.g. End-to-end encrypted | Open Source"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              )}

              <button
                id="btn-auth-submit"
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl font-semibold text-xs transition-all shadow-lg shadow-emerald-950 flex items-center justify-center gap-2"
              >
                <span>{loading ? 'Generating ECDH Keys & Encrypting...' : mode === 'login' ? 'Sign In Securely' : 'Create Encrypted Identity'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}
        </form>

        {/* Demo Fast Login Personas */}
        {!needsTwoFactor && (
          <div className="mt-6 pt-5 border-t border-slate-800">
            <p className="text-[11px] font-semibold text-slate-400 text-center uppercase tracking-wider mb-2.5 flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              1-Click Instant Demo Login
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                id="btn-demo-login-alice"
                type="button"
                onClick={() => quickSwitchUser('usr_cipher_alice')}
                className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-emerald-900/50 hover:border-emerald-500 rounded-xl flex items-center gap-2 transition-all text-left"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  A
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-200 truncate">Alice</p>
                  <p className="text-[10px] text-slate-400 font-mono">@alice_sec</p>
                </div>
              </button>

              <button
                id="btn-demo-login-bob"
                type="button"
                onClick={() => quickSwitchUser('usr_cipher_bob')}
                className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-indigo-900/50 hover:border-indigo-500 rounded-xl flex items-center gap-2 transition-all text-left"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  B
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-200 truncate">Bob</p>
                  <p className="text-[10px] text-slate-400 font-mono">@bob_dev</p>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
