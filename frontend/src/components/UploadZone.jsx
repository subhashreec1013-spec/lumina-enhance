import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, ImagePlus, X, Layers, Zap } from 'lucide-react';

const MAX_FILES = 8;
const MAX_SIZE = 20 * 1024 * 1024;

export default function UploadZone({ onEnhance, disabled }) {
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);

  const onDrop = useCallback((accepted, rejected) => {
    if (rejected.length > 0) return;

    const newFiles = [...files, ...accepted].slice(0, MAX_FILES);
    setFiles(newFiles);

    // Generate previews
    const newPreviews = newFiles.map(f => URL.createObjectURL(f));
    setPreviews(prev => {
      prev.forEach(u => URL.revokeObjectURL(u));
      return newPreviews;
    });
  }, [files]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxSize: MAX_SIZE,
    maxFiles: MAX_FILES,
    disabled,
  });

  const removeFile = (idx) => {
    URL.revokeObjectURL(previews[idx]);
    const nf = files.filter((_, i) => i !== idx);
    const np = previews.filter((_, i) => i !== idx);
    setFiles(nf);
    setPreviews(np);
  };

  const handleEnhance = () => {
    if (files.length > 0 && onEnhance) {
      onEnhance(files);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`relative rounded-2xl p-1 transition-all duration-300 cursor-pointer ${
          isDragActive ? 'dropzone-active' : ''
        }`}
        style={{
          background: isDragActive
            ? 'rgba(61,120,255,0.08)'
            : 'rgba(255,255,255,0.02)',
          border: `2px dashed ${isDragActive ? 'rgba(61,120,255,0.7)' : 'rgba(255,255,255,0.12)'}`,
          borderRadius: '20px',
        }}>
        <input {...getInputProps()} />

        {/* Scan line when active */}
        {isDragActive && <div className="scan-line" />}

        <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
          <div className="relative mb-5">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(61,120,255,0.2), rgba(61,120,255,0.05))',
                border: '1px solid rgba(61,120,255,0.3)',
              }}>
              <Upload size={28} className="text-lumina-400" />
            </div>
            {isDragActive && (
              <div className="absolute inset-0 rounded-2xl animate-ping"
                style={{ background: 'rgba(61,120,255,0.2)' }} />
            )}
          </div>

          <h3 className="text-lg font-semibold text-white mb-2"
            style={{ fontFamily: "'Clash Display', sans-serif" }}>
            {isDragActive ? 'Drop to enhance' : 'Drop your low-light images here'}
          </h3>
          <p className="text-sm mb-5" style={{ color: 'rgba(240,240,248,0.45)' }}>
            or click to browse — JPEG, PNG, WebP up to 20MB each
          </p>

          <div className="flex items-center gap-4 text-xs" style={{ color: 'rgba(240,240,248,0.35)' }}>
            <span className="flex items-center gap-1.5">
              <Layers size={12} className="text-lumina-400" />
              Up to {MAX_FILES} frames for multi-frame fusion
            </span>
            <span className="w-px h-4 bg-white/10" />
            <span className="flex items-center gap-1.5">
              <ImagePlus size={12} className="text-amber-400" />
              Multiple frames improve quality
            </span>
          </div>
        </div>
      </div>

      {/* Preview grid */}
      {previews.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-white/70">
              {files.length} {files.length === 1 ? 'image' : 'images'} selected
            </span>
            <button
              onClick={() => { setFiles([]); setPreviews([]); }}
              className="text-xs text-red-400/70 hover:text-red-400 transition-colors">
              Clear all
            </button>
          </div>

          <div className="grid grid-cols-4 gap-3 mb-6">
            {previews.map((url, i) => (
              <div key={i} className="relative group aspect-square rounded-xl overflow-hidden"
                style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                <img src={url} alt={`Frame ${i + 1}`}
                  className="w-full h-full object-cover" />

                {/* Primary badge */}
                {i === 0 && (
                  <div className="absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full font-mono"
                    style={{
                      background: 'rgba(61,120,255,0.8)',
                      backdropFilter: 'blur(8px)',
                    }}>
                    Primary
                  </div>
                )}

                {/* Remove button */}
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: 'rgba(0,0,0,0.7)' }}>
                  <X size={12} className="text-white" />
                </button>

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
              </div>
            ))}
          </div>

          {/* Enhance button */}
          <button
            onClick={handleEnhance}
            disabled={disabled || files.length === 0}
            className="w-full btn-primary py-4 rounded-2xl font-semibold text-white flex items-center justify-center gap-3 text-base disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
            style={{ fontFamily: "'DM Sans', sans-serif" }}>
            <Zap size={20} className="fill-white" />
            {files.length > 1
              ? `Enhance ${files.length} Frames with Multi-Frame Fusion`
              : 'Enhance Image with AI Pipeline'}
          </button>
        </div>
      )}
    </div>
  );
}
