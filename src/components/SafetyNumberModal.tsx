import React, { useState, useEffect } from 'react';
import { ShieldCheck, X, Copy, Check, QrCode, Lock, AlertCircle } from 'lucide-react';
import QRCode from 'qrcode';
import { generateSafetyNumber } from '../utils/crypto';
import { User, Conversation } from '../types';

interface SafetyNumberModalProps {
  currentUser: User;
  conversation: Conversation;
  onClose: () => void;
}

export const SafetyNumberModal: React.FC<SafetyNumberModalProps> = ({
  currentUser,
  conversation,
  onClose,
}) => {
  const [safetyNumber, setSafetyNumber] = useState<string>('Computing verification numbers...');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isVerified, setIsVerified] = useState<boolean>(false);

  useEffect(() => {
    async function loadSafetyInfo() {
      if (conversation.type === 'direct') {
        const otherId = conversation.participants.find((p) => p !== currentUser.id) || conversation.participants[0];
        try {
          const res = await fetch(`/api/users/${otherId}`);
          if (res.ok) {
            const userObj: User = await res.json();
            setOtherUser(userObj);

            if (currentUser.publicKeyJwk && userObj.publicKeyJwk) {
              const { safetyNumber: sn, qrPayload } = await generateSafetyNumber(
                currentUser.publicKeyJwk,
                userObj.publicKeyJwk
              );
              setSafetyNumber(sn);

              const qrUrl = await QRCode.toDataURL(qrPayload, {
                width: 220,
                margin: 1,
                color: { dark: '#022c22', light: '#ffffff' },
              });
              setQrDataUrl(qrUrl);
            }
          }
        } catch (err) {
          console.error('Safety number calculation error:', err);
        }
      }
    }
    loadSafetyInfo();
  }, [currentUser, conversation]);

  const handleCopy = () => {
    navigator.clipboard.writeText(safetyNumber);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-md p-6 shadow-2xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-2 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full blur-[1px]" />

        {/* Close */}
        <button
          id="btn-close-safety-modal"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-100">Verify Safety Number</h2>
          <p className="text-xs text-slate-400 mt-1">
            End-to-End Encryption Fingerprint with{' '}
            <span className="font-semibold text-emerald-400">
              {otherUser ? otherUser.displayName : conversation.name}
            </span>
          </p>
        </div>

        {/* QR Code Container */}
        {qrDataUrl && (
          <div className="bg-white p-3 rounded-2xl w-fit mx-auto mb-5 shadow-lg border border-slate-700 flex flex-col items-center">
            <img src={qrDataUrl} alt="Safety QR Code" className="w-44 h-44 rounded-xl" />
            <span className="text-[10px] text-slate-600 mt-1 font-mono tracking-wider">
              SCAN TO VERIFY KEY
            </span>
          </div>
        )}

        {/* 60-digit number block display */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 mb-4 relative group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              60-Digit Cryptographic Code
            </span>
            <button
              id="btn-copy-safety-number"
              onClick={handleCopy}
              className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
            >
              {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {isCopied ? 'Copied' : 'Copy'}
            </button>
          </div>

          <div className="font-mono text-sm sm:text-base text-slate-200 tracking-widest text-center leading-relaxed font-semibold break-all selection:bg-emerald-500 selection:text-black">
            {safetyNumber}
          </div>
        </div>

        {/* Explanation */}
        <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-xl p-3 mb-5 flex items-start gap-2.5">
          <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-300 leading-normal">
            If the number on this screen matches the number on your recipient's device, your chat is
            guaranteed to be 100% end-to-end encrypted with no third-party interception.
          </p>
        </div>

        {/* Mark as verified toggle */}
        <button
          id="btn-toggle-verify-contact"
          onClick={() => {
            setIsVerified(!isVerified);
            setTimeout(onClose, 400);
          }}
          className={`w-full py-2.5 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 ${
            isVerified
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          {isVerified ? 'Marked as Verified 🔒' : 'Mark as Verified'}
        </button>
      </div>
    </div>
  );
};
