import React from 'react';
import { motion } from 'motion/react';
import { BookOpen, Settings, Activity, Search, ShieldCheck, Download, Cpu, Zap, Lock, Globe, RefreshCcw } from 'lucide-react';

const GlassCard = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl ${className}`}>
    {children}
  </div>
);

const ManualSection = ({ title, icon: Icon, children }: { title: string, icon: any, children: React.ReactNode }) => (
  <GlassCard className="p-8 space-y-4">
    <div className="flex items-center gap-4 mb-6">
      <div className="p-3 rounded-2xl bg-white/10 text-white">
        <Icon className="w-6 h-6" />
      </div>
      <h2 className="text-2xl font-bold text-white uppercase tracking-tight">{title}</h2>
    </div>
    <div className="space-y-4 text-white/70 leading-relaxed">
      {children}
    </div>
  </GlassCard>
);

export const Manual: React.FC = () => {
  return (
    <div className="min-h-screen pt-32 pb-24 px-6 sm:px-12 max-w-5xl mx-auto space-y-12">
      {/* Header */}
      <div className="space-y-4 text-center mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-white/10 border border-white/20 text-[10px] font-black tracking-[0.3em] text-white/60 uppercase">
          Operating Manual v1.0
        </div>
        <h1 className="text-6xl sm:text-8xl font-black tracking-tighter italic uppercase leading-[0.85]">
          How to Use<br />
          <span className="text-white/20">Your NAIS Kit</span>
        </h1>
        <p className="text-lg text-white/40 max-w-2xl mx-auto">
          Welcome to the Nexorian Advanced Intelligence Suite. This guide explains everything in simple terms, like building a cool science kit.
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-8">
        <ManualSection title="1. The Brain (The Dashboard)" icon={Cpu}>
          <p>
            Think of the Dashboard as the "Brain" of your kit. It shows you what is happening right now.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <p className="font-bold text-white mb-2">Efficiency Meter</p>
              <p className="text-sm">This shows how well your system is working. If it is 100%, everything is perfect! If it goes down, something might be wrong.</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <p className="font-bold text-white mb-2">System Drift</p>
              <p className="text-sm">This is like a car steering slightly to the left. It tells you if the system is moving away from its goal.</p>
            </div>
          </div>
          <p className="mt-4 italic text-sm">Example: If you are running a farm, the Brain will tell you if the plants are happy or if they need more water.</p>
        </ManualSection>

        <ManualSection title="2. The Detective (Deep Research)" icon={Search}>
          <p>
            The Detective helps you find answers to hard questions. You give it a topic, and it goes and finds all the secrets!
          </p>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <p className="font-bold text-white mb-2">How to use it:</p>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Type what you want to know in the box.</li>
              <li>Click "Start Deep Research".</li>
              <li>Wait for the Detective to finish. It will give you a detailed report!</li>
            </ol>
          </div>
          <p className="mt-4 italic text-sm">Example: Ask "What will people want to buy next year?" and the Detective will tell you the answer.</p>
        </ManualSection>

        <ManualSection title="3. The Shield (Security & Settings)" icon={ShieldCheck}>
          <p>
            The Shield keeps your kit safe. This is where you put your secret keys and set your rules.
          </p>
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <p className="font-bold text-white mb-2">Gemini API Key</p>
              <p className="text-sm">This is like the "battery" for the AI. Without it, the AI cannot think. You get this from Google and paste it here.</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <p className="font-bold text-white mb-2">License Key</p>
              <p className="text-sm">This is your "ticket" to use the software. It looks like NEXUS-PRO-XXXX-XXXX.</p>
            </div>
          </div>
        </ManualSection>

        <ManualSection title="4. Making it a Real App (Exporting)" icon={Download}>
          <p>
            You can turn this website into a real app that lives on your computer or phone!
          </p>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <p className="font-bold text-white mb-2">Where is the .exe?</p>
            <p className="text-sm mb-4">
              To get an **.exe** file (for Windows) or an **.app** file (for Mac), we use a tool called **Electron**.
            </p>
            <div className="bg-black/40 p-4 rounded-xl font-mono text-[10px] text-white/60 space-y-2">
              <p>1. Open your terminal.</p>
              <p>2. Type: <span className="text-blue-400">npm install electron-builder --save-dev</span></p>
              <p>3. Type: <span className="text-blue-400">npm run build</span></p>
              <p>4. Look in the <span className="text-white">/dist</span> folder. Your .exe is there!</p>
            </div>
          </div>
          <p className="mt-4 italic text-sm">Example: Once you do this, you can click an icon on your desktop to open NAIS, just like a video game!</p>
        </ManualSection>

        <ManualSection title="5. Mobile Integration (iOS/Swift)" icon={Globe}>
          <p>
            NAIS is ready for mobile. You can integrate the intelligence layer into your iOS apps using the Firebase AI Logic library.
          </p>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-4">
            <p className="text-sm font-bold text-white uppercase tracking-widest">Setup Steps:</p>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Add the Firebase iOS SDK to your Xcode project.</li>
              <li>Select the <span className="text-blue-400">FirebaseAILogic</span> library.</li>
              <li>Initialize the service in your Swift code:</li>
            </ol>
            <div className="bg-black/40 p-4 rounded-xl font-mono text-[10px] text-white/60 space-y-2">
              <p className="text-purple-400">import</p> FirebaseAILogic
              <p className="text-blue-400">// Initialize NAIS Mobile Core</p>
              <p><span className="text-purple-400">let</span> ai = FirebaseAI.firebaseAI(backend: .googleAI())</p>
              <p><span className="text-purple-400">let</span> model = ai.generativeModel(modelName: <span className="text-green-400">"gemini-3-flash-preview"</span>)</p>
            </div>
          </div>
          <p className="mt-4 italic text-sm">Note: This allows your field agents to access NAIS intelligence directly from their iPhones.</p>
        </ManualSection>

        <ManualSection title="7. Sovereign Intelligence (Local Nodes)" icon={Cpu}>
          <p>
            Why rely on external API keys? Large Language Models (LLMs) like Gemini or Llama are essentially massive mathematical engines that require significant hardware to run.
          </p>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-4">
            <p className="text-sm font-bold text-white uppercase tracking-widest">The "Key" Concept:</p>
            <p className="text-xs text-white/60 leading-relaxed">
              An API key is your ticket to use someone else's supercomputer. Google and OpenAI own the hardware; the key tracks your usage and enforces quotas.
            </p>
            <p className="text-sm font-bold text-white uppercase tracking-widest">Running Your Own:</p>
            <p className="text-xs text-white/60 leading-relaxed">
              You CAN have your own. By setting up a <span className="text-green-400">Nexus Local Node</span> (using tools like Ollama), you can run models directly on your own hardware.
            </p>
            <ul className="list-disc list-inside space-y-2 text-[10px] text-white/40">
              <li>No Quota Limits: You own the compute.</li>
              <li>Offline Mode: Intelligence without an internet connection.</li>
              <li>Total Privacy: Your data never leaves your infrastructure.</li>
            </ul>
          </div>
          <p className="mt-4 italic text-sm">Note: High-performance local intelligence requires a dedicated GPU (Graphics Card) to maintain real-time decision speeds.</p>
        </ManualSection>

        <ManualSection title="8. Adjusting the Knobs" icon={Settings}>
          <p>
            You can change how the system behaves by turning "invisible knobs" in the Settings.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <p className="font-bold text-white mb-2">Drift Threshold</p>
              <p className="text-sm">If you set this low, the system is very strict. If you set it high, it is more relaxed.</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <p className="font-bold text-white mb-2">Auto-Healing</p>
              <p className="text-sm">When this is ON, the system fixes itself automatically if it sees a problem.</p>
            </div>
          </div>
        </ManualSection>

        <ManualSection title="9. Truth-First Infrastructure Audit" icon={ShieldCheck}>
          <p>
            The system is currently operating in <span className="text-purple-400">Research Grade Truth-First Advisor Audit Mode</span>. This ensures the highest level of scientific discipline and adversarial security.
          </p>
          <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/20 space-y-4">
            <div>
              <p className="text-sm font-bold text-white uppercase tracking-widest mb-2">Data Integrity Sources:</p>
              <ul className="space-y-2 text-[10px] text-white/60">
                <li><span className="text-white font-bold">Nexus Defense Core:</span> Proprietary SIGINT and asset readiness telemetry.</li>
                <li><span className="text-white font-bold">Nexus Smart City API:</span> Structural integrity and urban sensor aggregation.</li>
                <li><span className="text-white font-bold">Open-Meteo:</span> Verified atmospheric and soil telemetry for agriculture.</li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-bold text-white uppercase tracking-widest mb-2">Security Hardening:</p>
              <ul className="space-y-2 text-[10px] text-white/60">
                <li><span className="text-purple-400 font-bold">Immutable Ledger:</span> All decisions and predictions are write-once, read-only.</li>
                <li><span className="text-purple-400 font-bold">RBAC Whitelisting:</span> Access is restricted by industry-specific authorization tokens.</li>
                <li><span className="text-purple-400 font-bold">Schema Enforcement:</span> Strict type-checking at the database level prevents data corruption.</li>
              </ul>
            </div>
          </div>
        </ManualSection>

        <ManualSection title="10. Troubleshooting & Migration" icon={RefreshCcw}>
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-orange-500/5 border border-orange-500/20">
              <p className="text-sm font-bold text-orange-400 uppercase tracking-widest mb-2">Cookie / Authentication Issue:</p>
              <p className="text-xs text-white/60 leading-relaxed">
                If you see "Action required to load your app" on iOS/Safari, it is because Apple's security blocks cookies inside iframes. 
              </p>
              <p className="text-xs text-white/80 font-bold mt-2">Fix: Click "Authenticate in new window" or simply open the app URL directly in a new tab.</p>
            </div>
            
            <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20">
              <p className="text-sm font-bold text-blue-400 uppercase tracking-widest mb-2">Moving to Laptop:</p>
              <p className="text-xs text-white/60 leading-relaxed">
                NAIS is a cloud-native infrastructure. To move from your iPhone to your laptop, simply open your unique App URL in any desktop browser:
              </p>
              <div className="mt-2 p-2 bg-black/40 rounded font-mono text-[10px] text-blue-300 break-all">
                https://ais-dev-rbr44374qcs3zk3ntmg4ko-66963101417.us-east5.run.app
              </div>
              <p className="text-[10px] text-white/40 mt-2 italic">Tip: Use the "Shared App URL" for a production-ready view without the development sidebar.</p>
            </div>
          </div>
        </ManualSection>
      </div>

      {/* Footer */}
      <div className="pt-12 border-t border-white/10 text-center">
        <p className="text-xs text-white/20 uppercase tracking-[0.5em]">End of Manual • Nexorian Advanced Intelligence Suite</p>
        <ManualSection title="11. Proactive Intelligence" icon={Zap}>
          <div className="space-y-4">
            <p className="text-sm text-white/80 leading-relaxed">
              NAIS features a <span className="text-yellow-400 font-bold">Proactive Learning Layer</span> that identifies environmental "X factors" before they cause system-wide failures.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <p className="text-xs font-bold text-white uppercase tracking-widest mb-2">Pattern Recognition:</p>
                <p className="text-[10px] text-white/60">
                  The system archives "X factors" (e.g., Solar Flares, Network Jitter) into a Proactive Memory.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <p className="text-xs font-bold text-white uppercase tracking-widest mb-2">Self-Adjustment:</p>
                <p className="text-[10px] text-white/60">
                  When a known X factor is detected, the Decision Engine automatically recalibrates parameters to prevent spikes.
                </p>
              </div>
            </div>
          </div>
        </ManualSection>
      </div>
    </div>
  );
};
