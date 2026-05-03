'use client';

import { ScoredDarkPeriod } from '@/types';
import { Ship, AlertTriangle, AlertCircle, CheckCircle, Radio } from 'lucide-react';

interface StatsCardsProps {
  darkPeriods: ScoredDarkPeriod[];
  totalVessels: number;
  totalRecords: number;
}

export function StatsCards({ darkPeriods, totalVessels }: StatsCardsProps) {
  const critical = darkPeriods.filter((dp) => dp.riskLevel === 'CRITICAL').length;
  const high = darkPeriods.filter((dp) => dp.riskLevel === 'HIGH').length;
  const medium = darkPeriods.filter((dp) => dp.riskLevel === 'MEDIUM').length;
  const low = darkPeriods.filter((dp) => dp.riskLevel === 'LOW').length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <StatCard
        icon={<Ship className="w-5 h-5" />}
        label="VESSELS"
        value={totalVessels.toLocaleString()}
        color="cyan"
        glowColor="rgba(0, 212, 255, 0.3)"
      />
      <StatCard
        icon={<Radio className="w-5 h-5" />}
        label="DARK PERIODS"
        value={darkPeriods.length.toLocaleString()}
        color="cyan"
        glowColor="rgba(0, 212, 255, 0.3)"
      />
      <StatCard
        icon={<AlertTriangle className="w-5 h-5" />}
        label="CRITICAL"
        value={critical}
        color="red"
        glowColor="rgba(255, 51, 102, 0.3)"
        pulse={critical > 0}
      />
      <StatCard
        icon={<AlertCircle className="w-5 h-5" />}
        label="HIGH"
        value={high}
        color="orange"
        glowColor="rgba(249, 115, 22, 0.3)"
      />
      <StatCard
        icon={<AlertCircle className="w-5 h-5" />}
        label="MEDIUM"
        value={medium}
        color="yellow"
        glowColor="rgba(234, 179, 8, 0.3)"
      />
      <StatCard
        icon={<CheckCircle className="w-5 h-5" />}
        label="LOW"
        value={low}
        color="green"
        glowColor="rgba(0, 255, 136, 0.3)"
      />
    </div>
  );
}

const colorClasses: Record<string, { text: string; bg: string; border: string }> = {
  cyan: { text: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30' },
  red: { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  orange: { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
  yellow: { text: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
  green: { text: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
};

function StatCard({
  icon,
  label,
  value,
  color,
  glowColor,
  pulse = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
  glowColor: string;
  pulse?: boolean;
}) {
  const classes = colorClasses[color] || colorClasses.cyan;

  return (
    <div
      className={`relative bg-[#0d1f35] rounded-lg p-4 border ${classes.border} overflow-hidden`}
      style={{ boxShadow: `0 0 20px ${glowColor}, inset 0 1px 0 rgba(255,255,255,0.05)` }}
    >
      {/* Corner accent */}
      <div className={`absolute top-0 left-0 w-8 h-px ${classes.bg}`} style={{ background: `linear-gradient(90deg, ${glowColor}, transparent)` }} />
      <div className={`absolute top-0 left-0 h-8 w-px ${classes.bg}`} style={{ background: `linear-gradient(180deg, ${glowColor}, transparent)` }} />

      <div className="flex items-center gap-2 mb-2">
        <div className={`${classes.text} ${pulse ? 'animate-pulse' : ''}`}>
          {icon}
        </div>
        <span className={`text-xs font-mono ${classes.text} opacity-70 tracking-wider`}>{label}</span>
      </div>
      <div className={`text-3xl font-bold font-mono tabular-nums ${classes.text}`}>
        {value}
      </div>

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${glowColor}, transparent)` }} />
    </div>
  );
}
