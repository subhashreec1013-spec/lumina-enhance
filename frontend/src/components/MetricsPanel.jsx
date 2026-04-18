import React, { useState } from 'react';
import { Activity, Sliders, ChevronDown, ChevronUp, Info } from 'lucide-react';

function Bar({ value, color = '#3d78ff', max = 1 }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
      <div className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function MetricRow({ label, value, displayValue, color, max, tooltip }) {
  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs flex items-center gap-1.5" style={{ color: 'rgba(240,240,248,0.5)' }}>
          {label}
          {tooltip && (
            <span className="relative">
              <Info size={10} className="opacity-40 group-hover:opacity-70 cursor-help" />
              <span className="absolute left-5 top-0 z-50 hidden group-hover:block text-xs px-2 py-1 rounded-lg w-40 pointer-events-none"
                style={{ background: '#1e1e28', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(240,240,248,0.7)' }}>
                {tooltip}
              </span>
            </span>
          )}
        </span>
        <span className="text-xs font-mono font-medium text-white">{displayValue ?? value}</span>
      </div>
      <Bar value={value} color={color} max={max} />
    </div>
  );
}

function CategoryBadge({ category }) {
  const map = {
    very_dark: { label: 'Very Dark', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)', text: '#f87171' },
    dark:      { label: 'Dark',      bg: 'rgba(251,146,60,0.15)', border: 'rgba(251,146,60,0.3)', text: '#fb923c' },
    moderate:  { label: 'Moderate',  bg: 'rgba(251,191,36,0.15)', border: 'rgba(251,191,36,0.3)', text: '#fbbf24' },
    normal:    { label: 'Normal',    bg: 'rgba(52,211,153,0.15)', border: 'rgba(52,211,153,0.3)', text: '#34d399' },
  };
  const s = map[category] || map.normal;
  return (
    <span className="text-xs px-2.5 py-0.5 rounded-full font-mono"
      style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.text }}>
      {s.label}
    </span>
  );
}

export default function MetricsPanel({ metadata = {}, params = {} }) {
  const [showParams, setShowParams] = useState(false);

  const hasData = Object.keys(metadata).length > 0;
  if (!hasData) return null;

  return (
    <div className="w-full max-w-4xl mx-auto mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">

      {/* Scene Analysis */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Activity size={15} className="text-lumina-400" />
            <span className="text-sm font-semibold text-white">Scene Analysis</span>
          </div>
          {metadata.scene_category && <CategoryBadge category={metadata.scene_category} />}
        </div>

        <div className="space-y-4">
          <MetricRow
            label="Brightness" value={metadata.brightness ?? 0}
            displayValue={`${Math.round((metadata.brightness ?? 0) * 100)}%`}
            color="linear-gradient(90deg,#fbbf24,#f59e0b)" max={1}
            tooltip="Mean perceptual luminance of the scene"
          />
          <MetricRow
            label="Noise Level" value={metadata.noise_level ?? 0}
            displayValue={`${Math.round((metadata.noise_level ?? 0) * 100)}%`}
            color="linear-gradient(90deg,#f87171,#ef4444)" max={1}
            tooltip="Estimated high-frequency noise"
          />
          <MetricRow
            label="Contrast" value={metadata.contrast ?? 0}
            displayValue={`${Math.round((metadata.contrast ?? 0) * 100)}%`}
            color="linear-gradient(90deg,#60a5fa,#3d78ff)" max={1}
            tooltip="RMS contrast measure"
          />
          <MetricRow
            label="Dynamic Range" value={metadata.dynamic_range ?? 0}
            displayValue={`${Math.round((metadata.dynamic_range ?? 0) * 100)}%`}
            color="linear-gradient(90deg,#a78bfa,#8b5cf6)" max={1}
            tooltip="P2–P98 tonal spread"
          />
          <MetricRow
            label="Shadow Fraction" value={metadata.shadow_fraction ?? 0}
            displayValue={`${Math.round((metadata.shadow_fraction ?? 0) * 100)}%`}
            color="linear-gradient(90deg,#94a3b8,#64748b)" max={1}
            tooltip="Fraction of pixels below brightness threshold"
          />
          <MetricRow
            label="Motion" value={metadata.motion ?? 0}
            displayValue={`${Math.round((metadata.motion ?? 0) * 100)}%`}
            color="linear-gradient(90deg,#34d399,#10b981)" max={1}
            tooltip="Inter-frame motion estimate"
          />
        </div>
      </div>

      {/* Pipeline Parameters */}
      <div className="glass rounded-2xl p-5">
        <button
          className="w-full flex items-center justify-between mb-5"
          onClick={() => setShowParams(v => !v)}>
          <div className="flex items-center gap-2">
            <Sliders size={15} className="text-amber-400" />
            <span className="text-sm font-semibold text-white">Pipeline Parameters</span>
          </div>
          {showParams
            ? <ChevronUp size={15} className="text-white/40" />
            : <ChevronDown size={15} className="text-white/40" />}
        </button>

        <div className={`space-y-3 overflow-hidden transition-all duration-300 ${showParams ? 'max-h-96' : 'max-h-48'}`}>
          {[
            { label: 'Gamma Correction', value: params.gamma, max: 3.5, color: '#fbbf24', fmt: v => v?.toFixed(2) },
            { label: 'CLAHE Clip Limit', value: params.clahe_clip, max: 6, color: '#60a5fa', fmt: v => v?.toFixed(1) },
            { label: 'CLAHE Tile Grid', value: params.clahe_tile, max: 16, color: '#a78bfa', fmt: v => `${v}×${v}` },
            { label: 'Denoise Strength', value: params.denoise_strength, max: 25, color: '#f87171', fmt: v => v?.toString() },
            { label: 'Exposure Brackets', value: params.num_exposure_brackets, max: 6, color: '#34d399', fmt: v => `${v} frames` },
            { label: 'Shadow Boost', value: params.shadow_boost, max: 0.5, color: '#94a3b8', fmt: v => `+${Math.round((v ?? 0) * 100)}%` },
            { label: 'Sharpen Strength', value: params.sharpen_strength, max: 1, color: '#fb923c', fmt: v => `${Math.round((v ?? 0) * 100)}%` },
            { label: 'Blend Strength', value: params.blend_strength, max: 1, color: '#3d78ff', fmt: v => `${Math.round((v ?? 0) * 100)}%` },
            { label: 'Saturation Boost', value: params.saturation_boost, max: 1.5, color: '#e879f9', fmt: v => `×${v?.toFixed(2)}` },
          ].map(({ label, value, max, color, fmt }) => (
            <div key={label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs" style={{ color: 'rgba(240,240,248,0.5)' }}>{label}</span>
                <span className="text-xs font-mono font-medium text-white">{fmt(value)}</span>
              </div>
              <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div className="h-full rounded-full"
                  style={{ width: `${Math.min(100, ((value ?? 0) / max) * 100)}%`, background: color, transition: 'width 0.7s ease' }} />
              </div>
            </div>
          ))}
        </div>

        {!showParams && (
          <button onClick={() => setShowParams(true)}
            className="mt-3 text-xs w-full text-center py-1 rounded-lg transition-colors hover:text-lumina-300"
            style={{ color: 'rgba(240,240,248,0.3)', background: 'rgba(255,255,255,0.02)' }}>
            Show all parameters ↓
          </button>
        )}
      </div>
    </div>
  );
}
