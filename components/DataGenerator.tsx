'use client';

import { useState } from 'react';
import { Shuffle, Download, Play } from 'lucide-react';
import { ScoredDarkPeriod } from '@/types';

const ZONES = [
  { name: 'South China Sea', latMin: 5, latMax: 25, lonMin: 105, lonMax: 120 },
  { name: 'Gulf of Guinea', latMin: -5, latMax: 10, lonMin: -10, lonMax: 15 },
  { name: 'Strait of Hormuz', latMin: 24, latMax: 28, lonMin: 54, lonMax: 58 },
  { name: 'Strait of Malacca', latMin: 0, latMax: 8, lonMin: 98, lonMax: 105 },
  { name: 'Caribbean', latMin: 10, latMax: 25, lonMin: -85, lonMax: -60 },
  { name: 'East Africa Coast', latMin: -10, latMax: 15, lonMin: 40, lonMax: 55 },
  { name: 'North Sea', latMin: 51, latMax: 61, lonMin: -4, lonMax: 9 },
  { name: 'Mediterranean', latMin: 30, latMax: 45, lonMin: -5, lonMax: 35 },
];

const RISK_REASONS: Record<string, string[]> = {
  CRITICAL: [
    'Extended dark period',
    'In known transshipment zone',
    'Sanctioned flag state',
    'Large distance while dark',
    'Tanker vessel type',
  ],
  HIGH: [
    'Long dark period',
    'Significant distance traveled',
    'Flag of convenience',
    'Went dark at night',
  ],
  MEDIUM: [
    'Moderate dark period',
    'In monitored zone',
    'Unusual movement pattern',
  ],
  LOW: [
    'Short dark period',
    'Near port area',
    'Routine gap',
  ],
};

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function generateMMSI(): string {
  const prefixes = ['211', '244', '273', '353', '412', '477', '538', '636'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  return prefix + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
}

function generateDarkPeriod(): ScoredDarkPeriod {
  const zone = ZONES[Math.floor(Math.random() * ZONES.length)];
  const lastLat = randomInRange(zone.latMin, zone.latMax);
  const lastLon = randomInRange(zone.lonMin, zone.lonMax);

  // Random movement
  const latOffset = randomInRange(-3, 3);
  const lonOffset = randomInRange(-5, 5);
  const reappearLat = Math.max(-90, Math.min(90, lastLat + latOffset));
  const reappearLon = ((lastLon + lonOffset + 180) % 360) - 180;

  // Calculate distance (simplified)
  const distanceNm = Math.sqrt(
    Math.pow((reappearLat - lastLat) * 60, 2) +
    Math.pow((reappearLon - lastLon) * 60 * Math.cos(lastLat * Math.PI / 180), 2)
  );

  // Random gap hours (6-120)
  const gapHours = randomInRange(6, 120);
  const impliedSpeedKnots = distanceNm / gapHours;

  // Calculate score
  let score = 0;
  if (gapHours >= 72) score += 30;
  else if (gapHours >= 24) score += 20;
  else if (gapHours >= 12) score += 10;

  if (distanceNm > 200) score += 20;
  else if (distanceNm > 100) score += 10;

  score += 25; // In zone

  if (impliedSpeedKnots > 30) score += 20;
  if (Math.random() > 0.5) score += 10; // High risk type
  if (Math.random() > 0.7) score += 35; // Sanctioned

  score = Math.min(100, score);

  let riskLevel: ScoredDarkPeriod['riskLevel'];
  if (score >= 70) riskLevel = 'CRITICAL';
  else if (score >= 50) riskLevel = 'HIGH';
  else if (score >= 30) riskLevel = 'MEDIUM';
  else riskLevel = 'LOW';

  const reasons = RISK_REASONS[riskLevel].slice(0, Math.floor(Math.random() * 3) + 2);

  const lastSeenTime = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
  const reappearTime = new Date(lastSeenTime.getTime() + gapHours * 60 * 60 * 1000);

  return {
    mmsi: generateMMSI(),
    lastSeenTime,
    reappearTime,
    gapHours: Math.round(gapHours * 10) / 10,
    lastLat: Math.round(lastLat * 1000) / 1000,
    lastLon: Math.round(lastLon * 1000) / 1000,
    reappearLat: Math.round(reappearLat * 1000) / 1000,
    reappearLon: Math.round(reappearLon * 1000) / 1000,
    distanceNm: Math.round(distanceNm * 10) / 10,
    impliedSpeedKnots: Math.round(impliedSpeedKnots * 10) / 10,
    suspicionScore: score,
    riskLevel,
    reasons,
  };
}

interface DataGeneratorProps {
  onGenerate: (data: ScoredDarkPeriod[]) => void;
}

export function DataGenerator({ onGenerate }: DataGeneratorProps) {
  const [count, setCount] = useState(25);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const data = Array.from({ length: count }, () => generateDarkPeriod());
      // Sort by score descending
      data.sort((a, b) => b.suspicionScore - a.suspicionScore);
      onGenerate(data);
      setIsGenerating(false);
    }, 300);
  };

  const handleExport = () => {
    const data = Array.from({ length: count }, () => generateDarkPeriod());
    data.sort((a, b) => b.suspicionScore - a.suspicionScore);

    const csv = [
      'mmsi,score,risk,gap_hours,distance_nm,last_lat,last_lon,reappear_lat,reappear_lon,reasons',
      ...data.map(
        (dp) =>
          `${dp.mmsi},${dp.suspicionScore},${dp.riskLevel},${dp.gapHours},${dp.distanceNm},${dp.lastLat},${dp.lastLon},${dp.reappearLat},${dp.reappearLon},"${dp.reasons.join('; ')}"`
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ghost_fleet_random_${count}_vessels.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-[#0d1f35] rounded-lg p-4 mt-6 border border-cyan-500/20" style={{ boxShadow: '0 0 20px rgba(0, 212, 255, 0.1)' }}>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-purple-500/20 flex items-center justify-center">
            <Shuffle className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h3 className="font-mono font-semibold text-cyan-200 tracking-wide text-sm">DATA GENERATOR</h3>
            <p className="text-[10px] text-cyan-500/50 font-mono">GENERATE SYNTHETIC DARK PERIOD DATA</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs text-cyan-400/70 font-mono flex items-center gap-2">
            COUNT:
            <input
              type="number"
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(500, Number(e.target.value))))}
              className="w-20 bg-[#132743] border border-cyan-500/30 rounded px-2 py-1.5 text-cyan-300 text-center font-mono text-sm focus:border-cyan-400 focus:outline-none"
              min={1}
              max={500}
            />
          </label>

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 bg-purple-500/20 border border-purple-500/50 hover:bg-purple-500/30 px-4 py-2 rounded font-mono text-sm text-purple-300 transition-all disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <span className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                GENERATING...
              </>
            ) : (
              <>
                <Play className="w-3 h-3" />
                GENERATE
              </>
            )}
          </button>

          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-[#1e3a5f] border border-cyan-500/30 hover:border-cyan-400/50 px-4 py-2 rounded font-mono text-sm text-cyan-300 transition-all"
          >
            <Download className="w-3 h-3" />
            EXPORT CSV
          </button>
        </div>
      </div>
    </div>
  );
}
