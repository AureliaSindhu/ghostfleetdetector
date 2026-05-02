'use client';

import { ScoredDarkPeriod } from '@/types';

interface VesselTableProps {
  darkPeriods: ScoredDarkPeriod[];
  onSelect?: (period: ScoredDarkPeriod) => void;
}

const RISK_BADGES = {
  CRITICAL: 'bg-red-500',
  HIGH: 'bg-orange-500',
  MEDIUM: 'bg-yellow-500',
  LOW: 'bg-green-500',
};

export function VesselTable({ darkPeriods, onSelect }: VesselTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="text-left p-3">MMSI</th>
            <th className="text-left p-3">Score</th>
            <th className="text-left p-3">Risk</th>
            <th className="text-left p-3">Duration</th>
            <th className="text-left p-3">Distance</th>
            <th className="text-left p-3">Reasons</th>
          </tr>
        </thead>
        <tbody>
          {darkPeriods.slice(0, 20).map((dp, i) => (
            <tr
              key={`${dp.mmsi}-${i}`}
              className="border-b border-gray-800 hover:bg-gray-800 cursor-pointer"
              onClick={() => onSelect?.(dp)}
            >
              <td className="p-3 font-mono">{dp.mmsi}</td>
              <td className="p-3">{dp.suspicionScore}/100</td>
              <td className="p-3">
                <span
                  className={`px-2 py-1 rounded text-xs font-bold text-white ${RISK_BADGES[dp.riskLevel]}`}
                >
                  {dp.riskLevel}
                </span>
              </td>
              <td className="p-3">{dp.gapHours.toFixed(1)}h</td>
              <td className="p-3">{dp.distanceNm.toFixed(0)} nm</td>
              <td className="p-3 text-gray-400 text-xs max-w-xs truncate">
                {dp.reasons.join('; ')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
