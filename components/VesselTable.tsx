'use client';

import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, Filter } from 'lucide-react';
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

const RISK_LEVELS = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const;

type SortField = 'score' | 'duration' | 'distance' | 'risk';
type SortDir = 'asc' | 'desc';

export function VesselTable({ darkPeriods, onSelect }: VesselTableProps) {
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [minScore, setMinScore] = useState<number>(0);
  const [sortField, setSortField] = useState<SortField>('score');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [showFilters, setShowFilters] = useState(false);

  const filteredAndSorted = useMemo(() => {
    let result = [...darkPeriods];

    // Apply risk filter
    if (riskFilter !== 'ALL') {
      result = result.filter((dp) => dp.riskLevel === riskFilter);
    }

    // Apply min score filter
    if (minScore > 0) {
      result = result.filter((dp) => dp.suspicionScore >= minScore);
    }

    // Apply sorting
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'score':
          cmp = a.suspicionScore - b.suspicionScore;
          break;
        case 'duration':
          cmp = a.gapHours - b.gapHours;
          break;
        case 'distance':
          cmp = a.distanceNm - b.distanceNm;
          break;
        case 'risk':
          const riskOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
          cmp = riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
          break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [darkPeriods, riskFilter, minScore, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDir === 'desc' ? (
      <ChevronDown className="w-4 h-4 inline" />
    ) : (
      <ChevronUp className="w-4 h-4 inline" />
    );
  };

  return (
    <div>
      {/* Filter Toggle */}
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white"
        >
          <Filter className="w-4 h-4" />
          {showFilters ? 'Hide Filters' : 'Show Filters'}
          {(riskFilter !== 'ALL' || minScore > 0) && (
            <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded">Active</span>
          )}
        </button>
        <span className="text-sm text-gray-500">
          Showing {Math.min(filteredAndSorted.length, 50)} of {filteredAndSorted.length}
        </span>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="mb-4 p-4 bg-gray-700/50 rounded-lg flex flex-wrap gap-4 items-center">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Risk Level</label>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="bg-gray-800 text-white rounded px-3 py-1.5 text-sm"
            >
              {RISK_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level === 'ALL' ? 'All Levels' : level}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Min Score</label>
            <input
              type="number"
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              min={0}
              max={100}
              className="bg-gray-800 text-white rounded px-3 py-1.5 text-sm w-20"
            />
          </div>
          <button
            onClick={() => {
              setRiskFilter('ALL');
              setMinScore(0);
            }}
            className="text-sm text-gray-400 hover:text-white mt-4"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left p-3">MMSI</th>
              <th
                className="text-left p-3 cursor-pointer hover:text-blue-400"
                onClick={() => handleSort('score')}
              >
                Score <SortIcon field="score" />
              </th>
              <th
                className="text-left p-3 cursor-pointer hover:text-blue-400"
                onClick={() => handleSort('risk')}
              >
                Risk <SortIcon field="risk" />
              </th>
              <th
                className="text-left p-3 cursor-pointer hover:text-blue-400"
                onClick={() => handleSort('duration')}
              >
                Duration <SortIcon field="duration" />
              </th>
              <th
                className="text-left p-3 cursor-pointer hover:text-blue-400"
                onClick={() => handleSort('distance')}
              >
                Distance <SortIcon field="distance" />
              </th>
              <th className="text-left p-3">Reasons</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSorted.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500">
                  No vessels match the current filters
                </td>
              </tr>
            ) : (
              filteredAndSorted.slice(0, 50).map((dp, i) => (
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
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
