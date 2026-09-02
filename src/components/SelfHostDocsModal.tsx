import React, { useState } from 'react';
import { BookOpen, X, Download, Copy, Check, Terminal, Cloud, Server, Shield, Cpu, Smartphone, Sparkles, QrCode } from 'lucide-react';

interface SelfHostDocsModalProps {
  onClose: () => void;
}

export const SelfHostDocsModal: React.FC<SelfHostDocsModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'android' | 'docker' | 'cloudflare' | 'local' | 'security'>('android');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const dockerComposeYaml = `version: '3.8'

services:
  ciphergram:
    image: node:20-alpine
    container_name: ciphergram_messenger
    restart: unless-stopped
    working_dir: /app
    volumes:
      - ./:/app
      - ciphergram_data:/app/data
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    command: sh -c "npm install && npm run build && npm start"

volumes:
  ciphergram_data:
`;

  const nginxConf = `server {
    listen 80;
    server_name ciphergram.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
`;

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-4xl h-[90vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                0-Cost Self-Hosting & Deployment Guide
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-mono">
                  100% Free & Open-Source
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Complete documentation for hosting on your Local PC, Raspberry Pi, VPS, or Cloudflare
              </p>
            </div>
          </div>
          <button
            id="btn-close-docs-modal"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 pb-2 border-b border-slate-800 bg-slate-950/30 overflow-x-auto">
          {[
            { id: 'android', label: '📱 Android App (APK / Setup)', icon: Smartphone },
            { id: 'overview', label: 'Architecture & 0-Cost', icon: Shield },
            { id: 'docker', label: 'Docker / PC Setup', icon: Terminal },
            { id: 'cloudflare', label: 'Cloudflare Zero-Cost', icon: Cloud },
            { id: 'local', label: 'Node.js & Nginx VPS', icon: Server },
            { id: 'security', label: 'E2EE & Privacy Model', icon: Cpu },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-docs-${tab.id}`}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-300 text-sm leading-relaxed">
          {/* TAB 0: ANDROID APP SETUP */}
          {activeTab === 'android' && (
            <div className="space-y-6">
              <div className="p-4 bg-emerald-950/30 border border-emerald-800/40 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-md text-[10px] font-bold uppercase tracking-wider">
                      Android Native & PWA
                    </span>
                    <h3 className="text-base font-bold text-slate-100">
                      Android App Banana & Setup Kaise Karein (Step-by-Step)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-300">
                    Aap Varta ko <strong className="text-emerald-400">2 aasan tariko</strong> se Android app bana sakte hain (100% Free / 0 Kharcha).
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="px-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-xl text-[11px] font-mono text-slate-300 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                    Android 8.0 to 15+ Ready
                  </div>
                </div>
              </div>

              {/* METHOD 0: GITHUB ACTIONS AUTO-BUILD */}
              <div className="p-5 bg-gradient-to-br from-emerald-950/40 via-slate-950 to-slate-900 border border-emerald-500/40 rounded-2xl space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center">
                      ★
                    </div>
                    <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      GitHub se Direct Auto-Build APK Download Karein (Zero-Effort)
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    Recommended / Auto CI-CD
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Maine is project me <strong>GitHub Actions CI/CD Workflow</strong> (<code className="text-emerald-400 font-mono">.github/workflows/build-apk.yml</code>) configure kar diya hai. Jaise hi aap ise GitHub par publish karenge, GitHub automatically APK compile karke ready kar dega!
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1">
                    <div className="text-xs font-bold text-emerald-400">Step 1: Export / Publish</div>
                    <p className="text-[11px] text-slate-400">
                      Top right <strong>Settings (⚙️)</strong> ya Menu se <strong>"Export to GitHub"</strong> ya <strong>"Download ZIP"</strong> karke apne GitHub account me repository bana kar push karein.
                    </p>
                  </div>
                  <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1">
                    <div className="text-xs font-bold text-emerald-400">Step 2: Auto Build</div>
                    <p className="text-[11px] text-slate-400">
                      GitHub repo me jakar top me <strong>"Actions"</strong> tab par click karein. Waha <strong className="text-slate-200">"Build Android APK"</strong> workflow automatically run ho raha hoga.
                    </p>
                  </div>
                  <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1">
                    <div className="text-xs font-bold text-emerald-400">Step 3: 1-Click APK Download</div>
                    <p className="text-[11px] text-slate-400">
                      Build complete hone par (green check ✅), workflow open karein aur <strong>Artifacts</strong> me se <strong className="text-emerald-300">"Varta-Android-APK"</strong> par click karke direct APK download karein!
                    </p>
                  </div>
                </div>
              </div>

              {/* METHOD 1 */}
              <div className="p-5 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center border border-emerald-500/30">
                      1
                    </div>
                    <h4 className="text-sm font-bold text-slate-100">
                      Tarika 1: Direct Android Phone me 1-Click Install (PWA App)
                    </h4>
                  </div>
                  <span className="text-[10px] font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-2 py-0.5 rounded-full">
                    Sabse Fast (Computer ki zaroorat nahi)
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Yeh app PWA (Progressive Web App) compliant hai. Aapke phone me yeh exact normal Android app ki tarah full-screen open hogi, app drawer me icon aayega, aur camera/mic permissions chalengi.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1">
                    <div className="text-xs font-bold text-slate-200">Step 1</div>
                    <p className="text-[11px] text-slate-400">
                      Apne Android phone ke <strong>Google Chrome</strong> ya <strong>Brave Browser</strong> me app ka URL open karein.
                    </p>
                  </div>
                  <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1">
                    <div className="text-xs font-bold text-slate-200">Step 2</div>
                    <p className="text-[11px] text-slate-400">
                      Browser ke top right corner me <strong>Three Dots (⋮)</strong> menu par tap karein.
                    </p>
                  </div>
                  <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1">
                    <div className="text-xs font-bold text-slate-200">Step 3</div>
                    <p className="text-[11px] text-slate-400">
                      <strong className="text-emerald-400">"Install app"</strong> ya <strong>"Add to Home screen"</strong> par tap karein. App install ho jayegi!
                    </p>
                  </div>
                </div>
              </div>

              {/* METHOD 2: CAPACITOR APK */}
              <div className="p-5 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center border border-indigo-500/30">
                      2
                    </div>
                    <h4 className="text-sm font-bold text-slate-100">
                      Tarika 2: Native Android (.APK) File Banana (Capacitor se)
                    </h4>
                  </div>
                  <span className="text-[10px] font-medium text-indigo-400 bg-indigo-950/40 border border-indigo-800/50 px-2 py-0.5 rounded-full">
                    Full Native .APK / Play Store Ready
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Capacitor ke zariye aap is React application ko seedhe <strong>Android Studio Project</strong> aur <strong>.apk / .aab file</strong> me convert kar sakte hain:
                </p>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-300">Step A: Project Export karke folder me Capacitor add karein</span>
                      <button
                        onClick={() => copyToClipboard(`npm install @capacitor/core @capacitor/cli @capacitor/android\nnpx cap init "Varta" "com.varta.messenger" --web-dir "dist"\nnpm run build\nnpx cap add android`, 'cap-step1')}
                        className="text-slate-400 hover:text-slate-200 flex items-center gap-1 text-[11px]"
                      >
                        {copiedCode === 'cap-step1' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        Copy Commands
                      </button>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl font-mono text-xs text-indigo-300 space-y-1">
                      <p className="text-slate-500"># 1. Install Capacitor packages</p>
                      <p>npm install @capacitor/core @capacitor/cli @capacitor/android</p>
                      <p className="text-slate-500 mt-2"># 2. Initialize Capacitor configuration</p>
                      <p>npx cap init "Varta" "com.varta.messenger" --web-dir "dist"</p>
                      <p className="text-slate-500 mt-2"># 3. Build Web Bundle & Create Android folder</p>
                      <p>npm run build</p>
                      <p>npx cap add android</p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-300">Step B: Android Studio me Open karein aur APK generate karein</span>
                      <button
                        onClick={() => copyToClipboard(`npx cap open android`, 'cap-step2')}
                        className="text-slate-400 hover:text-slate-200 flex items-center gap-1 text-[11px]"
                      >
                        {copiedCode === 'cap-step2' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        Copy Command
                      </button>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl font-mono text-xs text-emerald-300">
                      <p>npx cap open android</p>
                    </div>
                    <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 text-xs text-slate-300 space-y-1">
                      <p>1. Android Studio open hone ke baad Gradle Sync hone dein.</p>
                      <p>2. Top menu me <strong>Build &gt; Build Bundle(s) / APK(s) &gt; Build APK(s)</strong> par click karein.</p>
                      <p>3. <strong>app-debug.apk</strong> file aapke <code className="text-indigo-400 font-mono">android/app/build/outputs/apk/</code> folder me generate ho jayegi.</p>
                      <p>4. Is APK file ko kisi bhi Android phone me Bluetooth ya WhatsApp se bhejein aur Install karein!</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* METHOD 3: ONLINE APK BUILDER */}
              <div className="p-5 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-center border border-amber-500/30">
                    3
                  </div>
                  <h4 className="text-sm font-bold text-slate-100">
                    Tarika 3: PWABuilder se 1-Minute me Online APK Download karein
                  </h4>
                </div>
                <p className="text-xs text-slate-400">
                  Agar aapke paas Android Studio nahi hai, toh Microsoft ke official tool se free me APK generate karein:
                </p>
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1.5">
                  <p>1. <a href="https://www.pwabuilder.com" target="_blank" rel="noreferrer" className="text-emerald-400 underline font-semibold">PWABuilder.com</a> par jayein.</p>
                  <p>2. Apne Varta app ka Live URL paste karein aur <strong>Start</strong> par click karein.</p>
                  <p>3. <strong>"Package for Android"</strong> button dabayein aur direct Signed APK / Google Play ready package download karein!</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              <div className="p-4 bg-emerald-950/30 border border-emerald-800/40 rounded-2xl">
                <h3 className="text-base font-bold text-emerald-400 mb-1">
                  💰 How CipherGram Achieves 100% Zero Cost (0 Kharcha)
                </h3>
                <p className="text-xs text-slate-300">
                  Unlike proprietary messengers (Twilio, Firebase, SendBird, AWS SNS) that charge per message,
                  user active fees, or SMS fees, CipherGram is engineered entirely with standard W3C Web APIs and
                  open-source components.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl">
                  <h4 className="font-semibold text-slate-100 text-xs mb-1 text-emerald-400">
                    1. No Phone Numbers / No SMS Fees
                  </h4>
                  <p className="text-xs text-slate-400">
                    Uses Telegram-style `@username` and cryptographic User IDs. Eliminates expensive SMS OTP gateways (Twilio costs ₹3-₹5 per OTP).
                  </p>
                </div>
                <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl">
                  <h4 className="font-semibold text-slate-100 text-xs mb-1 text-indigo-400">
                    2. Native Web Crypto E2EE
                  </h4>
                  <p className="text-xs text-slate-400">
                    Encryption occurs 100% on the client's device using standard `window.crypto.subtle` (ECDH P-256 + AES-GCM 256). Zero server CPU crypto cost!
                  </p>
                </div>
                <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl">
                  <h4 className="font-semibold text-slate-100 text-xs mb-1 text-amber-400">
                    3. Lightweight Self-Contained Storage
                  </h4>
                  <p className="text-xs text-slate-400">
                    Embedded JSON / SQLite / D1 database engine. Runs effortlessly on a 512MB RAM server, old laptop, Raspberry Pi, or Cloudflare free tier.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-3">
                <h4 className="text-sm font-semibold text-slate-200">Open-Source Tech Stack Breakdown</h4>
                <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-400">
                  <li><strong className="text-slate-200">Frontend:</strong> React 19, TypeScript, Tailwind CSS, Lucide Icons, Web Crypto API, Web Audio MediaRecorder.</li>
                  <li><strong className="text-slate-200">Real-Time Engine:</strong> Native Node.js `ws` WebSocket Server (bi-directional instant sync, typing, read receipts).</li>
                  <li><strong className="text-slate-200">2FA Security:</strong> RFC 6238 TOTP Engine compatible with Google Authenticator, Bitwarden, and Aegis.</li>
                  <li><strong className="text-slate-200">Persistence:</strong> Zero-dependency file store `/data/ciphergram_db.json` & client-side IndexedDB cache.</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 2: DOCKER / PC SETUP */}
          {activeTab === 'docker' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-100">1-Command Docker Setup</h3>
                  <p className="text-xs text-slate-400">Run on your Windows PC, Mac, Linux, or Raspberry Pi home server.</p>
                </div>
                <button
                  id="btn-download-docker-compose"
                  onClick={() => downloadFile(dockerComposeYaml, 'docker-compose.yml')}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download docker-compose.yml
                </button>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-xs text-emerald-400 relative">
                <button
                  id="btn-copy-docker-code"
                  onClick={() => copyToClipboard(dockerComposeYaml, 'docker')}
                  className="absolute top-3 right-3 text-slate-400 hover:text-slate-200 flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-md border border-slate-700"
                >
                  {copiedCode === 'docker' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copiedCode === 'docker' ? 'Copied' : 'Copy'}
                </button>
                <pre className="overflow-x-auto whitespace-pre">{dockerComposeYaml}</pre>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Commands to start:</h4>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-slate-200 space-y-1">
                  <p className="text-slate-500"># 1. Start the container in background</p>
                  <p className="text-emerald-400">docker compose up -d</p>
                  <p className="text-slate-500 mt-2"># 2. Open in your browser</p>
                  <p className="text-sky-400">http://localhost:3000</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CLOUDFLARE */}
          {activeTab === 'cloudflare' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-100">Deploy on Cloudflare Free Tier</h3>
              <p className="text-xs text-slate-400">
                Cloudflare Pages + Workers allows you to host globally distributed web apps with 100,000 free requests per day and 0 server maintenance fees.
              </p>

              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-3">
                <h4 className="text-xs font-semibold text-indigo-400 uppercase">Step-by-Step Instructions</h4>
                <ol className="list-decimal list-inside space-y-2 text-xs text-slate-300">
                  <li>
                    <strong>Build Static Frontend:</strong> Run <code className="bg-slate-900 px-1.5 py-0.5 rounded text-emerald-400">npm run build</code> to produce the <code className="text-slate-200">dist/</code> directory.
                  </li>
                  <li>
                    <strong>Cloudflare Pages:</strong> Connect your GitHub repo or upload the <code className="text-slate-200">dist/</code> folder directly to Cloudflare Pages dashboard.
                  </li>
                  <li>
                    <strong>Cloudflare Workers for WebSockets & Relay:</strong> Deploy the Node.js / Hono worker to Cloudflare Workers with Durable Objects for zero-cost WebSocket hibernation.
                  </li>
                  <li>
                    <strong>Cloudflare D1 / KV:</strong> Store user public keys and offline queues using Cloudflare D1 (Serverless SQLite) completely within the generous free tier limits.
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 4: LOCALHOST & VPS */}
          {activeTab === 'local' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-100">Node.js PM2 & Nginx Reverse Proxy</h3>
                  <p className="text-xs text-slate-400">Self-host on any cheap $0-$3 VPS, old laptop, or home server.</p>
                </div>
                <button
                  id="btn-download-nginx-conf"
                  onClick={() => downloadFile(nginxConf, 'ciphergram-nginx.conf')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium flex items-center gap-1.5 border border-slate-700"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download nginx.conf
                </button>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-xs text-slate-300 relative">
                <button
                  id="btn-copy-nginx-code"
                  onClick={() => copyToClipboard(nginxConf, 'nginx')}
                  className="absolute top-3 right-3 text-slate-400 hover:text-slate-200 flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-md border border-slate-700"
                >
                  {copiedCode === 'nginx' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copiedCode === 'nginx' ? 'Copied' : 'Copy'}
                </button>
                <pre className="overflow-x-auto whitespace-pre">{nginxConf}</pre>
              </div>

              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-2 text-xs">
                <h4 className="font-semibold text-slate-200">Run with PM2 background process manager:</h4>
                <div className="bg-slate-900 p-2.5 rounded-xl font-mono text-emerald-400">
                  npm run build && pm2 start dist/server.cjs --name "ciphergram"
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SECURITY & PRIVACY MODEL */}
          {activeTab === 'security' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-100">Cryptographic & Privacy Guarantees</h3>

              <div className="space-y-3">
                <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl">
                  <h4 className="text-xs font-semibold text-emerald-400 mb-1">
                    🔒 Curve P-256 ECDH Key Exchange
                  </h4>
                  <p className="text-xs text-slate-400">
                    Each device creates an Elliptic Curve Diffie-Hellman (P-256) keypair. The private key never leaves the client's local secure storage.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl">
                  <h4 className="text-xs font-semibold text-indigo-400 mb-1">
                    🛡️ AES-256-GCM Authenticated Encryption
                  </h4>
                  <p className="text-xs text-slate-400">
                    Every message, file, and voice note is encrypted using military-grade 256-bit AES-GCM with a distinct 96-bit cryptographic initialization vector (IV).
                  </p>
                </div>

                <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl">
                  <h4 className="text-xs font-semibold text-amber-400 mb-1">
                    🪪 Zero-Phone-Number Metadata Shield
                  </h4>
                  <p className="text-xs text-slate-400">
                    Unlike WhatsApp which shares your personal phone number with everyone in groups and direct chats, CipherGram only exposes your selected User ID or `@username` handle.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
