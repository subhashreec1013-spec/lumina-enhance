import React, { useRef } from 'react';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import UploadZone from './components/UploadZone';
import ProcessingView from './components/ProcessingView';
import ResultViewer from './components/ResultViewer';
import MetricsPanel from './components/MetricsPanel';
import ErrorView from './components/ErrorView';
import { useEnhancement, STAGES } from './hooks/useEnhancement';
import { ArrowLeft, Plus, Sparkles } from 'lucide-react';
import SceneAnalyticsDemo from './components/SceneAnalyticsDemo';

export default function App() {
  const workspaceRef = useRef(null);
  const { stage, progress, progressMsg, result, error, enhance, reset } = useEnhancement();

  const scrollToWorkspace = () => {
    workspaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleGetStarted = () => scrollToWorkspace();

  const handleEnhance = (files) => {
    enhance(files);
    // Small delay then scroll to show progress
    setTimeout(() => workspaceRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const isIdle = stage === STAGES.IDLE;
  const isUploading = stage === STAGES.UPLOADING;
  const isProcessing = stage === STAGES.PROCESSING;
  const isDone = stage === STAGES.DONE;
  const isError = stage === STAGES.ERROR;

  return (
    <div className="min-h-screen noise" style={{ background: 'var(--bg-primary)' }}>
      <Navbar />

      {/* ── Hero ── */}
      <HeroSection onGetStarted={handleGetStarted} />

      {/* ── How It Works strip ── */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-xs font-mono mb-10 tracking-widest uppercase"
            style={{ color: 'rgba(240,240,248,0.3)' }}>
            12-Step Enhancement Pipeline
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { n: '01', t: 'Scene Analysis',    d: 'Brightness, noise, contrast, motion metrics' },
              { n: '02', t: 'Adaptive Control',  d: 'Dynamic gamma, CLAHE, denoise parameter tuning' },
              { n: '03', t: 'Motion Fusion',     d: 'Optical flow alignment & soft motion masks' },
              { n: '04', t: 'Exposure Fusion',   d: 'Multi-bracket Mertens-style exposure blending' },
              { n: '05', t: 'Shadow Lifting',    d: 'Perceptual dark-region curve enhancement' },
              { n: '06', t: 'CLAHE',             d: 'Contrast-limited adaptive histogram EQ' },
              { n: '07', t: 'Denoising',         d: 'Non-local means noise suppression' },
              { n: '08', t: 'Tone Mapping',      d: 'Reinhard perceptual luminance mapping' },
            ].map(({ n, t, d }) => (
              <div key={n} className="metric-card p-4">
                <div className="text-xs font-mono mb-2" style={{ color: 'rgba(61,120,255,0.7)' }}>{n}</div>
                <div className="text-sm font-semibold text-white mb-1"
                  style={{ fontFamily: "'Clash Display', sans-serif" }}>{t}</div>
                <div className="text-xs leading-relaxed" style={{ color: 'rgba(240,240,248,0.4)' }}>{d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Scene Analytics Demo ── */}
      <SceneAnalyticsDemo />

      {/* ── Workspace ── */}
      <section ref={workspaceRef} className="py-16 px-6 min-h-screen flex flex-col items-center">
        <div className="w-full max-w-4xl">

          {/* Section header */}
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1"
                style={{ fontFamily: "'Clash Display', sans-serif" }}>
                {isDone ? 'Enhancement Complete' : isError ? 'Something went wrong' : 'Enhance Your Image'}
              </h2>
              <p className="text-sm" style={{ color: 'rgba(240,240,248,0.4)' }}>
                {isDone
                  ? 'Drag the slider to compare before and after'
                  : isProcessing || isUploading
                  ? 'Running the full AI pipeline...'
                  : isError
                  ? 'Check the error and try again'
                  : 'Upload a low-light image to get started'}
              </p>
            </div>

            {(isDone || isError) && (
              <button onClick={reset}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:scale-105"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(240,240,248,0.7)' }}>
                <Plus size={15} />
                New Image
              </button>
            )}
          </div>

          {/* State machine rendering */}
          {(isIdle || isUploading) && (
            <UploadZone onEnhance={handleEnhance} disabled={isUploading} />
          )}

          {(isUploading || isProcessing) && (
            <ProcessingView progress={progress} message={progressMsg} />
          )}

          {isDone && result && (
            <div>
              <ResultViewer
                originalUrl={result.originalUrl}
                enhancedUrl={result.enhancedUrl}
              />
              <MetricsPanel metadata={result.metadata} params={result.params} />

              {/* New enhancement CTA */}
              <div className="mt-8 text-center">
                <button onClick={reset}
                  className="btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-medium">
                  <Sparkles size={16} />
                  Enhance Another Image
                </button>
              </div>
            </div>
          )}

          {isError && (
            <ErrorView message={error} onRetry={reset} />
          )}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-8 px-6 text-center"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <p className="text-xs font-mono" style={{ color: 'rgba(240,240,248,0.25)' }}>
          Lumina Enhance — Adaptive Multi-Frame Low-Light Enhancement Engine
        </p>
      </footer>
    </div>
  );
}
