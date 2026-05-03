'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, ArcLayer } from '@deck.gl/layers';
import { Map as MapGL } from 'react-map-gl/mapbox';
import { Maximize2, Minimize2 } from 'lucide-react';
import { ScoredDarkPeriod } from '@/types';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

const RISK_COLORS: Record<string, [number, number, number, number]> = {
  CRITICAL: [255, 0, 0, 200],
  HIGH: [255, 165, 0, 200],
  MEDIUM: [255, 255, 0, 200],
  LOW: [0, 255, 0, 200],
};

const RISK_LABELS = [
  { level: 'CRITICAL', color: 'bg-red-500', label: 'Critical (70-100)' },
  { level: 'HIGH', color: 'bg-orange-500', label: 'High (50-69)' },
  { level: 'MEDIUM', color: 'bg-yellow-500', label: 'Medium (30-49)' },
  { level: 'LOW', color: 'bg-green-500', label: 'Low (0-29)' },
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
}

export function DarkPeriodsMap({ darkPeriods, onSelectPeriod }: MapProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewState, setViewState] = useState<ViewState>({
    longitude: 0,
    latitude: 20,
    zoom: 1.5,
    pitch: 0,
    bearing: 0,
  });
  const [hasInitialized, setHasInitialized] = useState(false);

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
    <div className={`relative ${isFullscreen ? 'fixed inset-0 z-50 bg-gray-900' : ''}`}>
      <div className={`w-full ${isFullscreen ? 'h-full' : 'h-[500px]'} rounded-lg overflow-hidden`}>
        <DeckGL
          viewState={viewState}
          onViewStateChange={handleViewStateChange}
          controller={true}
          layers={layers}
          getTooltip={(info) => {
            const obj = info.object as ScoredDarkPeriod | undefined;
            if (!obj) return null;
            return {
              html: `
                <div style="padding:12px;background:#1f2937;color:#fff;border-radius:8px;font-size:13px;min-width:200px;box-shadow:0 4px 12px rgba(0,0,0,0.3);">
                  <div style="font-size:16px;font-weight:bold;margin-bottom:8px;border-bottom:1px solid #374151;padding-bottom:6px;">
                    🚢 MMSI: ${obj.mmsi}
                  </div>
                  <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">
                    <span style="color:#9ca3af;">Risk:</span>
                    <span style="font-weight:bold;color:${obj.riskLevel === 'CRITICAL' ? '#ef4444' : obj.riskLevel === 'HIGH' ? '#f97316' : obj.riskLevel === 'MEDIUM' ? '#eab308' : '#22c55e'};">
                      ${obj.riskLevel}
                    </span>
                    <span style="color:#9ca3af;">Score:</span>
                    <span>${obj.suspicionScore}/100</span>
                    <span style="color:#9ca3af;">Dark Period:</span>
                    <span>${obj.gapHours.toFixed(1)} hours</span>
                    <span style="color:#9ca3af;">Distance:</span>
                    <span>${obj.distanceNm.toFixed(0)} nm</span>
                    <span style="color:#9ca3af;">Speed:</span>
                    <span>${obj.impliedSpeedKnots.toFixed(1)} kts</span>
                  </div>
                  <div style="margin-top:8px;font-size:11px;color:#6b7280;">
                    Click for details
                  </div>
                </div>
              `,
            };
          }}
        >
          <MapGL
            mapboxAccessToken={MAPBOX_TOKEN}
            mapStyle="mapbox://styles/mapbox/dark-v11"
            projection={{ name: 'mercator' }}
          />
        </DeckGL>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-gray-900/90 backdrop-blur rounded-lg p-3 text-sm">
        <div className="font-semibold mb-2 text-white">Risk Levels</div>
        <div className="space-y-1.5">
          {RISK_LABELS.map(({ level, color, label }) => (
            <div key={level} className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${color}`} />
              <span className="text-gray-300">{label}</span>
              <span className="text-gray-500 ml-auto">{riskCounts[level]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Fullscreen Toggle */}
      <button
        onClick={() => setIsFullscreen(!isFullscreen)}
        className="absolute top-4 right-4 bg-gray-900/90 backdrop-blur p-2 rounded-lg text-gray-300 hover:text-white transition-colors"
        title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
      >
        {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
      </button>

      {/* Fullscreen close with Escape hint */}
      {isFullscreen && (
        <div className="absolute top-4 left-4 bg-gray-900/90 backdrop-blur px-3 py-2 rounded-lg text-sm text-gray-400">
          Press <kbd className="bg-gray-700 px-1.5 py-0.5 rounded text-white">ESC</kbd> or click button to exit
        </div>
      )}
    </div>
  );
}
