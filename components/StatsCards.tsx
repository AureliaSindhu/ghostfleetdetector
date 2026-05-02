'use client';

import { ScoredDarkPeriod } from '@/types';
import { Ship, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';

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
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      <StatCard
        icon={<Ship className="w-6 h-6" />}
        label="Vessels"
        value={totalVessels.toLocaleString()}
        color="text-blue-400"
      />
      <StatCard
        icon={<Ship className="w-6 h-6" />}
        label="Dark Periods"
        value={darkPeriods.length.toLocaleString()}
        color="text-purple-400"
      />
      <StatCard
        icon={<AlertTriangle className="w-6 h-6" />}
        label="Critical"
        value={critical}
        color="text-red-500"
      />
      <StatCard
        icon={<AlertCircle className="w-6 h-6" />}
        label="High"
        value={high}
        color="text-orange-500"
      />
      <StatCard
        icon={<AlertCircle className="w-6 h-6" />}
        label="Medium"
        value={medium}
        color="text-yellow-500"
      />
      <StatCard
        icon={<CheckCircle className="w-6 h-6" />}
        label="Low"
        value={low}
        color="text-green-500"
      />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className={`${color} mb-2`}>{icon}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-gray-400 text-sm">{label}</div>
    </div>
  );
}
