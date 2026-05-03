'use client';

import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { ScoredDarkPeriod } from '@/types';

const RISK_COLORS = {
  CRITICAL: '#ff3366',
  HIGH: '#f97316',
  MEDIUM: '#eab308',
  LOW: '#22c55e',
};

// Custom tooltip component with proper styling
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; payload?: { name?: string } }>; label?: string }) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    const riskLevel = data.payload?.name || label;
    return (
      <div className="bg-[#0d1f35] border border-cyan-500/30 rounded-lg p-3 shadow-lg">
        <p className="font-mono text-cyan-300 text-sm mb-1">{riskLevel}</p>
        <p className="font-mono text-white text-lg font-bold">{data.value} vessels</p>
      </div>
    );
  }
  return null;
};

interface ChartsProps {
  darkPeriods: ScoredDarkPeriod[];
  onRiskFilter?: (riskLevel: string | null) => void;
  onDurationFilter?: (minHours: number | null, maxHours: number | null) => void;
  activeRiskFilter?: string | null;
  activeDurationFilter?: { min: number | null; max: number | null };
}

export function RiskDistributionChart({
  darkPeriods,
  onRiskFilter,
  activeRiskFilter,
}: ChartsProps) {
  const data = Object.entries(
    darkPeriods.reduce(
      (acc, dp) => {
        acc[dp.riskLevel] = (acc[dp.riskLevel] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    )
  ).map(([name, value]) => ({ name, value }));

  const handleClick = (entry: { name: string }) => {
    if (onRiskFilter) {
      if (activeRiskFilter === entry.name) {
        onRiskFilter(null); // Clear filter if clicking same segment
      } else {
        onRiskFilter(entry.name);
      }
    }
  };

  return (
    <div className="bg-[#0d1f35] p-4 rounded-lg border border-cyan-500/20" style={{ boxShadow: '0 0 20px rgba(0, 212, 255, 0.1)' }}>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-cyan-400 rounded-full" />
          <h3 className="text-cyan-100 text-sm font-mono tracking-wide">RISK DISTRIBUTION</h3>
        </div>
        {activeRiskFilter && (
          <button
            onClick={() => onRiskFilter?.(null)}
            className="text-xs bg-cyan-600/30 hover:bg-cyan-500/40 border border-cyan-500/50 px-2 py-1 rounded text-cyan-300 font-mono"
          >
            CLEAR
          </button>
        )}
      </div>
      {onRiskFilter && (
        <p className="text-[10px] text-cyan-500/50 mb-2 font-mono">// CLICK SEGMENT TO FILTER</p>
      )}
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={65}
            label={({ name, value }) => `${name[0]}:${value}`}
            labelLine={{ stroke: 'rgba(0, 212, 255, 0.3)' }}
            onClick={(_, index) => handleClick(data[index])}
            style={{ cursor: onRiskFilter ? 'pointer' : 'default' }}
            isAnimationActive={false}
          >
            {data.map((entry) => (
              <Cell
                key={entry.name}
                fill={RISK_COLORS[entry.name as keyof typeof RISK_COLORS]}
                opacity={activeRiskFilter && activeRiskFilter !== entry.name ? 0.3 : 1}
                stroke={activeRiskFilter === entry.name ? '#00d4ff' : 'none'}
                strokeWidth={activeRiskFilter === entry.name ? 2 : 0}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ color: '#67e8f9', fontFamily: 'monospace', fontSize: '12px' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DurationHistogram({
  darkPeriods,
  onDurationFilter,
  activeDurationFilter,
}: ChartsProps) {
  const ranges = [
    { range: '6-12h', min: 6, max: 12 },
    { range: '12-24h', min: 12, max: 24 },
    { range: '24-48h', min: 24, max: 48 },
    { range: '48-72h', min: 48, max: 72 },
    { range: '72h+', min: 72, max: Infinity },
  ];

  const data = ranges.map(({ range, min, max }) => ({
    range,
    min,
    max,
    count: darkPeriods.filter((dp) => dp.gapHours >= min && dp.gapHours < max).length,
  }));

  const handleClick = (entry: { min: number; max: number }) => {
    if (onDurationFilter) {
      const isActive =
        activeDurationFilter?.min === entry.min && activeDurationFilter?.max === entry.max;
      if (isActive) {
        onDurationFilter(null, null); // Clear filter
      } else {
        onDurationFilter(entry.min, entry.max);
      }
    }
  };

  const isBarActive = (min: number, max: number) =>
    activeDurationFilter?.min === min && activeDurationFilter?.max === max;

  return (
    <div className="bg-[#0d1f35] p-4 rounded-lg border border-cyan-500/20" style={{ boxShadow: '0 0 20px rgba(0, 212, 255, 0.1)' }}>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-cyan-400 rounded-full" />
          <h3 className="text-cyan-100 text-sm font-mono tracking-wide">DURATION DISTRIBUTION</h3>
        </div>
        {activeDurationFilter?.min != null && (
          <button
            onClick={() => onDurationFilter?.(null, null)}
            className="text-xs bg-cyan-600/30 hover:bg-cyan-500/40 border border-cyan-500/50 px-2 py-1 rounded text-cyan-300 font-mono"
          >
            CLEAR
          </button>
        )}
      </div>
      {onDurationFilter && (
        <p className="text-[10px] text-cyan-500/50 mb-2 font-mono">// CLICK BAR TO FILTER</p>
      )}
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <XAxis dataKey="range" stroke="#67e8f9" tick={{ fill: '#67e8f9', fontFamily: 'monospace', fontSize: 11 }} />
          <YAxis stroke="#67e8f9" tick={{ fill: '#67e8f9', fontFamily: 'monospace', fontSize: 11 }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="count"
            fill="#0891b2"
            onClick={(_, index) => handleClick(data[index])}
            style={{ cursor: onDurationFilter ? 'pointer' : 'default' }}
            isAnimationActive={false}
          >
            {data.map((entry) => (
              <Cell
                key={entry.range}
                fill={isBarActive(entry.min, entry.max) ? '#22d3ee' : '#0891b2'}
                opacity={
                  activeDurationFilter?.min != null && !isBarActive(entry.min, entry.max)
                    ? 0.4
                    : 1
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
