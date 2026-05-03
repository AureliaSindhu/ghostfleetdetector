'use client';

import { useEffect, useState } from 'react';

interface RadarOverlayProps {
  isScanning: boolean;
  onScanComplete?: () => void;
}

export function RadarOverlay({ isScanning, onScanComplete }: RadarOverlayProps) {
  const [scanProgress, setScanProgress] = useState(0);
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    if (isScanning) {
      setShowOverlay(true);
      setScanProgress(0);

      const interval = setInterval(() => {
        setScanProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => {
              setShowOverlay(false);
              onScanComplete?.();
            }, 300);
            return 100;
          }
          return prev + 2;
        });
      }, 30);

      return () => clearInterval(interval);
    }
  }, [isScanning, onScanComplete]);

  if (!showOverlay) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Dark overlay with grid */}
      <div
        className="absolute inset-0 bg-[#0a1628]/90 tactical-grid"
        style={{ opacity: 1 - scanProgress / 100 }}
      />

      {/* Radar container */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-80 h-80">
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
      <div className="absolute bottom-20 left-0 right-0 text-center">
        <div className="inline-block bg-[#0d1f35]/80 border border-cyan-500/30 rounded px-6 py-3">
          <div className="text-cyan-400 font-sans text-sm mb-2">
            SCANNING MARITIME TRAFFIC
          </div>
          <div className="w-48 h-2 bg-[#132743] rounded overflow-hidden mx-auto">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all duration-100"
              style={{ width: `${scanProgress}%` }}
            />
          </div>
          <div className="text-cyan-300/70 font-sans text-xs mt-2">
            {scanProgress.toFixed(0)}% COMPLETE
          </div>
        </div>
      </div>

      {/* Corner decorations */}
      <div className="absolute top-4 left-4 w-16 h-16 border-l-2 border-t-2 border-cyan-500/30" />
      <div className="absolute top-4 right-4 w-16 h-16 border-r-2 border-t-2 border-cyan-500/30" />
      <div className="absolute bottom-4 left-4 w-16 h-16 border-l-2 border-b-2 border-cyan-500/30" />
      <div className="absolute bottom-4 right-4 w-16 h-16 border-r-2 border-b-2 border-cyan-500/30" />

      {/* Scan lines */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 212, 255, 0.03) 2px, rgba(0, 212, 255, 0.03) 4px)',
        }}
      />
    </div>
  );
}
