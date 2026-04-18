import React from 'react';
import { Cpu, Layers, Eye, Zap, Sliders, Aperture } from 'lucide-react';

const PIPELINE_STEPS = [
  { at: 5,  icon: Eye,      label: 'Scene Analysis',        desc: 'Measuring brightness, noise, contrast' },
  { at: 12, icon: Sliders,  label: 'Adaptive Parameters',   desc: 'Computing optimal gamma, CLAHE, denoise' },
  { at: 20, icon: Layers,   label: 'Motion Detection',      desc: 'Optical flow & motion masking' },
  { at: 30, icon: Aperture, label: 'Gamma Correction',      desc: 'Adaptive gamma lifting' },
  { at: 38, icon: Cpu,      label: 'Exposure Brackets',     desc: 'Generating synthetic exposures' },
  { at: 48, icon: Zap,      label: 'Exposure Fusion',       desc: 'Multi-exposure Mertens blending' },
  { at: 56, icon: Eye,      label: 'Shadow Enhancement',    desc: 'Lifting dark regions' },
  { at: 62, icon: Sliders,  label: 'CLAHE',                 desc: 'Adaptive histogram equalization' },
  { at: 68, icon: Cpu,      label: 'Noise Reduction',       desc: 'Non-local means denoising' },
  { at: 73, icon: Zap,      label: 'Local Contrast',        desc: 'Micro-contrast enhancement' },
  { at: 78, icon: Aperture, label: 'Highlight Protection',  desc: 'Preserving bright detail' },
  { at: 86, icon: Layers,   label: 'Tone Mapping',          desc: 'Reinhard perceptual mapping' },
  { at: 93, icon: Eye,      label: 'Semantic Protection',   desc: 'Face & region protection' },
  { at: 96, icon: Zap,      label: 'Adaptive Blend',        desc: 'Final perceptual blending' },
];

export default function ProcessingView({ progress, message }) {
  const activeStep = PIPELINE_STEPS.reduce((last, step) => {
    return progress >= step.at ? step : last;
  }, null);

  return (
    <div className="w-full max-w-2xl mx-auto py-8">

      {/* Central progress ring */}
      <div className="flex flex-col items-center mb-10">
        <div className="relative w-36 h-36 mb-6">
          {/* Background ring */}
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52"
              fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
            <circle cx="60" cy="60" r="52"
              fill="none"
              stroke="url(#progressGrad)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 52}`}
              strokeDashoffset={`${2 * Math.PI * 52 * (1 - progress / 100)}`}
              style={{ transition: 'stroke-dashoffset 0.6s ease' }}
            />
            <defs>
              <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3d78ff" />
                <stop offset="100%" stopColor="#fbbf24" />
              </linearGradient>
            </defs>
          </svg>

          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-display font-bold text-white"
              style={{ fontFamily: "'Clash Display', sans-serif" }}>
              {progress}%
            </span>
          </div>
        </div>

        <p className="text-base font-medium text-white mb-1">
          {message || 'Processing...'}
        </p>
        <p className="text-xs" style={{ color: 'rgba(240,240,248,0.4)' }}>
          AI enhancement pipeline running
        </p>
      </div>

      {/* Progress bar */}
      <div className="mb-8 rounded-full overflow-hidden h-1.5"
        style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div
          className="progress-bar h-full rounded-full transition-all duration-500"
          style={{
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #3d78ff, #7aa5ff, #fbbf24)',
          }} />
      </div>

      {/* Pipeline steps */}
      <div className="space-y-2">
        {PIPELINE_STEPS.map((step, i) => {
          const done = progress > step.at;
          const active = activeStep === step;
          const Icon = step.icon;

          return (
            <div
              key={i}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300"
              style={{
                background: active
                  ? 'rgba(61,120,255,0.1)'
                  : done
                  ? 'rgba(255,255,255,0.02)'
                  : 'transparent',
                border: active
                  ? '1px solid rgba(61,120,255,0.25)'
                  : '1px solid transparent',
              }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: done || active
                    ? 'rgba(61,120,255,0.2)'
                    : 'rgba(255,255,255,0.04)',
                }}>
                {done ? (
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                ) : active ? (
                  <div className="w-2 h-2 rounded-full bg-lumina-400 animate-pulse" />
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
                )}
              </div>

              <Icon size={13} className={done ? 'text-emerald-400' : active ? 'text-lumina-400' : 'text-white/20'} />

              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium block"
                  style={{ color: done ? 'rgba(240,240,248,0.7)' : active ? 'rgba(240,240,248,0.95)' : 'rgba(240,240,248,0.3)' }}>
                  {step.label}
                </span>
              </div>

              {active && (
                <div className="text-xs font-mono" style={{ color: 'rgba(61,120,255,0.8)' }}>
                  running
                </div>
              )}
              {done && (
                <div className="text-xs font-mono text-emerald-400/60">done</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
