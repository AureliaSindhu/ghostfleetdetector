'use client';

import { useMemo } from 'react';
import { ScoredDarkPeriod } from '@/types';
import { Ship, AlertTriangle, AlertCircle, CheckCircle, Radio, Clock, Navigation } from 'lucide-react';

interface StatsCardsProps {
  darkPeriods: ScoredDarkPeriod[];
  totalVessels: number;
  totalRecords: number;
  onRiskFilter?: (riskLevel: string | null) => void;
  activeRiskFilter?: string | null;
}

export function StatsCards({ darkPeriods, totalVessels, onRiskFilter, activeRiskFilter }: StatsCardsProps) {
  const stats = useMemo(() => {
    const critical = darkPeriods.filter((dp) => dp.riskLevel === 'CRITICAL');
    const high = darkPeriods.filter((dp) => dp.riskLevel === 'HIGH');
    const medium = darkPeriods.filter((dp) => dp.riskLevel === 'MEDIUM');
    const low = darkPeriods.filter((dp) => dp.riskLevel === 'LOW');

    const avgScore = (arr: ScoredDarkPeriod[]) =>
      arr.length > 0 ? Math.round(arr.reduce((sum, dp) => sum + dp.suspicionScore, 0) / arr.length) : 0;

    const avgGapHours = (arr: ScoredDarkPeriod[]) =>
      arr.length > 0 ? Math.round(arr.reduce((sum, dp) => sum + dp.gapHours, 0) / arr.length) : 0;

    const maxGapHours = darkPeriods.length > 0
      ? Math.round(Math.max(...darkPeriods.map(dp => dp.gapHours)))
      : 0;

    const totalDistance = Math.round(darkPeriods.reduce((sum, dp) => sum + dp.distanceNm, 0));

    return {
      critical: { count: critical.length, avgScore: avgScore(critical), avgGap: avgGapHours(critical) },
      high: { count: high.length, avgScore: avgScore(high), avgGap: avgGapHours(high) },
      medium: { count: medium.length, avgScore: avgScore(medium), avgGap: avgGapHours(medium) },
      low: { count: low.length, avgScore: avgScore(low), avgGap: avgGapHours(low) },
      maxGapHours,
      totalDistance,
    };
  }, [darkPeriods]);

  const total = darkPeriods.length || 1;

  return (
    <div className="grid grid-cols-2 gap-3">
      <StatCard
        icon={<Ship className="w-4 h-4" />}
        label="VESSELS TRACKED"
        value={totalVessels.toLocaleString()}
        color="cyan"
        glowColor="rgba(0, 212, 255, 0.3)"
        subtitle={`${darkPeriods.length} dark periods`}
      />
      <RiskStatCard
        icon={<AlertTriangle className="w-4 h-4" />}
        label="CRITICAL"
        count={stats.critical.count}
        percentage={Math.round((stats.critical.count / total) * 100)}
        avgScore={stats.critical.avgScore}
        avgGap={stats.critical.avgGap}
        color="red"
        glowColor="rgba(255, 51, 102, 0.3)"
        pulse={stats.critical.count > 0}
        scoreRange="70-100"
        onClick={() => onRiskFilter?.(activeRiskFilter === 'CRITICAL' ? null : 'CRITICAL')}
        isActive={activeRiskFilter === 'CRITICAL'}
      />
      <RiskStatCard
        icon={<AlertCircle className="w-4 h-4" />}
        label="HIGH"
        count={stats.high.count}
        percentage={Math.round((stats.high.count / total) * 100)}
        avgScore={stats.high.avgScore}
        avgGap={stats.high.avgGap}
        color="orange"
        glowColor="rgba(249, 115, 22, 0.3)"
        scoreRange="50-69"
        onClick={() => onRiskFilter?.(activeRiskFilter === 'HIGH' ? null : 'HIGH')}
        isActive={activeRiskFilter === 'HIGH'}
      />
      <RiskStatCard
        icon={<AlertCircle className="w-4 h-4" />}
        label="MEDIUM"
        count={stats.medium.count}
        percentage={Math.round((stats.medium.count / total) * 100)}
        avgScore={stats.medium.avgScore}
        avgGap={stats.medium.avgGap}
        color="yellow"
        glowColor="rgba(234, 179, 8, 0.3)"
        scoreRange="30-49"
        onClick={() => onRiskFilter?.(activeRiskFilter === 'MEDIUM' ? null : 'MEDIUM')}
        isActive={activeRiskFilter === 'MEDIUM'}
      />
      <RiskStatCard
        icon={<CheckCircle className="w-4 h-4" />}
        label="LOW"
        count={stats.low.count}
        percentage={Math.round((stats.low.count / total) * 100)}
        avgScore={stats.low.avgScore}
        avgGap={stats.low.avgGap}
        color="green"
        glowColor="rgba(0, 255, 136, 0.3)"
        scoreRange="0-29"
        onClick={() => onRiskFilter?.(activeRiskFilter === 'LOW' ? null : 'LOW')}
        isActive={activeRiskFilter === 'LOW'}
      />
      <StatCard
        icon={<Navigation className="w-4 h-4" />}
        label="LONGEST DARK"
        value={`${stats.maxGapHours}h`}
        color="cyan"
        glowColor="rgba(0, 212, 255, 0.3)"
        subtitle={`${stats.totalDistance.toLocaleString()} nm total`}
      />
    </div>
  );
}

const colorClasses: Record<string, { text: string; bg: string; border: string; barBg: string }> = {
  cyan: { text: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', barBg: 'bg-cyan-500' },
  red: { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', barBg: 'bg-red-500' },
  orange: { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', barBg: 'bg-orange-500' },
  yellow: { text: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', barBg: 'bg-yellow-500' },
  green: { text: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30', barBg: 'bg-green-500' },
};

function StatCard({
  icon,
  label,
  value,
  color,
  glowColor,
  subtitle,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
  glowColor: string;
  subtitle?: string;
}) {
  const classes = colorClasses[color] || colorClasses.cyan;

  return (
    <div
      className={`relative bg-[#081a2c] rounded-md p-3 border ${classes.border} overflow-hidden`}
      style={{ boxShadow: `0 0 15px ${glowColor}, inset 0 1px 0 rgba(255,255,255,0.05)` }}
    >
      <div className={`absolute top-0 left-0 w-6 h-px`} style={{ background: `linear-gradient(90deg, ${glowColor}, transparent)` }} />
      <div className={`absolute top-0 left-0 h-6 w-px`} style={{ background: `linear-gradient(180deg, ${glowColor}, transparent)` }} />

      <div className="flex items-center gap-1.5 mb-1">
        <div className={`${classes.text}`}>{icon}</div>
        <span className={`text-[11px] font-mono ${classes.text} opacity-90 tracking-wider`}>{label}</span>
      </div>
      <div className={`text-2xl font-bold font-mono tabular-nums ${classes.text}`}>
        {value}
      </div>
      {subtitle && (
        <div className="text-[11px] text-cyan-200/60 font-mono mt-1">{subtitle}</div>
      )}

      <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${glowColor}, transparent)` }} />
    </div>
  );
}

function RiskStatCard({
  icon,
  label,
  count,
  percentage,
  avgScore,
  avgGap,
  color,
  glowColor,
  pulse = false,
  scoreRange,
  onClick,
  isActive = false,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  percentage: number;
  avgScore: number;
  avgGap: number;
  color: string;
  glowColor: string;
  pulse?: boolean;
  scoreRange: string;
  onClick?: () => void;
  isActive?: boolean;
}) {
  const classes = colorClasses[color] || colorClasses.cyan;

  return (
    <button
      onClick={onClick}
      className={`relative bg-[#081a2c] rounded-md p-3 border ${classes.border} overflow-hidden text-left w-full transition-all ${
        onClick ? 'cursor-pointer hover:bg-[#132743]' : ''
      } ${isActive ? 'ring-2 ring-cyan-400 bg-[#132743]' : ''}`}
      style={{ boxShadow: `0 0 15px ${glowColor}, inset 0 1px 0 rgba(255,255,255,0.05)` }}
    >
      <div className={`absolute top-0 left-0 w-6 h-px`} style={{ background: `linear-gradient(90deg, ${glowColor}, transparent)` }} />
      <div className={`absolute top-0 left-0 h-6 w-px`} style={{ background: `linear-gradient(180deg, ${glowColor}, transparent)` }} />

      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <div className={`${classes.text} ${pulse ? 'animate-pulse' : ''}`}>{icon}</div>
          <span className={`text-[11px] font-mono ${classes.text} opacity-90 tracking-wider`}>{label}</span>
        </div>
        <span className="text-[10px] font-mono text-cyan-200/50">[{scoreRange}]</span>
      </div>

      <div className="flex items-baseline gap-2">
        <span className={`text-2xl font-bold font-mono tabular-nums ${classes.text}`}>{count}</span>
        <span className="text-sm font-mono text-cyan-100/65">{percentage}%</span>
      </div>

      {/* Progress bar */}
      <div className="mt-1.5 h-1 bg-[#132743] rounded-full overflow-hidden">
        <div
          className={`h-full ${classes.barBg} transition-all duration-500`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>

      {/* Additional stats */}
      {count > 0 && (
        <div className="mt-1.5 flex justify-between text-[10px] font-mono text-cyan-100/60">
          <span>AVG: {avgScore} pts</span>
          <span>{avgGap}h gap</span>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${glowColor}, transparent)` }} />
    </button>
  );
}
