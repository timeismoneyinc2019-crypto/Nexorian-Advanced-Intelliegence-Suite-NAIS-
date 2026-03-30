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

const SLIDES: Slide[] = [
  {
    id: 1,
    title: "The Problem",
    content: "Critical systems today are reactive, fragmented, and inefficient. Farms waste yield, supply chains break, and energy grids destabilize because they lack real-time coordination.",
    narration: "Critical systems today are reactive, fragmented, and inefficient. Farms waste yield, supply chains break, and energy grids destabilize because they lack real-time coordination."
  },
  {
    id: 2,
    title: "The Pattern",
    content: "These industries share the same core problem: They cannot coordinate decisions in real time under uncertainty. Fragmented data leads to fragmented actions.",
    narration: "These industries share the same core problem: They cannot coordinate decisions in real time under uncertainty. Fragmented data leads to fragmented actions."
  },
  {
    id: 3,
    title: "The Solution: Nexus",
    content: "We built a decision infrastructure layer that predicts and coordinates actions in real time. Nexus turns uncertainty into actionable precision.",
    narration: "We built a decision infrastructure layer that predicts and coordinates actions in real time. Nexus turns uncertainty into actionable precision."
  },
  {
    id: 4,
    title: "Core Architecture",
    content: "Our system ingests real-time signals, predicts near-future states, and recommends optimal actions. It's a self-healing engine that learns from every decision.",
    narration: "Our system ingests real-time signals, predicts near-future states, and recommends optimal actions. It's a self-healing engine that learns from every decision."
  },
  {
    id: 5,
    title: "Beachhead: Agriculture",
    content: "We start where the need is most visceral. Agriculture offers immediate ROI through waste reduction and yield optimization. Proof before scale.",
    narration: "We start where the need is most visceral. Agriculture offers immediate ROI through waste reduction and yield optimization. Proof before scale."
  },
  {
    id: 6,
    title: "Expansion Path",
    content: "From Agriculture to Logistics, then Energy and Regional Systems. Our industry adapters allow us to scale without rebuilding the core engine.",
    narration: "From Agriculture to Logistics, then Energy and Regional Systems. Our industry adapters allow us to scale without rebuilding the core engine."
  },
  {
    id: 7,
    title: "Market Opportunity",
    content: "AgTech, Logistics, and Energy combined represent a trillion-dollar coordination problem. Nexus is the infrastructure for this new economy.",
    narration: "AgTech, Logistics, and Energy combined represent a trillion-dollar coordination problem. Nexus is the infrastructure for this new economy."
  },
  {
    id: 8,
    title: "Product Strategy",
    content: "A unified core engine paired with specialized industry adapters. This modularity is our competitive moat and our scaling engine.",
    narration: "A unified core engine paired with specialized industry adapters. This modularity is our competitive moat and our scaling engine."
  },
  {
    id: 9,
    title: "Traction & ROI",
    content: "Our pilots deliver measurable ROI within 90 days. We don't sell software; we sell outcomes and system stability.",
    narration: "Our pilots deliver measurable ROI within 90 days. We don't sell software; we sell outcomes and system stability."
  },
  {
    id: 10,
    title: "Business Model",
    content: "Enterprise SaaS combined with performance-based pricing. We win when our customers optimize their critical infrastructure.",
    narration: "Enterprise SaaS combined with performance-based pricing. We win when our customers optimize their critical infrastructure."
  },
  {
    id: 11,
    title: "Competitive Advantage",
    content: "Unlike dashboards, Nexus is a decision engine. It's multi-domain, feedback-driven, and built for real-time execution.",
    narration: "Unlike dashboards, Nexus is a decision engine. It's multi-domain, feedback-driven, and built for real-time execution."
  },
  {
    id: 12,
    title: "The Vision",
    content: "We turn fragmented, reactive systems into coordinated, predictive ones. We are building the decision leverage for the next century.",
    narration: "We turn fragmented, reactive systems into coordinated, predictive ones. We are building the decision leverage for the next century."
  }
];

export const PitchDeck: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const slide = SLIDES[currentSlide];

  useEffect(() => {
    if (isPlaying) {
      loadAndPlayAudio();
    } else {
      audioRef.current?.pause();
    }
  }, [currentSlide, isPlaying]);

  const loadAndPlayAudio = async () => {
    setLoadingAudio(true);
    try {
      const url = await getNarration(slide.narration);
      setAudioUrl(url);
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
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
    <div className="min-h-screen pt-32 pb-12 px-6 sm:px-12 max-w-7xl mx-auto space-y-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Presentation className="w-4 h-4 text-blue-400" />
            <span className="text-[10px] font-black tracking-[0.3em] text-white/40 uppercase">Investor Presentation</span>
          </div>
          <h1 className="text-5xl sm:text-8xl font-black tracking-tighter italic uppercase leading-[0.85]">
            Nexus<br />
            <span className="text-white/20">Pitch Deck</span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all"
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <div className="text-xs font-mono text-white/40 bg-white/5 border border-white/10 px-4 py-3 rounded-2xl">
            {currentSlide + 1} / {SLIDES.length}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-12">
        <GlassCard className="min-h-[500px] flex flex-col justify-center items-center text-center p-12 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-10"
            >
              <h2 className="text-5xl sm:text-7xl font-black text-white tracking-tighter uppercase italic leading-none">
                {slide.title}
              </h2>
              <p className="text-xl sm:text-2xl text-white/60 leading-relaxed max-w-2xl mx-auto font-light tracking-tight">
                {slide.content}
              </p>
            </motion.div>
          </AnimatePresence>

          {loadingAudio && (
            <div className="absolute bottom-12 flex items-center gap-3 text-[10px] text-blue-400 uppercase tracking-widest font-black">
              <span className="flex h-2 w-2 rounded-full bg-blue-400 animate-ping" />
              Synthesizing Vocals...
            </div>
          )}
        </GlassCard>

        <div className="flex items-center justify-center gap-8">
          <button 
            onClick={prevSlide}
            className="p-5 rounded-3xl bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:scale-105 transition-all active:scale-95"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-24 h-24 rounded-[2.5rem] bg-white flex items-center justify-center text-black hover:scale-110 transition-all shadow-2xl shadow-white/20 active:scale-90"
          >
            {isPlaying ? <Pause className="w-10 h-10" /> : <Play className="w-10 h-10 ml-1.5" />}
          </button>

          <button 
            onClick={nextSlide}
            className="p-5 rounded-3xl bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:scale-105 transition-all active:scale-95"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </div>
      </div>

      <audio 
        ref={audioRef} 
        muted={isMuted} 
        onEnded={() => {
          if (currentSlide < SLIDES.length - 1) {
            setTimeout(nextSlide, 1000);
          } else {
            setIsPlaying(false);
          }
        }}
      />
    </div>
  );
};
