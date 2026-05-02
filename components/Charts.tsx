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
}

export function RiskDistributionChart({ darkPeriods }: ChartsProps) {
  const data = Object.entries(
    darkPeriods.reduce(
      (acc, dp) => {
        acc[dp.riskLevel] = (acc[dp.riskLevel] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    )
  ).map(([name, value]) => ({ name, value }));

  return (
    <div className="bg-gray-900 p-4 rounded-lg">
      <h3 className="text-white text-lg font-semibold mb-4">Risk Distribution</h3>
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
          >
            {data.map((entry) => (
              <Cell
                key={entry.name}
                fill={RISK_COLORS[entry.name as keyof typeof RISK_COLORS]}
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

export function DurationHistogram({ darkPeriods }: ChartsProps) {
  const ranges = [
    { range: '6-12h', min: 6, max: 12 },
    { range: '12-24h', min: 12, max: 24 },
    { range: '24-48h', min: 24, max: 48 },
    { range: '48-72h', min: 48, max: 72 },
    { range: '72h+', min: 72, max: Infinity },
  ];

  const data = ranges.map(({ range, min, max }) => ({
    range,
    count: darkPeriods.filter((dp) => dp.gapHours >= min && dp.gapHours < max)
      .length,
  }));

  return (
    <div className="bg-gray-900 p-4 rounded-lg">
      <h3 className="text-white text-lg font-semibold mb-4">
        Duration Distribution
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <XAxis dataKey="range" stroke="#fff" />
          <YAxis stroke="#fff" />
          <Tooltip />
          <Bar dataKey="count" fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
