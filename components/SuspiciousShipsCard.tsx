'use client';

import { useMemo } from 'react';
import { ScoredDarkPeriod } from '@/types';
import { AlertTriangle, TrendingUp, Eye, ChevronRight } from 'lucide-react';

interface SuspiciousShipsCardProps {
  darkPeriods: ScoredDarkPeriod[];
  onSelectVessel: (vessel: ScoredDarkPeriod) => void;
}

export function SuspiciousShipsCard({ darkPeriods, onSelectVessel }: SuspiciousShipsCardProps) {
  const { critical, nearingSuspicion } = useMemo(() => {
    // Get critical vessels (top threats)
    const criticalVessels = darkPeriods
      .filter((dp) => dp.riskLevel === 'CRITICAL')
      .sort((a, b) => b.suspicionScore - a.suspicionScore)
      .slice(0, 3);

    // Get vessels "nearing suspicion" - medium/high risk with scores close to next threshold
    // HIGH (50-69) with score >= 65 are close to CRITICAL
    // MEDIUM (30-49) with score >= 45 are close to HIGH
    const nearingVessels = darkPeriods
      .filter((dp) => {
        if (dp.riskLevel === 'HIGH' && dp.suspicionScore >= 65) return true;
        if (dp.riskLevel === 'MEDIUM' && dp.suspicionScore >= 45) return true;
        return false;
      })
      .sort((a, b) => b.suspicionScore - a.suspicionScore)
      .slice(0, 3);

    return {
      critical: criticalVessels,
      nearingSuspicion: nearingVessels,
    };
  }, [darkPeriods]);

  if (critical.length === 0 && nearingSuspicion.length === 0) {
    return (
      <div className="bg-[#0d1f35] rounded-lg p-4 border border-green-500/30" style={{ boxShadow: '0 0 20px rgba(0, 255, 136, 0.1)' }}>
        <div className="flex items-center gap-2 text-green-400">
          <Eye className="w-5 h-5" />
          <span className="font-sans text-sm">ALL CLEAR - NO CRITICAL THREATS DETECTED</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0d1f35] rounded-lg border border-red-500/30 overflow-hidden" style={{ boxShadow: '0 0 20px rgba(255, 51, 102, 0.15)' }}>
      {/* Header */}
      <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />
        <span className="font-sans text-sm text-red-300 tracking-wider">THREAT MONITOR</span>
        <div className="flex-1" />
        <span className="text-[10px] font-sans text-red-400/60">
          {critical.length + nearingSuspicion.length} VESSELS OF INTEREST
        </span>
      </div>

      <div className="p-3 space-y-3">
        {/* Critical Threats */}
        {critical.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-sans text-red-400/80 tracking-wider">CRITICAL THREATS</span>
            </div>
            <div className="space-y-2">
              {critical.map((vessel) => (
                <VesselRow
                  key={vessel.mmsi}
                  vessel={vessel}
                  onClick={() => onSelectVessel(vessel)}
                  variant="critical"
                />
              ))}
            </div>
          </div>
        )}

        {/* Nearing Suspicion */}
        {nearingSuspicion.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-3 h-3 text-amber-400" />
              <span className="text-[10px] font-sans text-amber-400/80 tracking-wider">NEARING THRESHOLD</span>
            </div>
            <div className="space-y-2">
              {nearingSuspicion.map((vessel) => (
                <VesselRow
                  key={vessel.mmsi}
                  vessel={vessel}
                  onClick={() => onSelectVessel(vessel)}
                  variant="warning"
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function VesselRow({
  vessel,
  onClick,
  variant,
}: {
  vessel: ScoredDarkPeriod;
  onClick: () => void;
  variant: 'critical' | 'warning';
}) {
  const borderColor = variant === 'critical' ? 'border-red-500/40' : 'border-amber-500/40';
  const bgColor = variant === 'critical' ? 'bg-red-500/5 hover:bg-red-500/10' : 'bg-amber-500/5 hover:bg-amber-500/10';
  const scoreColor = variant === 'critical' ? 'text-red-400' : 'text-amber-400';
  const threshold = variant === 'critical' ? null : vessel.riskLevel === 'HIGH' ? 70 : 50;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left ${bgColor} border ${borderColor} rounded p-2 transition-all group`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-sans text-cyan-200 text-sm">{vessel.mmsi}</span>
          <span className={`font-sans text-xs font-bold ${scoreColor}`}>
            {vessel.suspicionScore}
          </span>
          {threshold && (
            <span className="text-[9px] font-sans text-cyan-500/50">
              → {threshold}
            </span>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-cyan-500/30 group-hover:text-cyan-400 transition-colors" />
      </div>
      <div className="flex items-center gap-3 mt-1 text-[10px] font-sans text-cyan-500/60">
        <span>{vessel.gapHours.toFixed(0)}h dark</span>
        <span>{vessel.distanceNm.toFixed(0)} nm</span>
        <span className="truncate flex-1">{vessel.reasons[0]}</span>
      </div>
      {/* Score progress to next threshold */}
      {threshold && (
        <div className="mt-1.5 h-1 bg-[#132743] rounded-full overflow-hidden">
          <div
            className={`h-full ${variant === 'critical' ? 'bg-red-500' : 'bg-amber-500'} transition-all`}
            style={{ width: `${(vessel.suspicionScore / threshold) * 100}%` }}
          />
        </div>
      )}
    </button>
  );
}
