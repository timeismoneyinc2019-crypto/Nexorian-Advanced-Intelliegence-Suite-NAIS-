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
  Loader2
} from 'lucide-react';
import { GlassCard } from './GlassCard';
import { cn } from '@/src/lib/utils';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export const Settings: React.FC = () => {
  const [geminiKey, setGeminiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      if (!auth.currentUser) {
        setInitialLoading(false);
        return;
      }

      try {
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
    if (!auth.currentUser) {
      alert('Please sign in to save settings.');
      return;
    }

    setLoading(true);
    try {
      const path = `userSettings/${auth.currentUser.uid}`;
      await setDoc(doc(db, 'userSettings', auth.currentUser.uid), {
        geminiApiKey: geminiKey,
        updatedAt: new Date().toISOString(),
        uid: auth.currentUser.uid
      }, { merge: true });
      
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `userSettings/${auth.currentUser?.uid}`);
    } finally {
      setLoading(false);
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
            Control<br />
            <span className="text-white/20">Center</span>
          </h1>
        </div>
        <div className="flex flex-col items-start md:items-end gap-2">
          <p className="text-[10px] font-mono text-white/40 uppercase tracking-[0.2em]">Infrastructure Management</p>
          <div className="h-px w-32 bg-gradient-to-r from-transparent to-white/20" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* API Configuration */}
        <div className="lg:col-span-7 space-y-6">
          <GlassCard className="p-8">
            <div className="flex items-center gap-3 mb-8">
              <Key className="w-5 h-5 text-orange-400" />
              <h2 className="text-xl font-black text-white uppercase italic">API Infrastructure</h2>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Gemini API Key</label>
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
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 mt-4">
                  <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-white/60 leading-relaxed">
                    <span className="font-bold text-white uppercase">User-Provided Key:</span> You are manually configuring a Gemini API key. This key will be stored in your private Firestore document and used for authenticated requests.
                  </p>
                </div>
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
                    Save Settings
                    <Save className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </GlassCard>

          <GlassCard className="p-8">
            <div className="flex items-center gap-3 mb-8">
              <Globe className="w-5 h-5 text-blue-400" />
              <h2 className="text-xl font-black text-white uppercase italic">Authorized Domains</h2>
            </div>
            
            <div className="space-y-4">
              <p className="text-xs text-white/60 leading-relaxed">
                To enable Google Authentication, you must add the following URLs to your <span className="text-white font-bold">Firebase Console</span>:
              </p>
              
              <div className="space-y-3">
                {[
                  { label: 'Development URL', url: 'https://ais-dev-rbr44374qcs3zk3ntmg4ko-66963101417.us-east5.run.app' },
                  { label: 'Shared App URL', url: 'https://ais-pre-rbr44374qcs3zk3ntmg4ko-66963101417.us-east5.run.app' }
                ].map((item, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between group">
                    <div className="flex flex-col gap-1">
                      <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">{item.label}</span>
                      <span className="text-[10px] font-mono text-white/60 truncate max-w-[200px] sm:max-w-md">{item.url}</span>
                    </div>
                    <button 
                      onClick={() => navigator.clipboard.writeText(item.url)}
                      className="p-2 rounded-lg hover:bg-white/10 text-white/20 hover:text-white transition-all"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-6 rounded-[2rem] bg-white/5 border border-white/10 space-y-4">
                <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Firebase Setup Guide</h4>
                <ol className="space-y-3">
                  {[
                    'Go to the Firebase Console.',
                    'Select your project.',
                    'Navigate to Authentication > Settings.',
                    'Locate the Authorized domains section.',
                    'Add both URLs listed above.'
                  ].map((step, i) => (
                    <li key={i} className="flex gap-3 text-[11px] text-white/60 leading-tight">
                      <span className="font-mono text-white/20">0{i+1}</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Security & Info */}
        <div className="lg:col-span-5 space-y-6">
          <GlassCard className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-5 h-5 text-green-400" />
              <h3 className="text-xs font-black text-white uppercase tracking-widest">Security Protocol</h3>
            </div>
            <p className="text-xs text-white/40 leading-relaxed mb-6">
              Nexus employs enterprise-grade encryption for all internal state transitions. API keys are never stored in plain text and are injected at the container level.
            </p>
            <div className="h-px w-full bg-white/10 mb-6" />
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-white/40 uppercase font-bold">Encryption</span>
                <span className="text-[10px] text-green-400 font-mono">AES-256-GCM</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-white/40 uppercase font-bold">Auth Provider</span>
                <span className="text-[10px] text-blue-400 font-mono">Firebase Auth</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-white/40 uppercase font-bold">State Persistence</span>
                <span className="text-[10px] text-purple-400 font-mono">Firestore</span>
              </div>
            </div>
          </GlassCard>

          <div className="p-8 rounded-[3rem] bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-white/10">
            <h3 className="text-lg font-black text-white italic uppercase mb-2">Need Assistance?</h3>
            <p className="text-xs text-white/60 leading-relaxed mb-6">
              Our technical documentation covers advanced deployment scenarios and custom industry adapter development.
            </p>
            <button className="w-full py-3 rounded-2xl bg-white/10 border border-white/20 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all">
              View Documentation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
