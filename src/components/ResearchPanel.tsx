import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Loader2, 
  ExternalLink, 
  BookOpen, 
  CheckCircle2, 
  ArrowRight,
  Sparkles,
  Globe,
  Key,
  AlertCircle,
  ChevronDown,
  FileText
} from 'lucide-react';
import { GlassCard } from './GlassCard';
import { performDeepResearch } from '../services/gemini';
import { ResearchResult } from '../types';
import { cn } from '@/src/lib/utils';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useEffect } from 'react';

const RESEARCH_TEMPLATES = [
  {
    id: 'competitor',
    name: 'Competitor Analysis',
    query: 'Perform a deep technical and market analysis of the top 3 competitors in the [Insert Industry] space. Focus on their infrastructure stack, pricing models, and recent strategic pivots.'
  },
  {
    id: 'market',
    name: 'Market Trends',
    query: 'Analyze the emerging macro-trends in [Insert Sector] for the next 18-24 months. Identify key growth drivers, regulatory headwinds, and disruptive technologies.'
  },
  {
    id: 'feasibility',
    name: 'Technology Feasibility',
    query: 'Evaluate the technical feasibility of implementing [Insert Technology] within a [Insert Context] environment. Analyze potential bottlenecks, cost-to-scale, and integration risks.'
  },
  {
    id: 'swot',
    name: 'SWOT Infrastructure',
    query: 'Conduct a comprehensive SWOT analysis of [Insert Company/Project] with a specific focus on their decision-making infrastructure and data resilience.'
  }
];

export const ResearchPanel: React.FC = () => {
  const [query, setQuery] = useState('');
  const [apiKey, setApiKey] = useState(localStorage.getItem('nexus_gemini_key') || '');
  const [showKeyInput, setShowKeyInput] = useState(!process.env.GEMINI_API_KEY && !localStorage.getItem('nexus_gemini_key'));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  useEffect(() => {
    const fetchKey = async () => {
      const user = auth.currentUser;
      if (user) {
        const settingsDoc = await getDoc(doc(db, 'userSettings', user.uid));
        if (settingsDoc.exists()) {
          const key = settingsDoc.data().geminiApiKey || '';
          if (key) {
            setApiKey(key);
            setShowKeyInput(false);
          }
        }
      }
    };
    fetchKey();
  }, []);

  const handleSelectTemplate = (templateQuery: string) => {
    setQuery(templateQuery);
    setShowTemplates(false);
  };

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      localStorage.setItem('nexus_gemini_key', apiKey.trim());
      
      const user = auth.currentUser;
      if (user) {
        try {
          await setDoc(doc(db, 'userSettings', user.uid), {
            geminiApiKey: apiKey.trim(),
            updatedAt: new Date().toISOString(),
            uid: user.uid
          }, { merge: true });
        } catch (err) {
          console.error("Failed to save key to Firestore:", err);
        }
      }
      
      setShowKeyInput(false);
    }
  };

  const handleResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const keyToUse = apiKey.trim() || process.env.GEMINI_API_KEY;
    if (!keyToUse) {
      setShowKeyInput(true);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const researchResult = await performDeepResearch(query, apiKey.trim());
      setResult(researchResult);
    } catch (err: any) {
      console.error(err);
      if (err.message === "AI_NOT_INITIALIZED") {
        setError("API Key missing or invalid. Please check your settings.");
        setShowKeyInput(true);
      } else if (err.message.includes("LICENSE")) {
        setError("Enterprise License Required. Please activate in Settings.");
      } else {
        setError("Deep Research Engine encountered an anomaly. Please re-initialize.");
      }
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
            <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black tracking-[0.3em] text-white/40 uppercase">Intelligence Layer</span>
          </div>
          <h1 className="text-5xl sm:text-8xl font-black tracking-tighter italic uppercase leading-[0.85]">
            Deep<br />
            <span className="text-white/20">Research</span>
          </h1>
        </div>
        <div className="flex flex-col items-start md:items-end gap-2">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowKeyInput(!showKeyInput)}
              className={cn(
                "p-2 rounded-xl border transition-all",
                apiKey || process.env.GEMINI_API_KEY ? "border-green-500/20 text-green-400 bg-green-500/5" : "border-red-500/20 text-red-400 bg-red-500/5"
              )}
            >
              <Key className="w-4 h-4" />
            </button>
            <p className="text-[10px] font-mono text-white/40 uppercase tracking-[0.2em]">Gemini 3.1 Pro // High-Reasoning</p>
          </div>
          <div className="h-px w-32 bg-gradient-to-r from-transparent to-white/20" />
        </div>
      </div>

      <AnimatePresence>
        {showKeyInput && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <GlassCard className="p-8 border-blue-500/30 bg-blue-500/5">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="flex-1 space-y-2">
                  <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                    <Key className="w-3 h-3 text-blue-400" />
                    Configure Intelligence Access
                  </h3>
                  <p className="text-[11px] text-white/40 leading-relaxed">
                    Enter your Gemini API key to enable Deep Research. Your key is stored locally and never leaves your browser. 
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline ml-1">Get a free key here.</a>
                  </p>
                </div>
                <form onSubmit={handleSaveKey} className="flex gap-2 w-full md:w-auto">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter Gemini API Key..."
                    className="flex-1 md:w-64 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-blue-500/50 transition-all"
                  />
                  <button
                    type="submit"
                    className="px-6 py-2 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-white/90 transition-all"
                  >
                    Authorize
                  </button>
                </form>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Input Section */}
        <div className="lg:col-span-4 space-y-6">
          <GlassCard className="p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-black text-white/40 uppercase tracking-widest">Initialize Query</h3>
              <div className="relative">
                <button
                  onClick={() => setShowTemplates(!showTemplates)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[9px] font-black text-white/60 hover:text-white hover:bg-white/10 transition-all uppercase tracking-widest"
                >
                  <FileText className="w-3 h-3" />
                  Templates
                  <ChevronDown className={cn("w-3 h-3 transition-transform", showTemplates && "rotate-180")} />
                </button>
                <AnimatePresence>
                  {showTemplates && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 top-full mt-2 w-64 z-50 p-2 rounded-2xl bg-[#0a0a0a] border border-white/10 shadow-2xl backdrop-blur-3xl"
                    >
                      {RESEARCH_TEMPLATES.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => handleSelectTemplate(t.query)}
                          className="w-full text-left p-3 rounded-xl hover:bg-white/5 text-[10px] font-bold text-white/60 hover:text-white transition-all uppercase tracking-wider"
                        >
                          {t.name}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <form onSubmit={handleResearch} className="space-y-4">
              <div className="relative">
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Enter research parameters (e.g., 'Analyze the impact of modular nuclear reactors on regional energy grids')"
                  className="w-full h-40 bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-all resize-none"
                />
                <div className="absolute bottom-4 right-4 text-[10px] font-mono text-white/20">
                  {query.length} / 500
                </div>
              </div>
              
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-medium">
                  <AlertCircle className="w-3 h-3" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-white text-black font-black text-xs uppercase tracking-widest hover:bg-white/90 disabled:opacity-50 transition-all shadow-xl shadow-white/10 active:scale-95"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing Deep Logic...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Execute Research
                  </>
                )}
              </button>
            </form>
          </GlassCard>

          <GlassCard className="p-6 bg-blue-500/5 border-blue-500/20">
            <div className="flex items-center gap-3 mb-4">
              <Globe className="w-4 h-4 text-blue-400" />
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Grounding Active</span>
            </div>
            <p className="text-[11px] text-white/60 leading-relaxed italic">
              Nexus uses real-time Google Search grounding to ensure all research is backed by the latest global data streams.
            </p>
          </GlassCard>
        </div>

        {/* Results Section */}
        <div className="lg:col-span-8 space-y-8">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-[600px] flex flex-col items-center justify-center space-y-6"
              >
                <div className="relative">
                  <div className="w-24 h-24 rounded-full border-2 border-white/5 border-t-white/40 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-white/20 animate-pulse" />
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <p className="text-xs font-black text-white uppercase tracking-[0.3em]">Synthesizing Intelligence</p>
                  <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest">Accessing Gemini 3.1 Pro Reasoning Layer</p>
                </div>
              </motion.div>
            ) : result ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                {/* Summary Card */}
                <GlassCard className="p-10 space-y-6">
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-5 h-5 text-blue-400" />
                    <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic">Executive Summary</h2>
                  </div>
                  <p className="text-lg text-white/70 leading-relaxed font-light tracking-tight">
                    {result.summary}
                  </p>
                </GlassCard>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Key Findings */}
                  <GlassCard className="p-8 space-y-6">
                    <h3 className="text-xs font-black text-white/40 uppercase tracking-widest">Key Findings</h3>
                    <div className="space-y-4">
                      {result.keyFindings.map((finding, i) => (
                        <div key={i} className="flex gap-4 group">
                          <div className="flex-shrink-0 w-6 h-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-mono text-white/40 group-hover:bg-white group-hover:text-black transition-all">
                            0{i + 1}
                          </div>
                          <p className="text-sm text-white/70 leading-snug">{finding}</p>
                        </div>
                      ))}
                    </div>
                  </GlassCard>

                  {/* Next Steps */}
                  <GlassCard className="p-8 space-y-6">
                    <h3 className="text-xs font-black text-white/40 uppercase tracking-widest">Strategic Next Steps</h3>
                    <div className="space-y-4">
                      {result.nextSteps.map((step, i) => (
                        <div key={i} className="flex items-center gap-4 group">
                          <div className="p-1.5 rounded-full bg-green-500/10 text-green-400 group-hover:bg-green-500 group-hover:text-black transition-all">
                            <CheckCircle2 className="w-3 h-3" />
                          </div>
                          <p className="text-sm text-white/70">{step}</p>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                </div>

                {/* Sources */}
                <GlassCard className="p-8">
                  <h3 className="text-xs font-black text-white/40 uppercase tracking-widest mb-6">Grounding Sources</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {result.sources.map((source, i) => (
                      <a
                        key={i}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group"
                      >
                        <div className="flex flex-col gap-1 overflow-hidden">
                          <span className="text-[10px] font-black text-white/40 uppercase tracking-widest truncate">
                            {new URL(source.url).hostname}
                          </span>
                          <span className="text-sm text-white font-medium truncate pr-4">
                            {source.title}
                          </span>
                        </div>
                        <ExternalLink className="w-4 h-4 text-white/20 group-hover:text-white transition-colors flex-shrink-0" />
                      </a>
                    ))}
                  </div>
                </GlassCard>
              </motion.div>
            ) : (
              <div className="h-[600px] flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[3rem] text-white/10 space-y-4">
                <Search className="w-12 h-12 opacity-20" />
                <div className="text-center">
                  <p className="text-sm font-black uppercase tracking-[0.3em]">Awaiting Initialization</p>
                  <p className="text-[10px] font-mono uppercase tracking-widest">Enter parameters to begin deep research</p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
