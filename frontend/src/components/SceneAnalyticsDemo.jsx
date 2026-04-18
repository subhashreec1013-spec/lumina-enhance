import React, { useState, useRef, useCallback } from 'react';
import { Activity, Upload, Eye, Cpu, Zap, BarChart2, AlertCircle } from 'lucide-react';
import axios from 'axios';

const BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

/* ── tiny sparkline bar ─────────────────────────────────────────── */
function MiniBar({ value, max = 1, color, label, sub }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const COLORS = {
    blue:   'linear-gradient(90deg,#3d78ff,#7aa5ff)',
    amber:  'linear-gradient(90deg,#f59e0b,#fbbf24)',
    red:    'linear-gradient(90deg,#ef4444,#f87171)',
    green:  'linear-gradient(90deg,#10b981,#34d399)',
    purple: 'linear-gradient(90deg,#8b5cf6,#a78bfa)',
    grey:   'linear-gradient(90deg,#64748b,#94a3b8)',
  };
  return (
    <div className="flex items-center gap-3">
      <div className="w-24 text-right">
        <div className="text-xs font-medium text-white/80">{label}</div>
        {sub && <div className="text-[10px] text-white/30 mt-0.5">{sub}</div>}
      </div>
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: COLORS[color] || COLORS.blue }} />
      </div>
      <div className="w-10 text-right text-xs font-mono text-white/60">{pct}%</div>
    </div>
  );
}

/* ── category badge ─────────────────────────────────────────────── */
function SceneBadge({ cat }) {
  const map = {
    very_dark: { label: 'Very Dark', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)', dot: '#ef4444' },
    dark:      { label: 'Dark',      bg: 'rgba(251,146,60,0.12)', border: 'rgba(251,146,60,0.35)', dot: '#fb923c' },
    moderate:  { label: 'Moderate',  bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.35)', dot: '#fbbf24' },
    normal:    { label: 'Normal',    bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.35)', dot: '#34d399' },
  };
  const s = map[cat] || map.normal;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-mono"
      style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.dot }}>
      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: s.dot }} />
      {s.label}
    </span>
  );
}

/* ── radar / polygon chart ──────────────────────────────────────── */
function RadarChart({ data }) {
  const cx = 90, cy = 90, r = 65;
  const keys   = ['brightness','contrast','dynamic_range','histogram_entropy','noise_level','shadow_fraction'];
  const labels = ['Brightness','Contrast','Dynamic\nRange','Entropy','Noise','Shadow'];
  const n      = keys.length;

  const pt = (i, radius) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + radius * Math.cos(a), cy + radius * Math.sin(a)];
  };

  const rings = [0.25, 0.5, 0.75, 1.0];
  const dataPoints = keys.map((k, i) => pt(i, (data[k] || 0) * r));
  const polyStr    = dataPoints.map(([x, y]) => `${x},${y}`).join(' ');

  return (
    <svg viewBox="0 0 180 180" className="w-44 h-44">
      {/* Grid rings */}
      {rings.map(rv => (
        <polygon key={rv}
          points={keys.map((_, i) => pt(i, rv * r).join(',')).join(' ')}
          fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
      ))}
      {/* Axis lines */}
      {keys.map((_, i) => {
        const [x, y] = pt(i, r);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.07)" strokeWidth="1" />;
      })}
      {/* Data polygon */}
      <polygon points={polyStr}
        fill="rgba(61,120,255,0.15)" stroke="#3d78ff" strokeWidth="1.5" strokeLinejoin="round" />
      {/* Data dots */}
      {dataPoints.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3" fill="#3d78ff" />
      ))}
      {/* Labels */}
      {keys.map((_, i) => {
        const [x, y] = pt(i, r + 14);
        return (
          <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
            fill="rgba(240,240,248,0.45)" fontSize="7" style={{ fontFamily: 'DM Sans' }}>
            {labels[i].split('\n').map((line, li) => (
              <tspan key={li} x={x} dy={li === 0 ? 0 : 9}>{line}</tspan>
            ))}
          </text>
        );
      })}
    </svg>
  );
}

/* ── main component ─────────────────────────────────────────────── */
export default function SceneAnalyticsDemo() {
  const [analysing, setAnalysing] = useState(false);
  const [meta, setMeta]           = useState(null);
  const [preview, setPreview]     = useState(null);
  const [error, setError]         = useState(null);
  const inputRef = useRef();

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    setError(null);
    setPreview(URL.createObjectURL(file));
    setAnalysing(true);
    setMeta(null);

    try {
      /* Quick analysis: submit as single-image enhance job, read metadata */
      const form = new FormData();
      form.append('files', file);
      const { data: job } = await axios.post(`${BASE}/enhance`, form);

      /* Poll until done */
      let status;
      for (let i = 0; i < 120; i++) {
        await new Promise(r => setTimeout(r, 700));
        const { data } = await axios.get(`${BASE}/status/${job.job_id}`);
        status = data;
        if (data.status === 'done' || data.status === 'error') break;
      }

      if (status?.status === 'done') {
        setMeta(status.metadata);
      } else {
        setError(status?.message || 'Analysis failed');
      }
    } catch (e) {
      setError(e.message || 'Could not connect to backend');
    } finally {
      setAnalysing(false);
    }
  }, []);

  const onDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  return (
    <section className="py-20 px-6" id="analytics">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 glass px-4 py-1.5 rounded-full mb-5 text-xs font-mono"
            style={{ color: 'rgba(240,240,248,0.5)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <Activity size={11} className="text-lumina-400" /> Live Scene Analytics
          </div>
          <h2 className="text-3xl font-bold text-white mb-3"
            style={{ fontFamily: "'Clash Display', sans-serif" }}>
            Drop any image — see its DNA
          </h2>
          <p className="text-sm max-w-md mx-auto" style={{ color: 'rgba(240,240,248,0.45)' }}>
            Before enhancing, Lumina runs a full scene analysis. Try it live — upload any image to see exactly what the AI measures.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* ── Drop zone / preview ── */}
          <div
            className="rounded-2xl overflow-hidden flex flex-col items-center justify-center cursor-pointer transition-all duration-300 min-h-64"
            style={{ background: 'rgba(255,255,255,0.02)', border: '2px dashed rgba(255,255,255,0.10)', borderRadius: 20 }}
            onClick={() => inputRef.current?.click()}
            onDrop={onDrop}
            onDragOver={e => e.preventDefault()}
          >
            <input ref={inputRef} type="file" accept="image/*" className="hidden"
              onChange={e => handleFile(e.target.files?.[0])} />

            {preview ? (
              <div className="relative w-full h-full min-h-64">
                <img src={preview} alt="Preview" className="w-full h-full object-cover" style={{ minHeight: 256 }} />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <span className="text-white text-sm font-medium">Click to change</span>
                </div>
                {analysing && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3">
                    <div className="w-10 h-10 border-2 border-lumina-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-white text-sm">Analysing scene...</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 p-10">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(61,120,255,0.1)', border: '1px solid rgba(61,120,255,0.2)' }}>
                  <Upload size={24} className="text-lumina-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-white mb-1">Drop any image here</p>
                  <p className="text-xs" style={{ color: 'rgba(240,240,248,0.35)' }}>JPG, PNG, WebP up to 20MB</p>
                </div>
              </div>
            )}
          </div>

          {/* ── Analytics panel ── */}
          <div className="rounded-2xl p-6 flex flex-col gap-5"
            style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>

            {!meta && !analysing && !error && (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 py-8">
                <Eye size={32} className="text-white/15" />
                <p className="text-sm text-center" style={{ color: 'rgba(240,240,248,0.3)' }}>
                  Upload an image to see its scene analysis
                </p>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-3 p-4 rounded-xl"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <AlertCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-300 mb-0.5">Analysis failed</p>
                  <p className="text-xs text-red-400/70">{error}</p>
                </div>
              </div>
            )}

            {meta && (
              <>
                {/* Category + radar */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <BarChart2 size={14} className="text-lumina-400" />
                      <span className="text-sm font-semibold text-white">Scene Profile</span>
                    </div>
                    <SceneBadge cat={meta.scene_category} />
                  </div>
                  <RadarChart data={meta} />
                </div>

                <div className="h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />

                {/* Metric bars */}
                <div className="space-y-3">
                  <MiniBar value={meta.brightness}         label="Brightness"     sub="Perceptual" color="amber"  />
                  <MiniBar value={meta.contrast}           label="Contrast"       sub="RMS"        color="blue"   />
                  <MiniBar value={meta.dynamic_range}      label="Dyn Range"      sub="P2–P98"     color="purple" />
                  <MiniBar value={meta.noise_level}        label="Noise"          sub="HF residual" color="red"   />
                  <MiniBar value={meta.shadow_fraction}    label="Shadows"        sub="Dark pixels" color="grey"  />
                  <MiniBar value={meta.histogram_entropy}  label="Entropy"        sub="Distribution" color="green"/>
                </div>

                {/* AI decision preview */}
                <div className="rounded-xl p-3"
                  style={{ background: 'rgba(61,120,255,0.06)', border: '1px solid rgba(61,120,255,0.15)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Cpu size={11} className="text-lumina-400" />
                    <span className="text-xs font-semibold text-lumina-300">AI will apply</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {meta.noise_level > 0.15 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-mono" style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171' }}>Heavy denoising</span>
                    )}
                    {meta.brightness < 0.15 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-mono" style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24' }}>Aggressive gamma lift</span>
                    )}
                    {meta.shadow_fraction > 0.3 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-mono" style={{ background: 'rgba(148,163,184,0.12)', color: '#94a3b8' }}>Shadow recovery</span>
                    )}
                    {meta.contrast < 0.15 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-mono" style={{ background: 'rgba(139,92,246,0.12)', color: '#a78bfa' }}>CLAHE contrast</span>
                    )}
                    {meta.dynamic_range > 0.4 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-mono" style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399' }}>Tone mapping</span>
                    )}
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-mono" style={{ background: 'rgba(61,120,255,0.12)', color: '#7aa5ff' }}>Warm shadow grade</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-mono" style={{ background: 'rgba(61,120,255,0.12)', color: '#7aa5ff' }}>Luma-only pipeline</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
