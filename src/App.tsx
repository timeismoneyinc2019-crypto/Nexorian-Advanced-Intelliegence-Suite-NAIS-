/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { PitchDeck } from './components/PitchDeck';
import { ResearchPanel } from './components/ResearchPanel';
import { Settings } from './components/Settings';
import { Manual } from './components/Manual';
import { LayoutDashboard, Presentation, Cpu, Search, Settings as SettingsIcon, WifiOff, ShieldCheck, AlertTriangle, BookOpen } from 'lucide-react';
import { IntegrityService } from './services/integrityService';
import { auth, signIn } from './firebase';
import { NexusKernel } from './services/nexusKernel';

export default function App() {
  const [view, setView] = useState<'dashboard' | 'pitch' | 'research' | 'settings' | 'manual'>('dashboard');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [drift, setDrift] = useState<number>(0);
  const [showDriftAlert, setShowDriftAlert] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [kernelReady, setKernelReady] = useState(false);

  useEffect(() => {
    let unsubscribeIntegrity: (() => void) | undefined;

    const init = async () => {
      await NexusKernel.initialize();
      setKernelReady(true);
      
      // Start Integrity Monitor after Kernel is ready
      unsubscribeIntegrity = IntegrityService.monitorIntegrity((detectedDrift) => {
        setDrift(detectedDrift);
        setShowDriftAlert(true);
        setTimeout(() => setShowDriftAlert(false), 5000);
      });
    };

    init();

    // 2. Offline Monitor
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 3. Auth Persistence Check (Cookie Issue Mitigation)
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (!user) {
        console.warn('Auth: No session found. This may be due to third-party cookie restrictions in Safari/iOS.');
      }
    }, (error) => {
      if (error.message.includes('cookies')) {
        setAuthError('COOKIE_BLOCKED');
      }
    });

    return () => {
      if (unsubscribeIntegrity) unsubscribeIntegrity();
      unsubscribeAuth();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSignIn = async () => {
    try {
      await signIn();
      setAuthError(null);
    } catch (error: any) {
      console.error('Sign-in failed:', error);
      if (error.code === 'auth/popup-blocked') {
        setAuthError('POPUP_BLOCKED');
      } else {
        setAuthError('GENERAL_ERROR');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-blue-500/30">
      {/* System Alerts */}
      <div className="fixed top-0 left-0 right-0 z-[100] flex flex-col">
        {isOffline && (
          <div className="bg-orange-500 text-white text-[10px] font-black tracking-widest uppercase py-1.5 flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top duration-500">
            <WifiOff className="w-3 h-3" />
            OFFLINE MODE // DATA WILL SYNC WHEN RECONNECTED
          </div>
        )}
        {showDriftAlert && (
          <div className="bg-red-600 text-white text-[10px] font-black tracking-widest uppercase py-1.5 flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top duration-500">
            <ShieldCheck className="w-3 h-3" />
            CRITICAL DRIFT DETECTED ({(drift * 100).toFixed(1)}%) // SELF-HEALING INITIATED
          </div>
        )}
        {authError === 'COOKIE_BLOCKED' && (
          <div className="bg-blue-600 text-white text-[10px] font-black tracking-widest uppercase py-2 px-4 flex items-center justify-between animate-in fade-in slide-in-from-top duration-500">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3 h-3" />
              <span>AUTH BLOCKED BY BROWSER // PLEASE ENABLE "ALLOW CROSS-WEBSITE TRACKING" IN SETTINGS</span>
            </div>
            <button onClick={handleSignIn} className="bg-white text-black px-3 py-1 rounded-lg font-black text-[9px]">RE-AUTHENTICATE</button>
          </div>
        )}
      </div>
      {/* Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 pt-safe pb-4 bg-gradient-to-b from-[#050505] to-transparent">
        <div className="max-w-7xl mx-auto flex items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-lg shadow-white/10">
              <Cpu className="w-5 h-5 text-black" />
            </div>
            <span className="text-xl font-black tracking-tighter italic uppercase hidden sm:block">NAIS</span>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-2xl shadow-2xl">
            <button
              onClick={() => setView('dashboard')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all duration-300 ${
                view === 'dashboard' ? 'bg-white text-black shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              DASHBOARD
            </button>
            <button
              onClick={() => setView('pitch')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all duration-300 ${
                view === 'pitch' ? 'bg-white text-black shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              <Presentation className="w-3.5 h-3.5" />
              PITCH DECK
            </button>
            <button
              onClick={() => setView('research')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all duration-300 ${
                view === 'research' ? 'bg-white text-black shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              RESEARCH
            </button>
            <button
              onClick={() => setView('manual')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all duration-300 ${
                view === 'manual' ? 'bg-white text-black shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              MANUAL
            </button>
            <button
              onClick={() => setView('settings')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all duration-300 ${
                view === 'settings' ? 'bg-white text-black shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              <SettingsIcon className="w-3.5 h-3.5" />
              SETTINGS
            </button>
          </div>

          <div className="hidden lg:block">
            <span className="text-[10px] font-mono text-white/40 tracking-widest uppercase">
              v2.5.0-STABLE // CORE_ACTIVE
            </span>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative pt-32 pb-20 px-6 max-w-7xl mx-auto">
        {view === 'dashboard' && <Dashboard />}
        {view === 'pitch' && <PitchDeck />}
        {view === 'research' && <ResearchPanel />}
        {view === 'settings' && <Settings />}
        {view === 'manual' && <Manual />}
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 p-4 pointer-events-none">
        <div className="max-w-7xl mx-auto flex justify-between items-end">
          <div className="space-y-1">
            <p className="text-[10px] font-mono text-white/20 uppercase tracking-tighter">
              Nexorian Advanced Intelligence Suite
            </p>
            <p className="text-[10px] font-mono text-white/20 uppercase tracking-tighter">
              © 2026 Nexorian Systems Inc.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
