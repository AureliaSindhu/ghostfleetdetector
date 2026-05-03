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
  CRITICAL: '#ff0000',
  HIGH: '#ffa500',
  MEDIUM: '#ffff00',
  LOW: '#00ff00',
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
    <div className="bg-gray-900 p-4 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-white text-lg font-semibold">Risk Distribution</h3>
        {activeRiskFilter && (
          <button
            onClick={() => onRiskFilter?.(null)}
            className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-gray-300"
          >
            Clear filter
          </button>
        )}
      </div>
      {onRiskFilter && (
        <p className="text-xs text-gray-500 mb-2">Click a segment to filter the table</p>
      )}
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={80}
            label={({ name, value }) => `${name}: ${value}`}
            onClick={(_, index) => handleClick(data[index])}
            style={{ cursor: onRiskFilter ? 'pointer' : 'default' }}
          >
            {data.map((entry) => (
              <Cell
                key={entry.name}
                fill={RISK_COLORS[entry.name as keyof typeof RISK_COLORS]}
                opacity={activeRiskFilter && activeRiskFilter !== entry.name ? 0.3 : 1}
                stroke={activeRiskFilter === entry.name ? '#fff' : 'none'}
                strokeWidth={activeRiskFilter === entry.name ? 2 : 0}
              />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
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
    <div className="bg-gray-900 p-4 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-white text-lg font-semibold">Duration Distribution</h3>
        {activeDurationFilter?.min != null && (
          <button
            onClick={() => onDurationFilter?.(null, null)}
            className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-gray-300"
          >
            Clear filter
          </button>
        )}
      </div>
      {onDurationFilter && (
        <p className="text-xs text-gray-500 mb-2">Click a bar to filter the table</p>
      )}
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <XAxis dataKey="range" stroke="#fff" />
          <YAxis stroke="#fff" />
          <Tooltip />
          <Bar
            dataKey="count"
            fill="#3b82f6"
            onClick={(_, index) => handleClick(data[index])}
            style={{ cursor: onDurationFilter ? 'pointer' : 'default' }}
          >
            {data.map((entry) => (
              <Cell
                key={entry.range}
                fill={isBarActive(entry.min, entry.max) ? '#60a5fa' : '#3b82f6'}
                opacity={
                  activeDurationFilter?.min != null && !isBarActive(entry.min, entry.max)
                    ? 0.3
                    : 1
                }
                stroke={isBarActive(entry.min, entry.max) ? '#fff' : 'none'}
                strokeWidth={isBarActive(entry.min, entry.max) ? 2 : 0}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
