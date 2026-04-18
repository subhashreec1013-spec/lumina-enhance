import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function ErrorView({ message, onRetry }) {
  return (
    <div className="w-full max-w-lg mx-auto flex flex-col items-center text-center py-12">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
        style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
        <AlertTriangle size={28} className="text-red-400" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2"
        style={{ fontFamily: "'Clash Display', sans-serif" }}>
        Enhancement Failed
      </h3>
      <p className="text-sm mb-8 max-w-sm leading-relaxed"
        style={{ color: 'rgba(240,240,248,0.5)' }}>
        {message || 'An unexpected error occurred during processing.'}
      </p>
      <button
        onClick={onRetry}
        className="btn-primary flex items-center gap-2 px-6 py-3 rounded-xl text-white font-medium">
        <RefreshCw size={16} />
        Try Again
      </button>
    </div>
  );
}
