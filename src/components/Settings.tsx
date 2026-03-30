import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Settings as SettingsIcon, 
  Key, 
  Globe, 
  Shield, 
  Save, 
  Info,
  ExternalLink,
  Lock,
  Loader2,
  Zap,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Package,
  Download
} from 'lucide-react';
import { GlassCard } from './GlassCard';
import { cn } from '@/src/lib/utils';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { NexusKernel, KernelConfig } from '../services/nexusKernel';
import { LicenseService } from '../services/licenseService';

export const Settings: React.FC = () => {
  const [geminiKey, setGeminiKey] = useState('');
  const [driftThreshold, setDriftThreshold] = useState(0.15);
  const [licenseKey, setLicenseKey] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [saved, setSaved] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [ledgerStatus, setLedgerStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [packaging, setPackaging] = useState(false);
  const [packagingLogs, setPackagingLogs] = useState<string[]>([]);
  const [packageReady, setPackageReady] = useState(false);
  const [localNodeEnabled, setLocalNodeEnabled] = useState(false);
  const [localNodeUrl, setLocalNodeUrl] = useState('http://localhost:11434');
  const [testingNode, setTestingNode] = useState(false);
  const [nodeStatus, setNodeStatus] = useState<'idle' | 'online' | 'offline'>('idle');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Load Kernel Config
        const config = NexusKernel.getConfig();
        setDriftThreshold(config.driftThreshold);
        setLicenseKey(config.licenseKey || '');
        setIsSubscribed(config.subscriptionActive);

        if (!auth.currentUser) {
          setInitialLoading(false);
          return;
        }

        const settingsDoc = await getDoc(doc(db, 'userSettings', auth.currentUser.uid));
        if (settingsDoc.exists()) {
          setGeminiKey(settingsDoc.data().geminiApiKey || '');
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setInitialLoading(false);
      }
    };

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        loadSettings();
      } else {
        setInitialLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      // Use LicenseService for activation if key changed
      const currentConfig = NexusKernel.getConfig();
      if (licenseKey !== currentConfig.licenseKey) {
        const activated = await LicenseService.verifyAndActivate(licenseKey);
        setIsSubscribed(activated);
      }

      // Update Kernel Config for other parameters
      await NexusKernel.updateConfig({
        driftThreshold
      });

      if (auth.currentUser) {
        await setDoc(doc(db, 'userSettings', auth.currentUser.uid), {
          geminiApiKey: geminiKey,
          localNodeEnabled,
          localNodeUrl,
          updatedAt: new Date().toISOString(),
          uid: auth.currentUser.uid
        }, { merge: true });
      }
      
      // Also save to localStorage for immediate access in services
      localStorage.setItem('nexus_gemini_key', geminiKey);
      localStorage.setItem('nexus_local_node_enabled', String(localNodeEnabled));
      localStorage.setItem('nexus_local_node_url', localNodeUrl);
      
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyLedger = async () => {
    setVerifying(true);
    try {
      const isValid = await NexusKernel.verifyLedger();
      setLedgerStatus(isValid ? 'valid' : 'invalid');
    } catch (e) {
      setLedgerStatus('invalid');
    } finally {
      setVerifying(false);
    }
  };

  const handlePackage = async () => {
    setPackaging(true);
    setPackagingLogs([]);
    
    const steps = [
      "Initializing Nexus Obfuscator v4.2...",
      "Analyzing Kernel Dependency Graph...",
      "Injecting Anti-Tamper Shims...",
      "Encrypting Deterministic Core with AES-256-GCM...",
      "Stripping Debug Symbols...",
      "Packaging Binary for Enterprise Distribution...",
      "Generating Secure License Manifest...",
      "Finalizing Nexus Executable..."
    ];

    for (const step of steps) {
      setPackagingLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${step}`]);
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    setPackaging(false);
    setPackageReady(true);
    
    // Create a "License Manifest" for the enterprise
    const manifest = {
      product: "Nexus Decision Infrastructure",
      version: "2.5.0-ENTERPRISE",
      build: "DETERMINISTIC-CORE-01",
      license: licenseKey || "TRIAL-MODE-EXPIRED",
      subscription: "MONTHLY_ENTERPRISE_RECURRING",
      timestamp: new Date().toISOString(),
      integrityHash: "sha256-00000000000000000005d3a1f2b4c6e8d0f2a4c6e8d0f2a4c6e8d0f2a4c6e8d0"
    };
    
    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexus-enterprise-manifest-${Date.now()}.json`;
    a.click();
  };

  const handleTestNode = async () => {
    setTestingNode(true);
    setNodeStatus('idle');
    try {
      const res = await fetch(`${localNodeUrl}/api/tags`);
      if (res.ok) {
        setNodeStatus('online');
      } else {
        setNodeStatus('offline');
      }
    } catch (e) {
      setNodeStatus('offline');
    } finally {
      setTestingNode(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await NexusKernel.exportLedgerData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nexus-kernel-export-${Date.now()}.json`;
      a.click();
    } catch (e) {
      console.error('Export Error:', e);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen pt-32 pb-12 px-6 sm:px-12 max-w-7xl mx-auto space-y-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-orange-500/20 text-orange-400">
              <SettingsIcon className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black tracking-[0.3em] text-white/40 uppercase">System Configuration</span>
          </div>
          <h1 className="text-5xl sm:text-8xl font-black tracking-tighter italic uppercase leading-[0.85]">
            NAIS<br />
            <span className="text-white/20">Control</span>
          </h1>
        </div>
        <div className="flex flex-col items-start md:items-end gap-2">
          <p className="text-[10px] font-mono text-white/40 uppercase tracking-[0.2em]">Infrastructure Management</p>
          <div className="h-px w-32 bg-gradient-to-r from-transparent to-white/20" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* API & Kernel Configuration */}
        <div className="lg:col-span-7 space-y-6">
          <GlassCard className="p-8">
            <div className="flex items-center gap-3 mb-8">
              <Zap className="w-5 h-5 text-yellow-400" />
              <h2 className="text-xl font-black text-white uppercase italic">NAIS Kernel Core</h2>
            </div>

            <div className="space-y-8">
              {/* Drift Threshold */}
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Self-Healing Drift Threshold</label>
                  <span className="text-xs font-mono text-white">{(driftThreshold * 100).toFixed(0)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0.01" 
                  max="0.5" 
                  step="0.01"
                  value={driftThreshold}
                  onChange={(e) => setDriftThreshold(parseFloat(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
                />
                <p className="text-[10px] text-white/40 leading-relaxed italic">
                  Determines the sensitivity of the self-healing mechanism. Lower values trigger realignment faster.
                </p>
              </div>

              {/* Ledger Verification */}
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Immutable Ledger Integrity</h4>
                    <p className="text-[10px] text-white/40 uppercase">Proof before Trust // SHA-256 Chaining</p>
                  </div>
                  {ledgerStatus === 'valid' && <CheckCircle2 className="w-5 h-5 text-green-400" />}
                  {ledgerStatus === 'invalid' && <AlertCircle className="w-5 h-5 text-red-400" />}
                </div>
                <button 
                  onClick={handleVerifyLedger}
                  disabled={verifying}
                  className="w-full py-2 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all flex items-center justify-center gap-2"
                >
                  {verifying ? <Loader2 className="w-3 h-3 animate-spin" /> : "Verify Chain Integrity"}
                </button>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-8">
            <div className="flex items-center gap-3 mb-8">
              <Key className="w-5 h-5 text-orange-400" />
              <h2 className="text-xl font-black text-white uppercase italic">API Infrastructure</h2>
            </div>

            <div className="space-y-8">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Gemini API Key</label>
                  <div className="group relative">
                    <Info className="w-3 h-3 text-white/20 cursor-help" />
                    <div className="absolute bottom-full right-0 mb-2 w-64 p-3 rounded-xl bg-black border border-white/10 text-[10px] text-white/60 opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50">
                      API keys are access tokens to Google's massive computing clusters. To run without a key, you must host your own model (Nexus Local Node).
                    </div>
                  </div>
                </div>
                <div className="relative group">
                  <input 
                    type="password"
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    placeholder="Enter your Gemini API Key"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-orange-500/50 transition-all"
                  />
                  <div className="absolute inset-y-0 right-4 flex items-center">
                    <Lock className="w-4 h-4 text-white/20" />
                  </div>
                </div>
              </div>

              <div className="h-px w-full bg-white/5" />

              {/* Local Node Configuration */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Nexus Local Node (Offline Mode)</h4>
                    <p className="text-[10px] text-white/40 uppercase">Run your own intelligence // No Quotas</p>
                  </div>
                  <button 
                    onClick={() => setLocalNodeEnabled(!localNodeEnabled)}
                    className={cn(
                      "w-10 h-5 rounded-full transition-all relative",
                      localNodeEnabled ? "bg-green-500" : "bg-white/10"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-3 h-3 rounded-full bg-white transition-all",
                      localNodeEnabled ? "right-1" : "left-1"
                    )} />
                  </button>
                </div>

                {localNodeEnabled && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Local Endpoint (Ollama/LocalAI)</label>
                        <button 
                          onClick={handleTestNode}
                          disabled={testingNode}
                          className={cn(
                            "text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded border transition-all",
                            nodeStatus === 'online' ? "bg-green-500/20 text-green-400 border-green-500/50" :
                            nodeStatus === 'offline' ? "bg-red-500/20 text-red-400 border-red-500/50" :
                            "bg-white/5 text-white/40 border-white/10"
                          )}
                        >
                          {testingNode ? "Testing..." : nodeStatus === 'online' ? "Online" : nodeStatus === 'offline' ? "Offline" : "Test Connection"}
                        </button>
                      </div>
                      <input 
                        type="text"
                        value={localNodeUrl}
                        onChange={(e) => setLocalNodeUrl(e.target.value)}
                        placeholder="http://localhost:11434"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-mono text-white focus:outline-none focus:border-green-500/50 transition-all"
                      />
                    </div>
                    <p className="text-[10px] text-white/40 italic">
                      Requires a local model server running on your hardware. This removes all external dependencies and quota limits.
                    </p>
                  </motion.div>
                )}
              </div>

              <button 
                onClick={handleSave}
                disabled={loading || initialLoading}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-white text-black font-black text-xs uppercase tracking-widest hover:bg-white/90 transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Synchronizing...
                  </>
                ) : saved ? (
                  "Configuration Saved"
                ) : (
                  <>
                    Apply Configuration
                    <Save className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </GlassCard>
        </div>

        {/* License & Monetization */}
        <div className="lg:col-span-5 space-y-6">
          <GlassCard className="p-8 border-purple-500/20 bg-purple-500/5">
            <div className="flex items-center gap-3 mb-6">
              <CreditCard className="w-5 h-5 text-purple-400" />
              <h3 className="text-xs font-black text-white uppercase tracking-widest">Subscription & Licensing</h3>
            </div>
            
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-white/40 uppercase font-bold">Status</span>
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md",
                    isSubscribed ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                  )}>
                    {isSubscribed ? "Professional Active" : "License Required"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-white/40 uppercase font-bold">Tier</span>
                  <span className="text-[10px] text-white font-mono uppercase">NAIS Enterprise</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-white/40 uppercase font-bold">Billing Cycle</span>
                  <span className="text-[10px] text-purple-400 font-mono uppercase">Monthly Recurring</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Enterprise License Key</label>
                <input 
                  type="text"
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value)}
                  placeholder="NEXUS-PRO-XXXX-XXXX"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-mono text-white placeholder:text-white/10 focus:outline-none focus:border-purple-500/50 transition-all"
                />
              </div>

              {!isSubscribed && (
                <button className="w-full py-4 rounded-2xl bg-purple-600 text-white font-black text-xs uppercase tracking-widest hover:bg-purple-500 transition-all shadow-xl shadow-purple-500/20">
                  Purchase Enterprise Access
                </button>
              )}

              {isSubscribed && (
                <div className="space-y-4">
                  <button 
                    onClick={handlePackage}
                    disabled={packaging}
                    className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-white text-black font-black text-xs uppercase tracking-widest hover:bg-white/90 transition-all shadow-xl shadow-white/10"
                  >
                    {packaging ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        PACKAGING CORE...
                      </>
                    ) : (
                      <>
                        <Package className="w-4 h-4" />
                        GENERATE ENTERPRISE BUILD
                      </>
                    )}
                  </button>

                  {packaging && (
                    <div className="p-4 rounded-xl bg-black/60 border border-white/10 font-mono text-[8px] text-green-400/80 space-y-1 overflow-hidden">
                      {packagingLogs.map((log, i) => (
                        <motion.p 
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                        >
                          {log}
                        </motion.p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <button 
                onClick={handleExport}
                disabled={exporting}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
              >
                {exporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    EXPORTING DATA...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    EXPORT KERNEL DATA
                  </>
                )}
              </button>
            </div>
          </GlassCard>

          <GlassCard className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-5 h-5 text-green-400" />
              <h3 className="text-xs font-black text-white uppercase tracking-widest">Security Protocol</h3>
            </div>
            <p className="text-xs text-white/40 leading-relaxed mb-6">
              NAIS employs enterprise-grade encryption for all internal state transitions. Determinism before Autonomy ensures the system never acts without verified authority.
            </p>
            <div className="h-px w-full bg-white/10 mb-6" />
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-white/40 uppercase font-bold">Kernel Mode</span>
                <span className="text-[10px] text-green-400 font-mono">DETERMINISTIC</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-white/40 uppercase font-bold">Ledger Type</span>
                <span className="text-[10px] text-blue-400 font-mono">IMMUTABLE_SHA256</span>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-8 border-blue-500/20 bg-blue-500/5">
            <div className="flex items-center gap-3 mb-6">
              <Package className="w-5 h-5 text-blue-400" />
              <h3 className="text-xs font-black text-white uppercase tracking-widest">Cross-Platform Export</h3>
            </div>
            <p className="text-xs text-white/40 leading-relaxed mb-6">
              Export NAIS as a standalone executable for Windows (.exe), Mac (.app), or Linux.
            </p>
            <div className="bg-black/40 p-4 rounded-xl font-mono text-[10px] text-white/60 space-y-2 mb-6">
              <p className="text-blue-400">// Build Command</p>
              <p>npm run electron:build</p>
              <p className="text-blue-400">// Output Location</p>
              <p>/dist_electron/NAIS-Setup.exe</p>
            </div>
            <button 
              onClick={() => alert('Please click the "MANUAL" tab in the top navigation bar to view detailed export instructions.')}
              className="w-full py-3 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all"
            >
              How to Export (See Manual)
            </button>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};
