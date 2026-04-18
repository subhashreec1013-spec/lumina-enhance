import React, { useState, useRef, useCallback } from 'react';
import { Download, ZoomIn, ZoomOut, RotateCcw, Maximize2 } from 'lucide-react';

export default function ResultViewer({ originalUrl, enhancedUrl }) {
  const [sliderPos, setSliderPos] = useState(50);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [draggingSlider, setDraggingSlider] = useState(false);
  const [draggingPan, setDraggingPan] = useState(false);
  const [panStart, setPanStart] = useState(null);
  const containerRef = useRef(null);

  /* ── Slider drag ── */
  const onSliderMouseDown = useCallback((e) => {
    e.preventDefault();
    setDraggingSlider(true);
  }, []);

  const onMouseMove = useCallback((e) => {
    if (draggingSlider && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      setSliderPos(Math.max(2, Math.min(98, x)));
    }
    if (draggingPan && panStart) {
      setPan(p => ({ x: p.x + e.clientX - panStart.x, y: p.y + e.clientY - panStart.y }));
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  }, [draggingSlider, draggingPan, panStart]);

  const onMouseUp = useCallback(() => {
    setDraggingSlider(false);
    setDraggingPan(false);
    setPanStart(null);
  }, []);

  /* ── Pan drag (zoom > 1) ── */
  const onImgMouseDown = useCallback((e) => {
    if (zoom > 1) {
      e.preventDefault();
      setDraggingPan(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  }, [zoom]);

  /* ── Zoom ── */
  const zoomIn  = () => setZoom(z => Math.min(z + 0.5, 4));
  const zoomOut = () => setZoom(z => { const n = Math.max(z - 0.5, 1); if (n === 1) setPan({ x:0, y:0 }); return n; });
  const resetView = () => { setZoom(1); setPan({ x:0, y:0 }); setSliderPos(50); };

  /* ── Download enhanced ── */
  const download = () => {
    const a = document.createElement('a');
    a.href = enhancedUrl;
    a.download = 'lumina_enhanced.jpg';
    a.click();
  };

  const imgStyle = {
    transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
    transition: draggingPan ? 'none' : 'transform 0.2s ease',
    cursor: zoom > 1 ? (draggingPan ? 'grabbing' : 'grab') : 'default',
    userSelect: 'none',
    display: 'block',
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  };

  return (
    <div className="w-full max-w-4xl mx-auto">

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {[
            { icon: ZoomIn,    fn: zoomIn,   label: 'Zoom in'   },
            { icon: ZoomOut,   fn: zoomOut,  label: 'Zoom out'  },
            { icon: RotateCcw, fn: resetView,label: 'Reset'     },
          ].map(({ icon: Icon, fn, label }) => (
            <button key={label} onClick={fn} title={label}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}>
              <Icon size={15} className="text-white/70" />
            </button>
          ))}
          <span className="text-xs font-mono ml-1" style={{ color: 'rgba(240,240,248,0.35)' }}>
            {Math.round(zoom * 100)}%
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: 'rgba(240,240,248,0.4)' }}>
            Drag slider to compare
          </span>
          <button onClick={download}
            className="btn-primary flex items-center gap-2 px-5 py-2 rounded-xl text-white text-sm font-semibold">
            <Download size={15} />
            Download Enhanced
          </button>
        </div>
      </div>

      {/* Comparison container */}
      <div
        ref={containerRef}
        className="relative rounded-2xl overflow-hidden select-none"
        style={{
          aspectRatio: '16/9',
          background: '#080810',
          border: '1px solid rgba(255,255,255,0.08)',
          cursor: draggingSlider ? 'ew-resize' : 'default',
        }}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        {/* ENHANCED (full) */}
        <div className="absolute inset-0 overflow-hidden" onMouseDown={onImgMouseDown}>
          <img src={enhancedUrl} alt="Enhanced" style={imgStyle} draggable={false} />
        </div>

        {/* ORIGINAL (clipped to left of slider) */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
          onMouseDown={onImgMouseDown}
        >
          <img src={originalUrl} alt="Original" style={imgStyle} draggable={false} />
        </div>

        {/* Slider line */}
        <div
          className="absolute top-0 bottom-0 w-px z-20 pointer-events-none"
          style={{ left: `${sliderPos}%`, background: 'rgba(255,255,255,0.9)', boxShadow: '0 0 12px rgba(61,120,255,0.8)' }}
        />

        {/* Drag handle */}
        <div
          className="absolute top-1/2 z-30 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full flex items-center justify-center cursor-ew-resize"
          style={{
            left: `${sliderPos}%`,
            background: 'linear-gradient(135deg, #3d78ff, #0f52ff)',
            border: '2px solid rgba(255,255,255,0.9)',
            boxShadow: '0 0 20px rgba(61,120,255,0.7)',
          }}
          onMouseDown={onSliderMouseDown}
        >
          <Maximize2 size={14} className="text-white" />
        </div>

        {/* Labels */}
        <div className="absolute top-3 left-3 z-10 text-xs font-mono px-2.5 py-1 rounded-lg pointer-events-none"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', color: 'rgba(255,255,255,0.7)' }}>
          ORIGINAL
        </div>
        <div className="absolute top-3 right-3 z-10 text-xs font-mono px-2.5 py-1 rounded-lg pointer-events-none"
          style={{ background: 'rgba(61,120,255,0.5)', backdropFilter: 'blur(8px)', color: 'white' }}>
          ENHANCED
        </div>
      </div>
    </div>
  );
}
