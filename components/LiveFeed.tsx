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
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Radio className={`w-5 h-5 ${isActive ? 'text-red-500 animate-pulse' : 'text-gray-500'}`} />
          <h3 className="text-lg font-semibold text-white">Live Feed</h3>
          {isActive && (
            <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded animate-pulse">
              LIVE
            </span>
          )}
        </div>
        <button
          onClick={onToggle}
          className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm transition-colors ${
            isActive
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {isActive ? (
            <>
              <Pause className="w-4 h-4" /> Pause
            </>
          ) : (
            <>
              <Play className="w-4 h-4" /> Start
            </>
          )}
        </button>
      </div>

      {alerts.length === 0 ? (
        <div className="text-gray-500 text-sm text-center py-4">
          {isActive ? 'Waiting for incoming alerts...' : 'Click Start to begin live monitoring'}
        </div>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {alerts.map((alert, i) => (
            <div
              key={`${alert.mmsi}-${i}`}
              className={`p-2 rounded border-l-4 ${
                alert.riskLevel === 'CRITICAL'
                  ? 'border-red-500 bg-red-900/30'
                  : alert.riskLevel === 'HIGH'
                  ? 'border-orange-500 bg-orange-900/30'
                  : 'border-yellow-500 bg-yellow-900/30'
              } ${i === 0 ? 'animate-pulse' : ''}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm text-white">{alert.mmsi}</span>
                <span
                  className={`text-xs font-bold ${
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
              <div className="text-xs text-gray-400 mt-1">
                Score: {alert.suspicionScore} | {alert.reasons[0]}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 text-xs text-gray-500 flex items-center gap-1">
        <AlertTriangle className="w-3 h-3" />
        Simulated feed for demo purposes
      </div>
    </div>
  );
}
