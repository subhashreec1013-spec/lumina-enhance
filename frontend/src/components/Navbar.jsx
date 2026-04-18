import React from 'react';
import { Zap, Github } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4"
      style={{
        background: 'rgba(5,5,8,0.7)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg,#3d78ff,#0f52ff)' }}>
          <Zap size={14} className="text-white fill-white" />
        </div>
        <span className="text-sm font-bold tracking-wide text-white"
          style={{ fontFamily: "'Clash Display', sans-serif", letterSpacing: '0.05em' }}>
          LUMINA
        </span>
        <span className="text-xs px-2 py-0.5 rounded-full font-mono"
          style={{ background: 'rgba(61,120,255,0.15)', color: '#7aa5ff', border: '1px solid rgba(61,120,255,0.2)' }}>
          ENHANCE
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-mono" style={{ color: 'rgba(240,240,248,0.4)' }}>API Online</span>
        </div>
        <a href="https://github.com" target="_blank" rel="noopener noreferrer"
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Github size={15} className="text-white/60" />
        </a>
      </div>
    </nav>
  );
}
