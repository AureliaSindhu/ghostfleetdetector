'use client';

import { useState, useEffect, useCallback } from 'react';
import { Radio, Pause, Play, AlertTriangle } from 'lucide-react';
import { ScoredDarkPeriod } from '@/types';
import { SAMPLE_DARK_PERIODS } from '@/lib/sampleData';

interface LiveFeedProps {
  onNewAlert: (alert: ScoredDarkPeriod) => void;
  isActive: boolean;
  onToggle: () => void;
}

const LIVE_ALERTS: ScoredDarkPeriod[] = [
  {
    mmsi: '538009123',
    lastSeenTime: new Date(),
    reappearTime: new Date(Date.now() + 1000 * 60 * 60 * 24),
    gapHours: 24,
    lastLat: 10.5,
    lastLon: 110.2,
    reappearLat: 12.8,
    reappearLon: 114.5,
    distanceNm: 280,
    impliedSpeedKnots: 11.7,
    suspicionScore: 75,
    riskLevel: 'CRITICAL',
    reasons: [
      'NEW ALERT: Vessel just went dark',
      'In transshipment zone: South China Sea',
      'High implied speed while dark',
    ],
  },
  {
    mmsi: '636024891',
    lastSeenTime: new Date(),
    reappearTime: new Date(Date.now() + 1000 * 60 * 60 * 18),
    gapHours: 18,
    lastLat: 26.2,
    lastLon: 55.8,
    reappearLat: 27.1,
    reappearLon: 56.5,
    distanceNm: 75,
    impliedSpeedKnots: 4.2,
    suspicionScore: 68,
    riskLevel: 'HIGH',
    reasons: [
      'NEW ALERT: Vessel just went dark',
      'In transshipment zone: Persian Gulf',
      'Tanker vessel type',
    ],
  },
  {
    mmsi: '273459876',
    lastSeenTime: new Date(),
    reappearTime: new Date(Date.now() + 1000 * 60 * 60 * 36),
    gapHours: 36,
    lastLat: 44.5,
    lastLon: 37.8,
    reappearLat: 43.2,
    reappearLon: 39.5,
    distanceNm: 125,
    impliedSpeedKnots: 3.5,
    suspicionScore: 82,
    riskLevel: 'CRITICAL',
    reasons: [
      'NEW ALERT: Russian vessel went dark',
      'Black Sea shipping lane',
      'Sanctioned flag state',
    ],
  },
];

export function LiveFeed({ onNewAlert, isActive, onToggle }: LiveFeedProps) {
  const [alerts, setAlerts] = useState<ScoredDarkPeriod[]>([]);
  const [alertIndex, setAlertIndex] = useState(0);

  // Simulate live alerts every 8 seconds when active
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      const nextAlert = LIVE_ALERTS[alertIndex % LIVE_ALERTS.length];
      // Add some randomness to make it feel live
      const alert: ScoredDarkPeriod = {
        ...nextAlert,
        mmsi: nextAlert.mmsi.slice(0, -3) + Math.floor(Math.random() * 1000).toString().padStart(3, '0'),
        lastSeenTime: new Date(),
        suspicionScore: nextAlert.suspicionScore + Math.floor(Math.random() * 10) - 5,
      };

      setAlerts((prev) => [alert, ...prev].slice(0, 5));
      onNewAlert(alert);
      setAlertIndex((i) => i + 1);
    }, 8000);

    return () => clearInterval(interval);
  }, [isActive, alertIndex, onNewAlert]);

  return (
    <div className="bg-[#0d1f35] rounded-lg p-4 border border-cyan-500/20" style={{ boxShadow: '0 0 20px rgba(0, 212, 255, 0.1)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`relative ${isActive ? 'animate-pulse' : ''}`}>
            <Radio className={`w-5 h-5 ${isActive ? 'text-red-400' : 'text-cyan-500/50'}`} />
            {isActive && (
              <div className="absolute inset-0 w-5 h-5 bg-red-500/20 rounded-full animate-ping" />
            )}
          </div>
          <h3 className="text-sm font-mono font-semibold text-cyan-300 tracking-wider">LIVE FEED</h3>
          {isActive && (
            <span className="text-[10px] bg-red-500/20 border border-red-500/50 text-red-400 px-2 py-0.5 rounded font-mono animate-pulse">
              ACTIVE
            </span>
          )}
        </div>
        <button
          onClick={onToggle}
          className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-mono transition-all ${
            isActive
              ? 'bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30'
              : 'bg-green-500/20 border border-green-500/50 text-green-400 hover:bg-green-500/30'
          }`}
        >
          {isActive ? (
            <>
              <Pause className="w-3 h-3" /> PAUSE
            </>
          ) : (
            <>
              <Play className="w-3 h-3" /> START
            </>
          )}
        </button>
      </div>

      {alerts.length === 0 ? (
        <div className="text-cyan-500/50 text-xs text-center py-6 font-mono border border-dashed border-cyan-500/20 rounded">
          {isActive ? '// MONITORING FOR INCOMING SIGNALS...' : '// CLICK START TO BEGIN MONITORING'}
        </div>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {alerts.map((alert, i) => (
            <div
              key={`${alert.mmsi}-${i}`}
              className={`p-2 rounded border-l-2 ${
                alert.riskLevel === 'CRITICAL'
                  ? 'border-red-500 bg-red-500/10'
                  : alert.riskLevel === 'HIGH'
                  ? 'border-orange-500 bg-orange-500/10'
                  : 'border-yellow-500 bg-yellow-500/10'
              } ${i === 0 ? 'animate-pulse' : ''}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-cyan-200">{alert.mmsi}</span>
                <span
                  className={`text-[10px] font-mono font-bold ${
                    alert.riskLevel === 'CRITICAL'
                      ? 'text-red-400'
                      : alert.riskLevel === 'HIGH'
                      ? 'text-orange-400'
                      : 'text-yellow-400'
                  }`}
                >
                  {alert.riskLevel}
                </span>
              </div>
              <div className="text-[10px] text-cyan-400/60 mt-1 font-mono truncate">
                [{alert.suspicionScore}] {alert.reasons[0]}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 pt-2 border-t border-cyan-500/20 text-[10px] text-cyan-500/40 flex items-center gap-1 font-mono">
        <AlertTriangle className="w-3 h-3" />
        SIMULATED FEED // DEMO MODE
      </div>
    </div>
  );
}
