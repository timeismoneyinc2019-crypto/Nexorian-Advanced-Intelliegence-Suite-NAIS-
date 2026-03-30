import React from 'react';
import { cn } from '@/src/lib/utils';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className, hover = true }) => {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-3xl transition-all duration-500",
        hover && "hover:border-white/20 hover:bg-white/[0.06] hover:shadow-2xl hover:shadow-white/[0.02]",
        className
      )}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-white/5 to-transparent opacity-50" />
      {children}
    </div>
  );
};
