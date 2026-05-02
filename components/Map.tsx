'use client';

import { useMemo } from 'react';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, ArcLayer } from '@deck.gl/layers';
import { Map as MapGL } from 'react-map-gl/mapbox';
import { ScoredDarkPeriod } from '@/types';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

const RISK_COLORS: Record<string, [number, number, number, number]> = {
  CRITICAL: [255, 0, 0, 200],
  HIGH: [255, 165, 0, 200],
  MEDIUM: [255, 255, 0, 200],
  LOW: [0, 255, 0, 200],
};

interface MapProps {
  darkPeriods: ScoredDarkPeriod[];
  onSelectPeriod?: (period: ScoredDarkPeriod) => void;
}

export function DarkPeriodsMap({ darkPeriods, onSelectPeriod }: MapProps) {
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

  const initialViewState = useMemo(() => {
    if (!darkPeriods.length) {
      return { longitude: 0, latitude: 0, zoom: 1, pitch: 45 };
    }

    const avgLat =
      darkPeriods.reduce((sum, d) => sum + d.lastLat, 0) / darkPeriods.length;
    const avgLon =
      darkPeriods.reduce((sum, d) => sum + d.lastLon, 0) / darkPeriods.length;

    return { longitude: avgLon, latitude: avgLat, zoom: 3, pitch: 45 };
  }, [darkPeriods]);

  return (
    <div className="w-full h-[500px] rounded-lg overflow-hidden">
      <DeckGL
        initialViewState={initialViewState}
        controller={true}
        layers={layers}
        getTooltip={(info) => {
          const obj = info.object as ScoredDarkPeriod | undefined;
          if (!obj) return null;
          return {
            html: `
              <div style="padding:8px;background:#1f2937;color:#fff;border-radius:6px;font-size:13px;">
                <b>MMSI:</b> ${obj.mmsi}<br/>
                <b>Risk:</b> ${obj.riskLevel} (${obj.suspicionScore}/100)<br/>
                <b>Dark for:</b> ${obj.gapHours}h<br/>
                <b>Distance:</b> ${obj.distanceNm} nm
              </div>
            `,
          };
        }}
      >
        <MapGL
          mapboxAccessToken={MAPBOX_TOKEN}
          mapStyle="mapbox://styles/mapbox/dark-v11"
        />
      </DeckGL>
    </div>
  );
}
