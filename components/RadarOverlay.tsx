'use client';

import { useEffect, useState } from 'react';

interface RadarOverlayProps {
  isScanning: boolean;
  scanId?: number;
  onScanComplete?: () => void;
}

export function RadarOverlay({ isScanning, scanId = 0, onScanComplete }: RadarOverlayProps) {
  const [scanProgress, setScanProgress] = useState(0);
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    if (isScanning) {
      const startTimer = setTimeout(() => {
        setShowOverlay(true);
        setScanProgress(0);
      }, 0);

      const fillTimer = setTimeout(() => {
        setScanProgress(100);
      }, 120);

      const completeTimer = setTimeout(() => {
        setShowOverlay(false);
        onScanComplete?.();
      }, 850);

      return () => {
        clearTimeout(startTimer);
        clearTimeout(fillTimer);
        clearTimeout(completeTimer);
      };
    }
  }, [isScanning, scanId, onScanComplete]);

  if (!showOverlay) return null;

  return (
    <div className="fixed inset-0 z-[25] pointer-events-none">
      {/* Light transition veil. The map and panels stay visible underneath. */}
      <div
        className="absolute inset-0 bg-[#0a1628] tactical-grid"
        style={{ opacity: 0.34 * (1 - scanProgress / 100) }}
      />

      {/* Radar container */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="relative w-80 h-80 transition-opacity duration-300"
          style={{ opacity: Math.max(0, 1 - scanProgress / 115) }}
        >
          {/* Radar circles */}
          <div className="absolute inset-0 rounded-full border border-cyan-500/30" />
          <div className="absolute inset-[20%] rounded-full border border-cyan-500/20" />
          <div className="absolute inset-[40%] rounded-full border border-cyan-500/10" />

          {/* Cross hairs */}
          <div className="absolute top-1/2 left-0 right-0 h-px bg-cyan-500/20" />
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-cyan-500/20" />

          {/* Radar sweep */}
          <div
            className="absolute inset-0 origin-center"
            style={{
              animation: 'radar-scan 2s linear infinite',
            }}
          >
            <div
              className="absolute top-1/2 left-1/2 w-1/2 h-1"
              style={{
                background: 'linear-gradient(90deg, rgba(0, 212, 255, 0.8) 0%, transparent 100%)',
                transformOrigin: 'left center',
                boxShadow: '0 0 20px rgba(0, 212, 255, 0.5)',
              }}
            />
            {/* Sweep trail */}
            <div
              className="absolute top-0 left-1/2 w-1/2 h-1/2 origin-bottom-left"
              style={{
                background: 'conic-gradient(from -90deg, transparent 0deg, rgba(0, 212, 255, 0.2) 30deg, transparent 60deg)',
                borderRadius: '100% 0 0 0',
              }}
            />
          </div>

          {/* Center dot */}
          <div className="absolute top-1/2 left-1/2 w-3 h-3 -ml-1.5 -mt-1.5 bg-cyan-400 rounded-full shadow-[0_0_10px_#00d4ff]" />

          {/* Pulse rings */}
          <div
            className="absolute inset-0 rounded-full border-2 border-cyan-500/50"
            style={{
              animation: 'radar-pulse 1.5s ease-out infinite',
            }}
          />
          <div
            className="absolute inset-0 rounded-full border-2 border-cyan-500/30"
            style={{
              animation: 'radar-pulse 1.5s ease-out infinite 0.5s',
            }}
          />
        </div>
      </div>

      {/* Status text */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-center">
        <div className="bg-[#0d1f35]/90 border border-cyan-500/30 rounded px-5 py-3 shadow-[0_14px_40px_rgba(0,0,0,0.45)]">
          <div className="text-cyan-200 font-sans text-xs tracking-[0.14em] mb-2">
            LOADING DEMO SCAN
          </div>
          <div className="w-56 h-1.5 bg-[#132743] rounded overflow-hidden mx-auto">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all duration-100"
              style={{ width: `${scanProgress}%` }}
            />
          </div>
          <div className="text-cyan-100/60 font-sans text-xs mt-2">
            {scanProgress.toFixed(0)}% COMPLETE
          </div>
        </div>
      </div>

      {/* Scan lines */}
      <div
        className="absolute inset-0 opacity-25"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 212, 255, 0.03) 2px, rgba(0, 212, 255, 0.03) 4px)',
        }}
      />
    </div>
  );
}
