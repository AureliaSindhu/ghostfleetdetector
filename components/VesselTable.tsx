'use client';

import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, Filter, Search, ChevronLeft, ChevronRight } from 'lucide-react';
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
const PAGE_SIZE = 20;

type SortField = 'score' | 'duration' | 'distance' | 'risk';
type SortDir = 'asc' | 'desc';

export function VesselTable({ darkPeriods, onSelect }: VesselTableProps) {
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [minScore, setMinScore] = useState<number>(0);
  const [mmsiSearch, setMmsiSearch] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('score');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);

  const filteredAndSorted = useMemo(() => {
    let result = [...darkPeriods];

    // Apply MMSI search
    if (mmsiSearch.trim()) {
      result = result.filter((dp) => dp.mmsi.includes(mmsiSearch.trim()));
    }

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
  }, [darkPeriods, riskFilter, minScore, mmsiSearch, sortField, sortDir]);

  // Reset page when filters change
  const totalPages = Math.ceil(filteredAndSorted.length / PAGE_SIZE);
  const paginatedData = filteredAndSorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDir === 'desc' ? (
      <ChevronDown className="w-4 h-4 inline" />
    ) : (
      <ChevronUp className="w-4 h-4 inline" />
    );
  };

  return (
    <div className="font-sans text-cyan-50">
      {/* Filter Toggle */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-cyan-500/15 bg-[#05111f] px-4 py-3">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 text-xs text-cyan-200/75 hover:text-white"
        >
          <Filter className="w-4 h-4" />
          {showFilters ? 'Hide Filters' : 'Show Filters'}
          {(riskFilter !== 'ALL' || minScore > 0 || mmsiSearch.trim()) && (
            <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded">Active</span>
          )}
        </button>
        <span className="text-xs text-cyan-100/55">
          {filteredAndSorted.length} result{filteredAndSorted.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="m-3 p-3 bg-cyan-500/8 border border-cyan-500/20 rounded-md flex flex-wrap gap-4 items-end">
          <div>
            <label className="text-xs text-cyan-100/65 block mb-1">Search MMSI</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-cyan-200/45" />
              <input
                type="text"
                value={mmsiSearch}
                onChange={(e) => {
                  setMmsiSearch(e.target.value);
                  setPage(0);
                }}
                placeholder="e.g. 538006"
                className="bg-[#061525] text-white border border-cyan-500/20 rounded pl-8 pr-3 py-1.5 text-sm w-32"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-cyan-100/65 block mb-1">Risk Level</label>
            <select
              value={riskFilter}
              onChange={(e) => {
                setRiskFilter(e.target.value);
                setPage(0);
              }}
              className="bg-[#061525] text-white border border-cyan-500/20 rounded px-3 py-1.5 text-sm"
            >
              {RISK_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level === 'ALL' ? 'All Levels' : level}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-cyan-100/65 block mb-1">Min Score</label>
            <input
              type="number"
              value={minScore}
              onChange={(e) => {
                setMinScore(Number(e.target.value));
                setPage(0);
              }}
              min={0}
              max={100}
              className="bg-[#061525] text-white border border-cyan-500/20 rounded px-3 py-1.5 text-sm w-20"
            />
          </div>
          <button
            onClick={() => {
              setRiskFilter('ALL');
              setMinScore(0);
              setMmsiSearch('');
              setPage(0);
            }}
            className="text-sm text-cyan-200/70 hover:text-white"
          >
            Reset
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-cyan-500/20 bg-[#071827] text-cyan-100/70">
              <th className="text-left px-4 py-3 font-semibold">MMSI</th>
              <th
                className="text-left px-4 py-3 cursor-pointer font-semibold hover:text-cyan-200"
                onClick={() => handleSort('score')}
              >
                Score {renderSortIcon('score')}
              </th>
              <th
                className="text-left px-4 py-3 cursor-pointer font-semibold hover:text-cyan-200"
                onClick={() => handleSort('risk')}
              >
                Risk {renderSortIcon('risk')}
              </th>
              <th
                className="text-left px-4 py-3 cursor-pointer font-semibold hover:text-cyan-200"
                onClick={() => handleSort('duration')}
              >
                Duration {renderSortIcon('duration')}
              </th>
              <th
                className="text-left px-4 py-3 cursor-pointer font-semibold hover:text-cyan-200"
                onClick={() => handleSort('distance')}
              >
                Distance {renderSortIcon('distance')}
              </th>
              <th className="text-left px-4 py-3 font-semibold">Reasons</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-cyan-100/45">
                  No vessels match the current filters
                </td>
              </tr>
            ) : (
              paginatedData.map((dp, i) => (
                <tr
                  key={`${dp.mmsi}-${i}`}
                  className="border-b border-cyan-500/10 cursor-pointer text-cyan-50/90 hover:bg-cyan-500/10"
                  onClick={() => onSelect?.(dp)}
                >
                  <td className="px-4 py-3 font-sans text-cyan-100">{dp.mmsi}</td>
                  <td className="px-4 py-3 text-cyan-100/85">{dp.suspicionScore}/100</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-bold text-white ${RISK_BADGES[dp.riskLevel]}`}
                    >
                      {dp.riskLevel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-cyan-100/85">{dp.gapHours.toFixed(1)}h</td>
                  <td className="px-4 py-3 text-cyan-100/85">{dp.distanceNm.toFixed(0)} nm</td>
                  <td className="px-4 py-3 text-cyan-100/60 text-xs max-w-xs truncate">
                    {dp.reasons.join('; ')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="sticky bottom-0 flex items-center justify-between border-t border-cyan-500/15 bg-[#05111f] px-4 py-3">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="flex items-center gap-1 text-sm text-cyan-200/70 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>
          <span className="text-sm text-cyan-100/55">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="flex items-center gap-1 text-sm text-cyan-200/70 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
