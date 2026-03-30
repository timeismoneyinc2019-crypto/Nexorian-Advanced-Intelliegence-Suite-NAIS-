import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, 
  TrendingUp, 
  Zap, 
  ShieldCheck, 
  RefreshCcw, 
  Database,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  LogIn,
  LogOut,
  Target,
  DollarSign,
  Clock,
  Save
} from 'lucide-react';
import { GlassCard } from './GlassCard';
import { generatePrediction, analyzeNervousSystem, fetchLiveSignals, generateDecision } from '../services/gemini';
import { Industry, SystemState, Decision } from '../types';
import { cn } from '@/src/lib/utils';
import { auth, db, signIn, signOut, handleFirestoreError, OperationType } from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, addDoc, onSnapshot, query, orderBy, limit, doc, setDoc, getDoc } from 'firebase/firestore';

const INDUSTRIES: Industry[] = ['Agriculture', 'Logistics', 'Energy', 'Infrastructure', 'Healthcare', 'Cybersecurity', 'Defense'];

export const Dashboard: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [selectedIndustry, setSelectedIndustry] = useState<Industry>('Agriculture');
  const [state, setState] = useState<SystemState>({ timestamp: Date.now(), value: 75, drift: 0.5, uncertainty: 0.1 });
  const [prediction, setPrediction] = useState<any>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [nervousAnalysis, setNervousAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingDecision, setLoadingDecision] = useState(false);
  const [analyzingNervous, setAnalyzingNervous] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [weights, setWeights] = useState({ accuracy: 0.85, efficiency: 0.92, risk: 0.05 });
  const [isAuthReady, setIsAuthReady] = useState(false);

  const stateStack = useRef<SystemState[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
      if (u) addLog(`Authenticated as ${u.email}`);
    });
    return () => unsubscribe();
  }, []);

  // Real-time Data Feed Integration
  useEffect(() => {
    const interval = setInterval(async () => {
      const signals = await fetchLiveSignals(selectedIndustry);
      
      // Calculate efficiency based on real signals
      let value = 75;
      if (selectedIndustry === 'Agriculture' && signals.temperature) {
        // Simple logic: optimal temp is 20-25C
        const temp = signals.temperature;
        value = 100 - Math.abs(temp - 22.5) * 2;
      } else {
        value = Math.max(0, Math.min(100, state.value + (Math.random() - 0.5) * 5));
      }

      const newState: SystemState = {
        timestamp: Date.now(),
        value,
        drift: Math.random() * 2,
        uncertainty: Math.random() * 0.2,
        raw_data: signals
      };

      setState(newState);
      stateStack.current.push(newState);
      if (stateStack.current.length > 50) stateStack.current.shift();

      // Persist state to Firestore if authenticated
      if (user) {
        try {
          await addDoc(collection(db, `systems/${selectedIndustry}/states`), newState);
        } catch (e) {
          // Silent fail for background telemetry to avoid spamming UI
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [state, selectedIndustry, user]);

  // Sync Weights from Firestore
  useEffect(() => {
    if (!user || !isAuthReady) return;

    const q = doc(db, `systems/${selectedIndustry}/weights`, 'current');
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.exists()) {
        setWeights(snapshot.data() as any);
        addLog(`Learning weights synchronized for ${selectedIndustry}`);
      } else {
        // Initialize default weights if they don't exist
        const defaultWeights = { accuracy: 0.85, efficiency: 0.92, risk: 0.05, updatedAt: Date.now() };
        try {
          await setDoc(q, defaultWeights);
          setWeights(defaultWeights);
          addLog(`Initialized default weights for ${selectedIndustry}`);
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, `systems/${selectedIndustry}/weights/current`);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `systems/${selectedIndustry}/weights/current`);
    });

    return () => unsubscribe();
  }, [selectedIndustry, user, isAuthReady]);

  const saveWeights = async (newWeights: typeof weights) => {
    if (!user) return;
    try {
      await setDoc(doc(db, `systems/${selectedIndustry}/weights`, 'current'), {
        ...newWeights,
        updatedAt: Date.now()
      });
      addLog(`Manual weight adjustment saved for ${selectedIndustry}`);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `systems/${selectedIndustry}/weights/current`);
    }
  };

  const runPrediction = async () => {
    if (!user) {
      addLog("Authentication required for prediction execution.");
      return;
    }
    setLoading(true);
    addLog(`Initiating Prediction Layer for ${selectedIndustry}...`);
    try {
      const result = await generatePrediction(selectedIndustry, state);
      setPrediction(result);
      addLog(`Prediction received: ${result.prediction}`);
      
      // Trigger Decision Engine
      setLoadingDecision(true);
      addLog(`Initiating Decision Engine for ${selectedIndustry}...`);
      const decisionResult = await generateDecision(selectedIndustry, state, result, weights);
      setDecision(decisionResult);
      addLog(`Decision generated: ${decisionResult.action}`);
      setLoadingDecision(false);
      
      // Update weights in Firestore (Learning Loop)
      const reward = Math.random() > 0.2 ? 1 : -1;
      const newWeights = {
        accuracy: Math.min(1, Math.max(0, weights.accuracy + reward * 0.01)),
        efficiency: Math.min(1, Math.max(0, weights.efficiency + reward * 0.005)),
        risk: weights.risk,
        updatedAt: Date.now()
      };
      
      await setDoc(doc(db, `systems/${selectedIndustry}/weights`, 'current'), newWeights);
      addLog(`Feedback loop processed. Weights updated in Firestore.`);

    } catch (e) {
      addLog(`Error in Engine: ${e}`);
    } finally {
      setLoading(false);
      setLoadingDecision(false);
    }
  };

  const runNervousAnalysis = async () => {
    setAnalyzingNervous(true);
    addLog("Deep Nervous System Analysis initiated...");
    try {
      const result = await analyzeNervousSystem(state, logs);
      setNervousAnalysis(result);
      addLog(`Self-Healing Action Recommended: ${result.healingAction}`);
    } catch (e) {
      addLog(`Nervous System Error: ${e}`);
    } finally {
      setAnalyzingNervous(false);
    }
  };

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 10));
  };

  return (
    <div className="min-h-screen pt-32 pb-12 px-6 sm:px-12 max-w-7xl mx-auto space-y-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-black tracking-[0.3em] text-white/40 uppercase">System Operational</span>
          </div>
          <h1 className="text-5xl sm:text-8xl font-black tracking-tighter italic uppercase leading-[0.85]">
            Nexus<br />
            <span className="text-white/20">Dashboard</span>
          </h1>
        </div>
        <div className="flex flex-col items-start md:items-end gap-2">
          <p className="text-[10px] font-mono text-white/40 uppercase tracking-[0.2em]">Predictive Coordination Layer</p>
          <div className="h-px w-32 bg-gradient-to-r from-transparent to-white/20" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
      {/* Sidebar - Industry Adapters */}
      <div className="lg:col-span-3 space-y-4">
        <GlassCard className="p-4 mb-4" hover={false}>
          {user ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src={user.photoURL || ''} className="w-8 h-8 rounded-full border border-white/20" alt="User" referrerPolicy="no-referrer" />
                <div className="overflow-hidden">
                  <p className="text-[10px] font-bold text-white truncate">{user.displayName}</p>
                  <p className="text-[8px] text-white/40 truncate uppercase tracking-widest">Operator</p>
                </div>
              </div>
              <button onClick={signOut} className="p-2 rounded-lg hover:bg-white/10 text-white/40">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button 
              onClick={signIn}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white text-black text-xs font-bold hover:bg-white/90 transition-all"
            >
              <LogIn className="w-4 h-4" />
              CONNECT OPERATOR
            </button>
          )}
        </GlassCard>

        <h3 className="text-sm font-semibold uppercase tracking-wider text-white/50 px-2">Industry Adapters</h3>
        {INDUSTRIES.map(ind => (
          <button
            key={ind}
            onClick={() => setSelectedIndustry(ind)}
            className={cn(
              "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200",
              selectedIndustry === ind 
                ? "bg-white/20 border border-white/30 text-white shadow-lg" 
                : "text-white/60 hover:bg-white/5 border border-transparent"
            )}
          >
            <span className="text-sm font-medium">{ind}</span>
            {selectedIndustry === ind && <ChevronRight className="w-4 h-4" />}
          </button>
        ))}
      </div>

      {/* Main Engine View */}
      <div className="lg:col-span-6 space-y-6">
        <GlassCard className="relative overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Core State Engine</h2>
                <p className="text-xs text-white/40">Real-time System Telemetry</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-mono text-green-500 uppercase tracking-widest">Live Feed</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-white/40">Efficiency</p>
              <p className="text-2xl font-mono font-bold text-white">{state.value.toFixed(1)}%</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-white/40">System Drift</p>
              <p className="text-2xl font-mono font-bold text-orange-400">+{state.drift.toFixed(2)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-white/40">Uncertainty</p>
              <p className="text-2xl font-mono font-bold text-blue-400">±{state.uncertainty.toFixed(3)}</p>
            </div>
          </div>

          {/* Live Signal Metadata */}
          {state.raw_data && (
            <div className="mb-6 p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                {state.raw_data.temperature && (
                  <div className="text-[10px] font-mono text-white/60">
                    TEMP: <span className="text-white">{state.raw_data.temperature}°C</span>
                  </div>
                )}
                {state.raw_data.humidity && (
                  <div className="text-[10px] font-mono text-white/60">
                    HUMID: <span className="text-white">{state.raw_data.humidity}%</span>
                  </div>
                )}
              </div>
              <div className="text-[8px] font-mono text-white/20 uppercase tracking-widest">
                {state.raw_data.source}
              </div>
            </div>
          )}

          {/* Simulated Waveform */}
          <div className="h-32 w-full flex items-end gap-1 px-2">
            {stateStack.current.slice(-30).map((s, i) => (
              <motion.div
                key={s.timestamp}
                initial={{ height: 0 }}
                animate={{ height: `${s.value}%` }}
                className="flex-1 bg-gradient-to-t from-blue-500/40 to-blue-400/10 rounded-t-sm"
              />
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Prediction Layer</h2>
                <p className="text-xs text-white/40">Probabilistic Forecasting</p>
              </div>
            </div>
            <button
              onClick={runPrediction}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-white text-black text-xs font-bold hover:bg-white/90 disabled:opacity-50 transition-colors"
            >
              {loading ? "Processing..." : "Run Analysis"}
            </button>
          </div>

          <AnimatePresence mode="wait">
            {prediction ? (
              <motion.div
                key="prediction"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-orange-400" />
                    <span className="text-xs font-bold text-orange-400 uppercase">Forecasted Event</span>
                  </div>
                  <p className="text-sm text-white/80 leading-relaxed">{prediction.prediction}</p>
                </div>
                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-green-400" />
                    <span className="text-xs font-bold text-green-400 uppercase">Recommended Action</span>
                  </div>
                  <p className="text-sm text-white/80 leading-relaxed font-medium">{prediction.action}</p>
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-white/40">
                  <span>CONFIDENCE: {(prediction.probability * 100).toFixed(0)}%</span>
                  <span>MODEL: NEXUS-V2.5-PRO</span>
                </div>
              </motion.div>
            ) : (
              <div className="h-40 flex flex-col items-center justify-center text-white/20 space-y-2">
                <Database className="w-8 h-8 opacity-20" />
                <p className="text-sm italic">Awaiting signal ingestion...</p>
              </div>
            )}
          </AnimatePresence>
        </GlassCard>

        {/* Decision Layer */}
        <GlassCard>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20 text-green-400">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Decision Layer</h2>
                <p className="text-xs text-white/40">Autonomous Optimization Engine</p>
              </div>
            </div>
            {loadingDecision && (
              <div className="flex items-center gap-2">
                <RefreshCcw className="w-3 h-3 text-green-400 animate-spin" />
                <span className="text-[10px] text-green-400 font-mono uppercase">Optimizing...</span>
              </div>
            )}
          </div>

          <AnimatePresence mode="wait">
            {decision ? (
              <motion.div
                key="decision"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6"
              >
                <div className="p-6 rounded-[2rem] bg-white text-black shadow-2xl shadow-white/10">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-5 h-5 text-black" />
                    <span className="text-xs font-black uppercase tracking-widest">Final Execution Directive</span>
                  </div>
                  <p className="text-2xl font-black tracking-tight leading-tight mb-4 italic uppercase">
                    {decision.action}
                  </p>
                  
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-black/10">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-[10px] font-black text-black/40 uppercase">
                        <DollarSign className="w-3 h-3" />
                        Cost
                      </div>
                      <p className="text-sm font-mono font-bold">${decision.cost.toLocaleString()}</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-[10px] font-black text-black/40 uppercase">
                        <ShieldCheck className="w-3 h-3" />
                        Risk
                      </div>
                      <p className={cn(
                        "text-sm font-bold uppercase tracking-tighter",
                        decision.risk === 'Low' ? 'text-green-600' : 
                        decision.risk === 'Medium' ? 'text-orange-600' : 'text-red-600'
                      )}>
                        {decision.risk}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-[10px] font-black text-black/40 uppercase">
                        <Activity className="w-3 h-3" />
                        Impact
                      </div>
                      <p className="text-sm font-mono font-bold">{(decision.impact * 100).toFixed(1)}%</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3 text-white/20" />
                    <span className="text-[10px] font-mono text-white/20 uppercase tracking-widest">Execution Window: Immediate</span>
                  </div>
                  <button className="text-[10px] font-black text-white/40 hover:text-white transition-colors uppercase tracking-[0.2em]">
                    Override Logic // Manual
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center text-white/10 border-2 border-dashed border-white/5 rounded-[2rem]">
                <Target className="w-10 h-10 mb-3 opacity-20" />
                <p className="text-xs uppercase tracking-[0.3em] font-black">Awaiting Decision Logic</p>
              </div>
            )}
          </AnimatePresence>
        </GlassCard>
      </div>

      {/* Right Column - Feedback & Logs */}
      <div className="lg:col-span-3 space-y-6">
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest">Feedback Loop</h3>
            <button 
              onClick={() => saveWeights(weights)}
              disabled={!user}
              className="p-1 rounded-md hover:bg-white/10 text-blue-400 disabled:opacity-20 transition-colors"
              title="Save Weights to Firestore"
            >
              <Save className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-4">
            {['accuracy', 'efficiency', 'risk'].map((key) => {
              const val = (weights as any)[key] || 0;
              return (
                <div key={key} className="space-y-2">
                  <div className="flex justify-between text-[10px] text-white/60 uppercase">
                    <span>{key}</span>
                    <span>{(val * 100).toFixed(1)}%</span>
                  </div>
                  <input 
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={val}
                    disabled={!user}
                    onChange={(e) => {
                      const newVal = parseFloat(e.target.value);
                      setWeights(prev => ({ ...prev, [key]: newVal }));
                    }}
                    className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-blue-400 disabled:cursor-not-allowed"
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-6 p-3 rounded-lg bg-white/5 flex items-center gap-3">
            <RefreshCcw className="w-4 h-4 text-blue-400 animate-spin-slow" />
            <span className="text-[10px] text-white/60">
              {user ? "Manual Override Enabled" : "Continuous Retraining Active"}
            </span>
          </div>
        </GlassCard>

        <GlassCard className="h-[300px] flex flex-col">
          <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4">System Logs</h3>
          <div className="flex-1 overflow-y-auto space-y-2 font-mono text-[10px]">
            {logs.map((log, i) => (
              <div key={i} className="text-white/40 border-l border-white/10 pl-2">
                {log}
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest">Nervous System</h3>
            <button 
              onClick={runNervousAnalysis}
              disabled={analyzingNervous}
              className="p-1 rounded-md hover:bg-white/10 text-white/40 transition-colors"
            >
              <RefreshCcw className={cn("w-4 h-4", analyzingNervous && "animate-spin")} />
            </button>
          </div>
          
          <AnimatePresence mode="wait">
            {nervousAnalysis ? (
              <motion.div
                key="nervous"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-3"
              >
                <div className="text-[10px] text-blue-400 font-mono leading-tight">
                  {nervousAnalysis.analysis}
                </div>
                <div className="p-2 rounded bg-blue-500/10 border border-blue-500/20 text-[9px] text-white/60 italic">
                  HEALING: {nervousAnalysis.healingAction}
                </div>
              </motion.div>
            ) : (
              <div className="flex flex-col items-center justify-center h-24 text-white/10">
                <ShieldCheck className="w-6 h-6 mb-2" />
                <span className="text-[10px] uppercase tracking-widest">Deep Scan Ready</span>
              </div>
            )}
          </AnimatePresence>

          {/* Nervous System Pulse Effect */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-blue-500/5 blur-[40px] rounded-full animate-pulse" />
          </div>
        </GlassCard>
      </div>
    </div>
  </div>
);
};
