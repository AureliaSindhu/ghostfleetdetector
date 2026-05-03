'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, ArcLayer, GeoJsonLayer } from '@deck.gl/layers';
import { Map as MapGL } from 'react-map-gl/mapbox';
import { Maximize2, Minimize2, Globe, Map, Target } from 'lucide-react';
import { ScoredDarkPeriod } from '@/types';
import { _GlobeView as GlobeView, MapView } from '@deck.gl/core';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

const RISK_COLORS: Record<string, [number, number, number, number]> = {
  CRITICAL: [255, 0, 0, 200],
  HIGH: [255, 165, 0, 200],
  MEDIUM: [255, 255, 0, 200],
  LOW: [0, 255, 0, 200],
};

const RISK_LABELS = [
  { level: 'CRITICAL', color: 'bg-red-500', textColor: 'text-red-400', label: 'CRITICAL [70-100]' },
  { level: 'HIGH', color: 'bg-orange-500', textColor: 'text-orange-400', label: 'HIGH [50-69]' },
  { level: 'MEDIUM', color: 'bg-yellow-500', textColor: 'text-yellow-400', label: 'MEDIUM [30-49]' },
  { level: 'LOW', color: 'bg-green-500', textColor: 'text-green-400', label: 'LOW [0-29]' },
];

interface ViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing?: number;
}

interface MapProps {
  darkPeriods: ScoredDarkPeriod[];
  onSelectPeriod?: (period: ScoredDarkPeriod) => void;
  isLiveScanning?: boolean;
}

export function DarkPeriodsMap({ darkPeriods, onSelectPeriod, isLiveScanning = false }: MapProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isGlobeView, setIsGlobeView] = useState(false);
  const [viewState, setViewState] = useState<ViewState>({
    longitude: 0,
    latitude: 20,
    zoom: 1.5,
    pitch: 0,
    bearing: 0,
  });
  const [hasInitialized, setHasInitialized] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);

  // Initialize view state when dark periods load for the first time
  useEffect(() => {
    if (darkPeriods.length > 0 && !hasInitialized) {
      const avgLat = darkPeriods.reduce((sum, d) => sum + d.lastLat, 0) / darkPeriods.length;
      const avgLon = darkPeriods.reduce((sum, d) => sum + d.lastLon, 0) / darkPeriods.length;
      setViewState({
        longitude: avgLon,
        latitude: avgLat,
        zoom: 2,
        pitch: 0,
        bearing: 0,
      });
      setHasInitialized(true);
    }
  }, [darkPeriods, hasInitialized]);

  // Center on data
  const handleCenterOnData = useCallback(() => {
    if (darkPeriods.length > 0) {
      const avgLat = darkPeriods.reduce((sum, d) => sum + d.lastLat, 0) / darkPeriods.length;
      const avgLon = darkPeriods.reduce((sum, d) => sum + d.lastLon, 0) / darkPeriods.length;
      setViewState((prev) => ({
        ...prev,
        longitude: avgLon,
        latitude: avgLat,
        zoom: 2,
      }));
    }
  }, [darkPeriods]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleViewStateChange = useCallback((params: any) => {
    if (params.viewState) {
      setViewState(params.viewState);
    }
  }, []);

  const layers = useMemo(() => {
    if (!darkPeriods.length) return [];

    const scatterLayer = new ScatterplotLayer({
      id: 'scatter-layer',
      data: darkPeriods,
      getPosition: (d: ScoredDarkPeriod) => [d.lastLon, d.lastLat],
      getRadius: (d: ScoredDarkPeriod) => d.suspicionScore * 500,
      getFillColor: (d: ScoredDarkPeriod) => RISK_COLORS[d.riskLevel],
      radiusMinPixels: 5,
      radiusMaxPixels: 50,
      pickable: true,
      onClick: ({ object }: { object?: ScoredDarkPeriod }) => object && onSelectPeriod?.(object),
    });

    const arcLayer = new ArcLayer({
      id: 'arc-layer',
      data: darkPeriods,
      getSourcePosition: (d: ScoredDarkPeriod) => [d.lastLon, d.lastLat],
      getTargetPosition: (d: ScoredDarkPeriod) => [d.reappearLon, d.reappearLat],
      getSourceColor: (d: ScoredDarkPeriod) => RISK_COLORS[d.riskLevel],
      getTargetColor: (d: ScoredDarkPeriod) => RISK_COLORS[d.riskLevel],
      getWidth: 2,
      pickable: true,
    });

    return [scatterLayer, arcLayer];
  }, [darkPeriods, onSelectPeriod]);


  // Count by risk level
  const riskCounts = useMemo(() => {
    const counts: Record<string, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    darkPeriods.forEach((dp) => {
      counts[dp.riskLevel] = (counts[dp.riskLevel] || 0) + 1;
    });
    return counts;
  }, [darkPeriods]);

  return (
    <div className={`relative ${isFullscreen ? 'fixed inset-0 z-50 bg-[#0a1628]' : ''}`}>
      <div className={`w-full ${isFullscreen ? 'h-full' : 'h-full min-h-[400px]'} rounded-lg overflow-hidden border border-cyan-500/20 relative`}>
        {/* Radar Sweep Overlay - Continuous when live scanning */}
        {isLiveScanning && (
          <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden opacity-60">
            {/* Radar sweep line */}
            <div
              className="absolute top-1/2 left-1/2 w-[150%] h-[150%] -translate-x-1/2 -translate-y-1/2"
              style={{
                animation: 'radar-scan 8s linear infinite',
              }}
            >
              {/* Sweep beam - more transparent */}
              <div
                className="absolute top-1/2 left-1/2 w-1/2 h-0.5"
                style={{
                  background: 'linear-gradient(90deg, rgba(0, 212, 255, 0.5) 0%, rgba(0, 212, 255, 0) 100%)',
                  transformOrigin: 'left center',
                  boxShadow: '0 0 20px rgba(0, 212, 255, 0.3), 0 0 40px rgba(0, 212, 255, 0.15)',
                }}
              />
              {/* Sweep trail cone - more transparent */}
              <div
                className="absolute top-0 left-1/2 w-1/2 h-1/2 origin-bottom-left"
                style={{
                  background: 'conic-gradient(from -90deg, transparent 0deg, rgba(0, 212, 255, 0.08) 20deg, rgba(0, 212, 255, 0.03) 40deg, transparent 60deg)',
                  borderRadius: '100% 0 0 0',
                }}
              />
            </div>

            {/* Center ping - smaller and more subtle */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="w-3 h-3 bg-cyan-400/70 rounded-full shadow-[0_0_15px_rgba(0,212,255,0.5)]" />
            </div>

            {/* Concentric rings - more transparent */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] border border-cyan-500/5 rounded-full" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] border border-cyan-500/5 rounded-full" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40%] h-[40%] border border-cyan-500/5 rounded-full" />

            {/* Crosshairs - more subtle */}
            <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent" />
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-cyan-500/10 to-transparent" />

            {/* Pulse rings - slower and more transparent */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 border border-cyan-400/30 rounded-full"
              style={{ animation: 'radar-pulse 3s ease-out infinite' }}
            />
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 border border-cyan-400/20 rounded-full"
              style={{ animation: 'radar-pulse 3s ease-out infinite 1s' }}
            />
          </div>
        )}

        {/* Live scanning indicator - always visible when live */}
        {isLiveScanning && (
          <div className="absolute top-3 left-3 z-20 bg-[#0d1f35]/90 border border-cyan-500/30 rounded px-3 py-1.5 flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_#22c55e]" />
            <span className="text-cyan-400 text-xs font-mono tracking-wider">LIVE MONITORING</span>
          </div>
        )}

        <DeckGL
          viewState={viewState}
          onViewStateChange={handleViewStateChange}
          controller={true}
          layers={layers}
          getTooltip={(info) => {
            const obj = info.object as ScoredDarkPeriod | undefined;
            if (!obj) return null;
            const riskColor = obj.riskLevel === 'CRITICAL' ? '#ff3366' : obj.riskLevel === 'HIGH' ? '#f97316' : obj.riskLevel === 'MEDIUM' ? '#eab308' : '#00ff88';
            return {
              html: `
                <div style="padding:12px;background:linear-gradient(180deg, #0d1f35 0%, #0a1628 100%);color:#fff;border-radius:8px;font-size:12px;min-width:220px;box-shadow:0 4px 20px rgba(0,0,0,0.5);border:1px solid rgba(0,212,255,0.3);font-family:monospace;">
                  <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid rgba(0,212,255,0.2);">
                    <div style="width:8px;height:8px;background:${riskColor};border-radius:50%;box-shadow:0 0 8px ${riskColor};"></div>
                    <span style="color:#00d4ff;font-size:14px;letter-spacing:1px;">MMSI: ${obj.mmsi}</span>
                  </div>
                  <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;color:rgba(0,212,255,0.7);">
                    <span>THREAT:</span>
                    <span style="font-weight:bold;color:${riskColor};">${obj.riskLevel}</span>
                    <span>SCORE:</span>
                    <span style="color:#fff;">${obj.suspicionScore}/100</span>
                    <span>DARK:</span>
                    <span style="color:#fff;">${obj.gapHours.toFixed(1)}H</span>
                    <span>DIST:</span>
                    <span style="color:#fff;">${obj.distanceNm.toFixed(0)} NM</span>
                    <span>SPEED:</span>
                    <span style="color:#fff;">${obj.impliedSpeedKnots.toFixed(1)} KTS</span>
                  </div>
                  <div style="margin-top:10px;padding-top:8px;border-top:1px solid rgba(0,212,255,0.2);font-size:10px;color:rgba(0,212,255,0.5);text-align:center;">
                    [ CLICK FOR DETAILS ]
                  </div>
                </div>
              `,
            };
          }}
        >
          <MapGL
            mapboxAccessToken={MAPBOX_TOKEN}
            mapStyle="mapbox://styles/mapbox/dark-v11"
            projection={{ name: isGlobeView ? 'globe' : 'mercator' }}
          />
        </DeckGL>
      </div>

      {/* Legend - Naval Style */}
      <div className="absolute bottom-4 left-4 bg-[#0d1f35]/95 backdrop-blur border border-cyan-500/30 rounded-lg p-3 text-sm">
        <div className="font-mono text-cyan-400/80 text-xs tracking-wider mb-2 flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
          THREAT LEVELS
        </div>
        <div className="space-y-1.5">
          {RISK_LABELS.map(({ level, color, textColor, label }) => (
            <div key={level} className="flex items-center gap-2 font-mono text-xs">
              <span className={`w-2.5 h-2.5 rounded-full ${color} shadow-sm`} />
              <span className={`${textColor}`}>{label}</span>
              <span className="text-cyan-500/50 ml-auto tabular-nums">[{riskCounts[level]}]</span>
            </div>
          ))}
        </div>
        <div className="mt-2 pt-2 border-t border-cyan-500/20 text-cyan-500/50 text-xs font-mono">
          TOTAL: {darkPeriods.length} CONTACTS
        </div>
      </div>

      {/* Map Controls - Naval Style */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        {/* Center on Data */}
        <button
          onClick={handleCenterOnData}
          className="bg-[#0d1f35]/95 backdrop-blur border border-cyan-500/30 hover:border-cyan-400/50 p-2 rounded-lg text-cyan-400/70 hover:text-cyan-300 transition-all"
          title="Center on data"
        >
          <Target className="w-5 h-5" />
        </button>

        {/* Globe/Flat Toggle */}
        <button
          onClick={() => setIsGlobeView(!isGlobeView)}
          className="bg-[#0d1f35]/95 backdrop-blur border border-cyan-500/30 hover:border-cyan-400/50 p-2 rounded-lg text-cyan-400/70 hover:text-cyan-300 transition-all"
          title={isGlobeView ? 'Switch to flat view' : 'Switch to globe view'}
        >
          {isGlobeView ? <Map className="w-5 h-5" /> : <Globe className="w-5 h-5" />}
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="bg-[#0d1f35]/95 backdrop-blur border border-cyan-500/30 hover:border-cyan-400/50 p-2 rounded-lg text-cyan-400/70 hover:text-cyan-300 transition-all"
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
        </button>
      </div>

      {/* Fullscreen close hint - Naval Style */}
      {isFullscreen && (
        <div className="absolute top-4 left-4 bg-[#0d1f35]/95 backdrop-blur border border-cyan-500/30 px-3 py-2 rounded-lg text-sm text-cyan-400/70 font-mono">
          <kbd className="bg-cyan-900/50 border border-cyan-500/30 px-1.5 py-0.5 rounded text-cyan-300 text-xs">ESC</kbd>
          <span className="ml-2 text-xs">TO EXIT</span>
        </div>
      )}
    </div>
  );
}
