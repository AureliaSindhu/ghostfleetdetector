'use client';

import { X } from 'lucide-react';
import { ScoredDarkPeriod } from '@/types';
import { IntelReport } from './IntelReport';

interface VesselDetailModalProps {
  period: ScoredDarkPeriod;
  onClose: () => void;
}

const RISK_BAR_COLORS = {
  CRITICAL: 'bg-red-500',
  HIGH: 'bg-orange-500',
  MEDIUM: 'bg-yellow-500',
  LOW: 'bg-green-500',
};

export function VesselDetailModal({ period, onClose }: VesselDetailModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-2xl font-bold text-white">Vessel {period.mmsi}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-2 text-white">📊 Suspicion Score</h3>
            <div className="bg-gray-700 rounded-full h-4 overflow-hidden">
              <div
                className={`h-full ${RISK_BAR_COLORS[period.riskLevel]}`}
                style={{ width: `${period.suspicionScore}%` }}
              />
            </div>
            <p className="mt-2 text-2xl font-bold text-white">
              {period.suspicionScore}/100 —{' '}
              <span className="text-lg">{period.riskLevel}</span>
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2 text-white">📍 Dark Period Details</h3>
            <div className="space-y-1 text-sm text-gray-300">
              <p>
                <span className="text-gray-400">Last seen:</span>{' '}
                {period.lastSeenTime.toLocaleString()}
              </p>
              <p>
                <span className="text-gray-400">Reappeared:</span>{' '}
                {period.reappearTime.toLocaleString()}
              </p>
              <p>
                <span className="text-gray-400">Duration:</span>{' '}
                {period.gapHours.toFixed(1)} hours
              </p>
              <p>
                <span className="text-gray-400">Distance:</span>{' '}
                {period.distanceNm.toFixed(1)} nm
              </p>
              <p>
                <span className="text-gray-400">Implied speed:</span>{' '}
                {period.impliedSpeedKnots.toFixed(1)} knots
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2 text-white">⚠️ Risk Factors</h3>
          <ul className="space-y-1">
            {period.reasons.map((reason, i) => (
              <li key={i} className="text-sm bg-gray-700 rounded px-3 py-2 text-gray-200">
                {reason}
              </li>
            ))}
          </ul>
        </div>

        {/* AI Intelligence Report */}
        <IntelReport darkPeriod={period} />
      </div>
    </div>
  );
}
