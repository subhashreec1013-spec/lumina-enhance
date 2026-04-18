import React from 'react';
import { Zap, Star, ArrowDown } from 'lucide-react';

export default function HeroSection({ onGetStarted }) {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-6">

      {/* Background glow layers */}
      <div className="absolute inset-0 bg-glow-blue opacity-60 pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(61,120,255,0.12) 0%, transparent 70%)' }} />

      {/* Floating orbital decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 pointer-events-none opacity-20">
        <div className="absolute inset-0 rounded-full border border-lumina-500/30" />
        <div className="absolute inset-8 rounded-full border border-lumina-400/20" />
        <div className="absolute inset-16 rounded-full border border-amber-400/20" />
        <div className="orbit-1 absolute top-1/2 left-1/2 w-2 h-2 -ml-1 -mt-1">
          <div className="w-2 h-2 rounded-full bg-lumina-400" />
        </div>
        <div className="orbit-2 absolute top-1/2 left-1/2 w-1.5 h-1.5 -ml-0.75 -mt-0.75">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        </div>
      </div>

      {/* Badge */}
      <div className="relative z-10 flex items-center gap-2 glass px-4 py-1.5 rounded-full mb-8 text-xs font-mono text-lumina-300 border-lumina-500/20">
        <Zap size={11} className="text-amber-400 fill-amber-400" />
        AI-Powered Enhancement Engine v1.0
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      </div>

      {/* Main heading */}
      <h1 className="relative z-10 text-center font-display font-bold leading-[0.92] tracking-tight mb-6"
        style={{ fontFamily: "'Clash Display', sans-serif" }}>
        <span className="block text-[clamp(3.5rem,10vw,8rem)] text-white">
          Lumina
        </span>
        <span className="block text-[clamp(3.5rem,10vw,8rem)]"
          style={{
            background: 'linear-gradient(135deg, #3d78ff 0%, #7aa5ff 40%, #fbbf24 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
          Enhance
        </span>
      </h1>

      {/* Tagline */}
      <p className="relative z-10 text-center text-[clamp(1rem,2vw,1.2rem)] max-w-xl leading-relaxed mb-3"
        style={{ color: 'rgba(240,240,248,0.6)' }}>
        Adaptive multi-frame low-light enhancement powered by scene intelligence,
        optical flow, and perceptual tone mapping.
      </p>

      {/* Feature pills */}
      <div className="relative z-10 flex flex-wrap gap-2 justify-center mb-10">
        {['Scene Analysis', 'Motion Fusion', 'Noise Reduction', 'Face Protection', 'Tone Mapping'].map(f => (
          <span key={f} className="text-xs px-3 py-1 rounded-full font-mono"
            style={{
              background: 'rgba(61,120,255,0.1)',
              border: '1px solid rgba(61,120,255,0.25)',
              color: 'rgba(120,165,255,0.9)'
            }}>
            {f}
          </span>
        ))}
      </div>

      {/* CTA Button */}
      <button
        onClick={onGetStarted}
        className="relative z-10 btn-primary flex items-center gap-3 px-8 py-4 rounded-2xl text-white font-semibold text-base shadow-2xl"
        style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <Star size={18} className="fill-white" />
        Enhance Your Image
        <span className="text-xs opacity-70 font-normal">— free</span>
      </button>

      {/* Stats row */}
      <div className="relative z-10 flex gap-10 mt-14 text-center">
        {[
          { label: 'Enhancement Steps', val: '12' },
          { label: 'Exposure Brackets', val: 'Up to 5' },
          { label: 'Pipeline Modules', val: '8' },
        ].map(({ label, val }) => (
          <div key={label}>
            <div className="text-2xl font-display font-bold text-white"
              style={{ fontFamily: "'Clash Display', sans-serif" }}>{val}</div>
            <div className="text-xs mt-1" style={{ color: 'rgba(240,240,248,0.4)' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Scroll hint */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-30 animate-bounce">
        <ArrowDown size={16} className="text-white" />
      </div>
    </section>
  );
}
