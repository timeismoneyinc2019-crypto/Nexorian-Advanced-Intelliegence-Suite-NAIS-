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
  Save,
  Cpu,
  Lock
} from 'lucide-react';
import { GlassCard } from './GlassCard';
import { generatePrediction, analyzeNervousSystem, fetchLiveSignals, generateDecision } from '../services/gemini';
import { Industry, SystemState, Decision } from '../types';
import { cn } from '@/src/lib/utils';
import { auth, db, signIn, signOut, handleFirestoreError, OperationType } from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, addDoc, onSnapshot, query, orderBy, limit, doc, setDoc, getDoc } from 'firebase/firestore';
import { NexusKernel } from '../services/nexusKernel';

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
  const [kernelStats, setKernelStats] = useState({ epoch: 0, energy: 0, hash: '' });
  const [geminiApiKey, setGeminiApiKey] = useState<string | null>(null);
  const [proactiveMemories, setProactiveMemories] = useState<any[]>([]);

  const stateStack = useRef<SystemState[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setIsAuthReady(true);
      if (u) {
        addLog(`Authenticated as ${u.email}`);
        // Fetch Gemini API Key
        const settingsDoc = await getDoc(doc(db, 'userSettings', u.uid));
        if (settingsDoc.exists()) {
          setGeminiApiKey(settingsDoc.data().geminiApiKey || null);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Real-time Data Feed Integration
  useEffect(() => {
    const interval = setInterval(async () => {
      const signals = await fetchLiveSignals(selectedIndustry);
      
      // Calculate efficiency based on real signals
      let value = 75;
      if (selectedIndustry === 'Agriculture') {
        const temp = signals.temperature || 22.5;
        value = 100 - Math.abs(temp - 22.5) * 2;
      } else if (selectedIndustry === 'Logistics') {
        value = signals.fleetUtilization || 85;
      } else if (selectedIndustry === 'Energy') {
        value = 100 - (Math.abs((signals.gridLoad || 75) - 75));
      } else if (selectedIndustry === 'Cybersecurity') {
        value = 100 - ((signals.breachAttempts || 0) * 10);
      } else if (selectedIndustry === 'Defense') {
        value = signals.assetReadiness || 95;
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

      // Update Kernel Stats
      setKernelStats({
        epoch: NexusKernel.getEpoch(),
        energy: NexusKernel.getEnergy(),
        hash: NexusKernel.getLastHash()
      });

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
  }, [selectedIndustry, user, state.value]);

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

  // Sync Proactive Memories from Firestore
  useEffect(() => {
    if (!user || !isAuthReady) return;

    const q = query(
      collection(db, `systems/${selectedIndustry}/memory`),
      orderBy('timestamp', 'desc'),
      limit(5)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const memories = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setProactiveMemories(memories);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `systems/${selectedIndustry}/memory`);
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
      const result = await generatePrediction(selectedIndustry, state, geminiApiKey || undefined);
      setPrediction(result);
      addLog(`Prediction received: ${result.prediction}`);
      
      // Trigger Decision Engine
      setLoadingDecision(true);
      addLog(`Initiating Decision Engine for ${selectedIndustry}...`);
      const decisionResult = await generateDecision(selectedIndustry, state, result, weights, geminiApiKey || undefined);
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

      // Proactive Memory Integration
      // If a spike was detected in raw_data, save it to memory for future proactive adjustment
      if (state.raw_data?.xFactorDetected && state.raw_data.xFactorDetected !== 'None') {
        addLog(`CRITICAL: X-Factor "${state.raw_data.xFactorDetected}" detected. Archiving to Proactive Memory...`);
        try {
          await addDoc(collection(db, `systems/${selectedIndustry}/memory`), {
            industry: selectedIndustry,
            xFactor: state.raw_data.xFactorDetected,
            spikeType: selectedIndustry === 'Energy' ? 'Energy Spike' : 'System Anomaly',
            adjustment: decisionResult.proactiveAdjustment || 'Automatic Parameter Recalibration',
            timestamp: Date.now(),
            impactScore: decisionResult.impact || 0.9
          });
          addLog("Proactive Memory archived. System will now self-adjust when this factor recurs.");
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, `systems/${selectedIndustry}/memory`);
        }
      }

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
      const result = await analyzeNervousSystem(state, logs, geminiApiKey || undefined);
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
            NAIS<br />
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
                <h2 className="text-xl font-bold text-white">NAIS Core Engine</h2>
                <p className="text-xs text-white/40">Real-time System Telemetry</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {selectedIndustry === 'Energy' && (
                <button
                  onClick={() => {
                    const spikeState = {
                      ...state,
                      raw_data: {
                        ...state.raw_data,
                        gridLoad: 98.5,
                        xFactorDetected: 'Solar Flare Interference + Thermal Peak'
                      }
                    };
                    setState(spikeState);
                    addLog("SIMULATION: Triggering Critical Energy Spike (X-Factor)...");
                  }}
                  className="px-3 py-1 rounded-full border border-red-500/30 bg-red-500/10 text-red-400 text-[8px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all"
                >
                  Simulate Spike
                </button>
              )}
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-mono text-green-500 uppercase tracking-widest">Live Feed</span>
              </div>
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

          {/* Industry-Specific Visualizations */}
          <div className="mb-6 h-48 rounded-2xl bg-black/40 border border-white/10 overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5" />
            
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedIndustry}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="absolute inset-0 flex items-center justify-center p-8"
              >
                {selectedIndustry === 'Agriculture' && (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                    <div className="relative w-32 h-32">
                      <svg className="w-full h-full" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                        <motion.circle 
                          cx="50" cy="50" r="45" fill="none" stroke="#60A5FA" strokeWidth="10" 
                          strokeDasharray="283"
                          animate={{ strokeDashoffset: 283 - (283 * (state.raw_data.soilMoisture || 0)) / 100 }}
                          strokeLinecap="round"
                          transform="rotate(-90 50 50)"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-black text-white">{(state.raw_data.soilMoisture || 0).toFixed(0)}%</span>
                        <span className="text-[8px] text-white/40 uppercase">Soil Health</span>
                      </div>
                    </div>
                  </div>
                )}

                {selectedIndustry === 'Logistics' && (
                  <div className="w-full h-full grid grid-cols-6 gap-2 opacity-40">
                    {[...Array(24)].map((_, i) => (
                      <motion.div
                        key={i}
                        animate={{ 
                          opacity: [0.2, 0.8, 0.2],
                          scale: [1, 1.2, 1]
                        }}
                        transition={{ 
                          duration: 2 + Math.random() * 2, 
                          repeat: Infinity,
                          delay: Math.random() * 2
                        }}
                        className="w-full aspect-square bg-blue-500/20 rounded-lg border border-blue-500/30"
                      />
                    ))}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                        <span className="text-xs font-black text-white uppercase tracking-widest">Fleet Grid Active</span>
                      </div>
                    </div>
                  </div>
                )}

                {selectedIndustry === 'Energy' && (
                  <div className="w-full h-full flex items-end gap-2">
                    {[...Array(12)].map((_, i) => (
                      <motion.div
                        key={i}
                        animate={{ 
                          height: [`${30 + Math.random() * 40}%`, `${50 + Math.random() * 50}%`, `${30 + Math.random() * 40}%`]
                        }}
                        transition={{ 
                          duration: 1.5, 
                          repeat: Infinity,
                          delay: i * 0.1
                        }}
                        className="flex-1 bg-gradient-to-t from-yellow-500/40 to-yellow-400/10 rounded-t-lg border-t border-yellow-500/30"
                      />
                    ))}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-black text-white uppercase tracking-widest bg-black/60 px-4 py-2 rounded-full border border-white/10">Grid Load Real-time</span>
                    </div>
                  </div>
                )}

                {selectedIndustry === 'Cybersecurity' && (
                  <div className="w-full h-full relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-32 h-32 rounded-full border border-red-500/20 animate-ping" />
                      <div className="w-24 h-24 rounded-full border border-red-500/40 animate-pulse absolute" />
                      <div className="w-16 h-16 rounded-full border border-red-500/60 absolute" />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-black text-red-400 uppercase tracking-widest">Threat Radar</span>
                    </div>
                  </div>
                )}

                {selectedIndustry === 'Infrastructure' && (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="relative w-48 h-32 border-2 border-blue-500/20 rounded-lg overflow-hidden">
                      <div className="absolute inset-0 grid grid-cols-8 grid-rows-4">
                        {[...Array(32)].map((_, i) => (
                          <div key={i} className="border-[0.5px] border-blue-500/10" />
                        ))}
                      </div>
                      <motion.div 
                        animate={{ opacity: [0.3, 0.6, 0.3] }}
                        transition={{ duration: 3, repeat: Infinity }}
                        className="absolute inset-x-4 top-1/2 h-1 bg-blue-400/40 shadow-[0_0_10px_rgba(96,165,250,0.5)]" 
                      />
                      <div className="absolute top-2 left-2 text-[8px] font-mono text-blue-400 uppercase">Structural Stress Analysis</div>
                    </div>
                  </div>
                )}

                {selectedIndustry === 'Healthcare' && (
                  <div className="w-full h-full flex items-center justify-center gap-1">
                    {[...Array(40)].map((_, i) => (
                      <motion.div
                        key={i}
                        animate={{ 
                          height: [
                            `${20 + Math.sin(i * 0.5) * 10}%`, 
                            `${40 + Math.sin(i * 0.5 + 1) * 20}%`, 
                            `${20 + Math.sin(i * 0.5) * 10}%`
                          ]
                        }}
                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.02 }}
                        className="w-1 bg-green-500/40 rounded-full"
                      />
                    ))}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-black text-green-400 uppercase tracking-widest bg-black/60 px-4 py-2 rounded-full border border-white/10">Vital Monitoring</span>
                    </div>
                  </div>
                )}

                {selectedIndustry === 'Defense' && (
                  <div className="w-full h-full relative flex items-center justify-center">
                    <div className="w-40 h-40 rounded-full border border-white/5 relative overflow-hidden">
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 bg-gradient-to-tr from-transparent via-transparent to-green-500/20 origin-center"
                      />
                      <div className="absolute inset-0 border border-white/10 rounded-full" />
                      <div className="absolute inset-8 border border-white/5 rounded-full" />
                      <div className="absolute inset-16 border border-white/5 rounded-full" />
                    </div>
                    <div className="absolute flex flex-col items-center">
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">Perimeter Secure</span>
                    </div>
                  </div>
                )}

                {!['Agriculture', 'Logistics', 'Energy', 'Cybersecurity', 'Infrastructure', 'Healthcare', 'Defense'].includes(selectedIndustry) && (
                  <div className="text-white/20 italic text-sm">Standard Telemetry Visualization Active</div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Industry-Specific Telemetry */}
          {state.raw_data && (
            <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {selectedIndustry === 'Agriculture' && (
                <>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-[8px] text-white/40 uppercase mb-1">Soil Moisture</p>
                    <p className="text-sm font-mono text-white">{(state.raw_data.soilMoisture || 0).toFixed(1)}%</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-[8px] text-white/40 uppercase mb-1">PH Level</p>
                    <p className="text-sm font-mono text-white">{(state.raw_data.phLevel || 0).toFixed(2)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-[8px] text-white/40 uppercase mb-1">Temp</p>
                    <p className="text-sm font-mono text-white">{(state.raw_data.temperature || 0)}°C</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-[8px] text-white/40 uppercase mb-1">Humidity</p>
                    <p className="text-sm font-mono text-white">{(state.raw_data.humidity || 0)}%</p>
                  </div>
                </>
              )}
              {selectedIndustry === 'Logistics' && (
                <>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-[8px] text-white/40 uppercase mb-1">Fleet Util</p>
                    <p className="text-sm font-mono text-white">{(state.raw_data.fleetUtilization || 0).toFixed(1)}%</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-[8px] text-white/40 uppercase mb-1">Latency</p>
                    <p className="text-sm font-mono text-white">{(state.raw_data.deliveryLatency || 0).toFixed(1)}ms</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-[8px] text-white/40 uppercase mb-1">Efficiency</p>
                    <p className="text-sm font-mono text-white">{(state.raw_data.fuelEfficiency || 0).toFixed(1)}%</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-[8px] text-white/40 uppercase mb-1">Routes</p>
                    <p className="text-sm font-mono text-white">{(state.raw_data.activeRoutes || 0)}</p>
                  </div>
                </>
              )}
              {selectedIndustry === 'Energy' && (
                <>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-[8px] text-white/40 uppercase mb-1">Grid Load</p>
                    <p className="text-sm font-mono text-white">{(state.raw_data.gridLoad || 0).toFixed(1)}%</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-[8px] text-white/40 uppercase mb-1">Renewable</p>
                    <p className="text-sm font-mono text-white">{(state.raw_data.renewableMix || 0).toFixed(1)}%</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-[8px] text-white/40 uppercase mb-1">Storage</p>
                    <p className="text-sm font-mono text-white">{(state.raw_data.storageCapacity || 0).toFixed(1)}%</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-[8px] text-white/40 uppercase mb-1">Freq</p>
                    <p className="text-sm font-mono text-white">{(state.raw_data.frequency || 0).toFixed(2)}Hz</p>
                  </div>
                </>
              )}
              {selectedIndustry === 'Cybersecurity' && (
                <>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-[8px] text-white/40 uppercase mb-1">Threat</p>
                    <p className="text-sm font-mono text-white">{(state.raw_data.threatLevel || 'Low')}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-[8px] text-white/40 uppercase mb-1">Latency</p>
                    <p className="text-sm font-mono text-white">{(state.raw_data.packetLatency || 0).toFixed(1)}ms</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-[8px] text-white/40 uppercase mb-1">Breaches</p>
                    <p className="text-sm font-mono text-white">{(state.raw_data.breachAttempts || 0)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-[8px] text-white/40 uppercase mb-1">AES</p>
                    <p className="text-sm font-mono text-white">{(state.raw_data.encryptionStrength || 256)}</p>
                  </div>
                </>
              )}
              {selectedIndustry === 'Infrastructure' && (
                <>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-[8px] text-white/40 uppercase mb-1">Integrity</p>
                    <p className="text-sm font-mono text-white">{(state.raw_data.structuralIntegrity || 0).toFixed(1)}%</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-[8px] text-white/40 uppercase mb-1">Traffic</p>
                    <p className="text-sm font-mono text-white">{(state.raw_data.trafficFlow || 0).toFixed(1)}%</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-[8px] text-white/40 uppercase mb-1">Priority</p>
                    <p className="text-sm font-mono text-white">{(state.raw_data.maintenancePriority || 'Low')}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-[8px] text-white/40 uppercase mb-1">Vibration</p>
                    <p className="text-sm font-mono text-white">{(state.raw_data.vibrationLevel || 0).toFixed(3)}g</p>
                  </div>
                </>
              )}
              {selectedIndustry === 'Healthcare' && (
                <>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-[8px] text-white/40 uppercase mb-1">Throughput</p>
                    <p className="text-sm font-mono text-white">{(state.raw_data.patientThroughput || 0).toFixed(0)}/h</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-[8px] text-white/40 uppercase mb-1">Resources</p>
                    <p className="text-sm font-mono text-white">{(state.raw_data.resourceAllocation || 0)}%</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-[8px] text-white/40 uppercase mb-1">Capacity</p>
                    <p className="text-sm font-mono text-white">{(state.raw_data.criticalCareCapacity || 0).toFixed(0)}%</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-[8px] text-white/40 uppercase mb-1">Wait Time</p>
                    <p className="text-sm font-mono text-white">{(state.raw_data.avgWaitTime || 0)}m</p>
                  </div>
                </>
              )}
              {selectedIndustry === 'Defense' && (
                <>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-[8px] text-white/40 uppercase mb-1">Readiness</p>
                    <p className="text-sm font-mono text-white">{(state.raw_data.assetReadiness || 0).toFixed(1)}%</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-[8px] text-white/40 uppercase mb-1">SIGINT</p>
                    <p className="text-sm font-mono text-white">{(state.raw_data.signalIntelligence || 0)}%</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-[8px] text-white/40 uppercase mb-1">Perimeter</p>
                    <p className="text-sm font-mono text-white">{(state.raw_data.perimeterIntegrity || 0)}%</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-[8px] text-white/40 uppercase mb-1">Threats</p>
                    <p className="text-sm font-mono text-white">{(state.raw_data.activeThreats || 0)}</p>
                  </div>
                </>
              )}
              {!['Agriculture', 'Logistics', 'Energy', 'Cybersecurity', 'Infrastructure', 'Healthcare', 'Defense'].includes(selectedIndustry) && (
                <>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-[8px] text-white/40 uppercase mb-1">System Load</p>
                    <p className="text-sm font-mono text-white">{(state.raw_data.load || 0).toFixed(1)}%</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-[8px] text-white/40 uppercase mb-1">Latency</p>
                    <p className="text-sm font-mono text-white">{(state.raw_data.latency || 0).toFixed(1)}ms</p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Live Signal Metadata */}
          {state.raw_data && (
            <div className="mb-6 p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
              <div className="text-[8px] font-mono text-white/20 uppercase tracking-widest">
                SOURCE: {state.raw_data.source}
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
                  
                  {decision.proactiveAdjustment && (
                    <div className="mb-4 p-3 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 space-y-1">
                      <div className="flex items-center gap-2">
                        <RefreshCcw className="w-3 h-3 text-yellow-600 animate-spin-slow" />
                        <span className="text-[9px] font-black text-yellow-600 uppercase tracking-wider">Proactive Self-Adjustment</span>
                      </div>
                      <p className="text-[10px] text-black/70 leading-relaxed italic font-medium">
                        {decision.proactiveAdjustment}
                      </p>
                    </div>
                  )}

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
        <GlassCard className="border-blue-500/30 bg-blue-500/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-widest">NAIS Kernel</h3>
              <p className="text-[8px] text-white/40 uppercase">Deterministic Core</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <span className="text-[10px] text-white/40 uppercase">Epoch</span>
              <span className="text-lg font-mono font-bold text-white">{kernelStats.epoch}</span>
            </div>
            <div className="flex justify-between items-end">
              <span className="text-[10px] text-white/40 uppercase">Energy</span>
              <span className="text-lg font-mono font-bold text-blue-400">{kernelStats.energy.toExponential(2)} J</span>
            </div>
            <div className="pt-4 border-t border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-3 h-3 text-white/20" />
                <span className="text-[8px] text-white/40 uppercase tracking-widest">Active Ledger Hash</span>
              </div>
              <div className="p-2 rounded bg-black/40 font-mono text-[8px] text-white/60 break-all leading-tight">
                {kernelStats.hash === "0".repeat(64) ? 'INITIALIZING...' : kernelStats.hash}
              </div>
            </div>
          </div>
        </GlassCard>

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

          <div className="mt-8 pt-6 border-t border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-yellow-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-widest">Proactive Memory</h3>
              </div>
              <div className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 text-[8px] font-black uppercase tracking-widest">
                Self-Correcting
              </div>
            </div>

            <div className="space-y-3">
              {proactiveMemories.length === 0 ? (
                <div className="p-4 rounded-xl bg-white/5 border border-dashed border-white/10 text-center">
                  <p className="text-[10px] text-white/20 italic">Awaiting critical events to initiate learning...</p>
                </div>
              ) : (
                proactiveMemories.map((m, i) => (
                  <motion.div 
                    key={m.id || i}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-3 rounded-xl bg-white/5 border-l-2 border-yellow-500/50 space-y-1"
                  >
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] font-bold text-white truncate">{m.xFactor}</p>
                      <p className="text-[8px] text-white/40 font-mono">{new Date(m.timestamp).toLocaleTimeString()}</p>
                    </div>
                    <p className="text-[9px] text-white/60 leading-tight italic">"{m.adjustment}"</p>
                  </motion.div>
                ))
              )}
            </div>
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
