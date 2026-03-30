import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Pause, 
  ChevronLeft, 
  ChevronRight, 
  Volume2, 
  VolumeX,
  Presentation
} from 'lucide-react';
import { GlassCard } from './GlassCard';
import { getNarration } from '../services/gemini';
import { Slide } from '../types';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

const SLIDES: Slide[] = [
  {
    id: 1,
    title: "The Problem",
    content: "Critical systems today are reactive, fragmented, and inefficient. Farms waste yield, supply chains break, and energy grids destabilize because they lack real-time coordination.",
    narration: "Welcome to the future of enterprise intelligence. Today, critical systems are reactive, fragmented, and inefficient. Farms waste yield, supply chains break, and energy grids destabilize because they lack real-time coordination. This is the problem we solve."
  },
  {
    id: 2,
    title: "The Solution: NAIS",
    content: "Nexorian Advanced Intelligence Suite (NAIS) is a decision infrastructure layer that predicts and coordinates actions in real time. We turn uncertainty into actionable precision.",
    narration: "Introducing the Nexorian Advanced Intelligence Suite, or NAIS. We have built a decision infrastructure layer that predicts and coordinates actions in real time. NAIS turns uncertainty into actionable precision, providing a deterministic core for your entire operation."
  },
  {
    id: 3,
    title: "Core Architecture",
    content: "Our system ingests real-time signals, predicts near-future states, and recommends optimal actions. It's a self-healing engine that learns from every decision.",
    narration: "Our architecture is built for resilience. The system ingests real-time signals, predicts near-future states, and recommends optimal actions. It is a self-healing engine that learns from every decision, ensuring your infrastructure remains stable and efficient."
  },
  {
    id: 4,
    title: "Cross-Platform Power",
    content: "NAIS is built to run anywhere. From high-performance servers to localized edge devices, our suite provides a unified intelligence layer across your entire hardware stack.",
    narration: "NAIS is built to run anywhere. Whether on high-performance cloud servers or localized edge devices, our suite provides a unified intelligence layer across your entire hardware stack. True cross-platform power for a global enterprise."
  },
  {
    id: 5,
    title: "Expansion Path",
    content: "From Agriculture to Logistics, then Energy and Regional Systems. Our industry adapters allow us to scale without rebuilding the core engine.",
    narration: "Our expansion path is clear. From Agriculture to Logistics, then Energy and Regional Systems. Our unique industry adapters allow us to scale rapidly without ever needing to rebuild the core engine. We scale with you."
  },
  {
    id: 6,
    title: "The Vision",
    content: "We turn fragmented, reactive systems into coordinated, predictive ones. Nexorian is building the decision leverage for the next century.",
    narration: "Our vision is simple but profound. We turn fragmented, reactive systems into coordinated, predictive ones. Nexorian is building the decision leverage for the next century. Join us in defining the future of intelligence."
  }
];

export const PitchDeck: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const slide = SLIDES[currentSlide];

  useEffect(() => {
    const fetchKey = async () => {
      const user = auth.currentUser;
      if (user) {
        const settingsDoc = await getDoc(doc(db, 'userSettings', user.uid));
        if (settingsDoc.exists()) {
          setGeminiApiKey(settingsDoc.data().geminiApiKey || null);
        }
      }
    };
    fetchKey();
  }, []);

  useEffect(() => {
    if (isPlaying) {
      loadAndPlayAudio();
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }
  }, [currentSlide, isPlaying]);

  const loadAndPlayAudio = async () => {
    setLoadingAudio(true);
    try {
      const url = await getNarration(slide.narration, geminiApiKey || undefined);
      setAudioUrl(url);
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play().catch(e => console.warn("Audio play blocked:", e));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAudio(false);
    }
  };

  const nextSlide = () => setCurrentSlide(prev => (prev + 1) % SLIDES.length);
  const prevSlide = () => setCurrentSlide(prev => (prev - 1 + SLIDES.length) % SLIDES.length);

  return (
    <div className="min-h-screen pt-32 pb-12 px-6 sm:px-12 max-w-7xl mx-auto space-y-12 relative overflow-hidden">
      {/* Background Motion Video-like effect */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-30">
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 5, 0],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-transparent blur-[150px]"
        />
      </div>

      {/* Header Section */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
              <Presentation className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black tracking-[0.3em] text-white/40 uppercase">Executive Briefing</span>
          </div>
          <h1 className="text-5xl sm:text-8xl font-black tracking-tighter italic uppercase leading-[0.85]">
            NAIS<br />
            <span className="text-white/20">Presentation</span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className="p-4 rounded-2xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all backdrop-blur-xl"
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <div className="text-xs font-mono text-white/40 bg-white/5 border border-white/10 px-6 py-4 rounded-2xl backdrop-blur-xl">
            SLIDE {currentSlide + 1} // {SLIDES.length}
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto space-y-12">
        <GlassCard className="min-h-[600px] flex flex-col justify-center items-center text-center p-16 relative overflow-hidden group">
          {/* Decorative elements */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-50" />
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent opacity-50" />
          
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-12"
            >
              <div className="space-y-4">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '100px' }}
                  className="h-1 bg-blue-500 mx-auto"
                />
                <h2 className="text-6xl sm:text-9xl font-black text-white tracking-tighter uppercase italic leading-none drop-shadow-2xl">
                  {slide.title}
                </h2>
              </div>
              
              <div className="relative">
                <p className="text-2xl sm:text-3xl text-white/80 leading-tight max-w-3xl mx-auto font-light tracking-tight px-8">
                  {slide.content}
                </p>
                {/* Visual "Video" Placeholder / Animation */}
                <div className="mt-12 h-32 flex items-center justify-center gap-4">
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{ 
                        height: [20, 60, 20],
                        opacity: [0.2, 0.5, 0.2]
                      }}
                      transition={{ 
                        duration: 1.5, 
                        repeat: Infinity, 
                        delay: i * 0.2,
                        ease: "easeInOut"
                      }}
                      className="w-2 bg-blue-400/30 rounded-full"
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {loadingAudio && (
            <div className="absolute bottom-12 flex items-center gap-3 text-[10px] text-blue-400 uppercase tracking-widest font-black bg-black/40 px-4 py-2 rounded-full border border-blue-500/20 backdrop-blur-md">
              <span className="flex h-2 w-2 rounded-full bg-blue-400 animate-ping" />
              Synthesizing Vocals...
            </div>
          )}
        </GlassCard>

        <div className="flex items-center justify-center gap-12">
          <button 
            onClick={prevSlide}
            className="p-6 rounded-3xl bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:scale-105 transition-all active:scale-95 backdrop-blur-xl group"
          >
            <ChevronLeft className="w-10 h-10 group-hover:-translate-x-1 transition-transform" />
          </button>
          
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-28 h-28 rounded-[3rem] bg-white flex items-center justify-center text-black hover:scale-110 transition-all shadow-[0_0_50px_rgba(255,255,255,0.3)] active:scale-90 group"
          >
            {isPlaying ? <Pause className="w-12 h-12" /> : <Play className="w-12 h-12 ml-2" />}
          </button>

          <button 
            onClick={nextSlide}
            className="p-6 rounded-3xl bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:scale-105 transition-all active:scale-95 backdrop-blur-xl group"
          >
            <ChevronRight className="w-10 h-10 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      <audio 
        ref={audioRef} 
        muted={isMuted} 
        onEnded={() => {
          if (currentSlide < SLIDES.length - 1) {
            setTimeout(nextSlide, 1500);
          } else {
            setIsPlaying(false);
          }
        }}
      />
    </div>
  );
};
