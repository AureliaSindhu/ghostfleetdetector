'use client';

import { useState, useCallback } from 'react';
import { FileUpload } from '@/components/FileUpload';
import { DarkPeriodsMap } from '@/components/Map';
import { RiskDistributionChart, DurationHistogram } from '@/components/Charts';
import { VesselTable } from '@/components/VesselTable';
import { StatsCards } from '@/components/StatsCards';
import { VesselDetailModal } from '@/components/VesselDetailModal';
import { IntelReport } from '@/components/IntelReport';
import { parseAISData, validateAISData, groupByVessel, getDataSummary } from '@/lib/dataLoader';
import { findAllDarkPeriods } from '@/lib/detector';
import { scoreAllDarkPeriods } from '@/lib/scorer';
import { ScoredDarkPeriod, AISRecord } from '@/types';
import { SAMPLE_DARK_PERIODS, SAMPLE_SUMMARY } from '@/lib/sampleData';

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [records, setRecords] = useState<AISRecord[]>([]);
  const [darkPeriods, setDarkPeriods] = useState<ScoredDarkPeriod[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<ScoredDarkPeriod | null>(null);
  const [minGapHours, setMinGapHours] = useState(6);
  const [isDemo, setIsDemo] = useState(false);

  const handleFileLoad = useCallback(
    (content: string) => {
      setIsLoading(true);
      setTimeout(() => {
        try {
          const parsed = parseAISData(content);
          const validated = validateAISData(parsed);
          setRecords(validated);
          const groups = groupByVessel(validated);
          const periods = findAllDarkPeriods(groups, minGapHours);
          setDarkPeriods(scoreAllDarkPeriods(periods));
          setIsDemo(false);
        } catch (error) {
          console.error('Error processing file:', error);
        } finally {
          setIsLoading(false);
        }
      }, 100);
    },
    [minGapHours]
  );

  const handleDemo = () => {
    setDarkPeriods(SAMPLE_DARK_PERIODS);
    setRecords([]);
    setIsDemo(true);
  };

  const summary = isDemo ? SAMPLE_SUMMARY : records.length > 0 ? getDataSummary(records) : null;

  const handleDownload = () => {
    const csv = [
      'mmsi,score,risk,gap_hours,distance_nm,reasons',
      ...darkPeriods.map(
        (dp) =>
          `${dp.mmsi},${dp.suspicionScore},${dp.riskLevel},${dp.gapHours},${dp.distanceNm},"${dp.reasons.join('; ')}"`
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ghost_fleet_results.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setRecords([]);
    setDarkPeriods([]);
    setSelectedPeriod(null);
    setIsDemo(false);
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-2">🚢 Ghost Fleet Detector</h1>
          <p className="text-gray-400">
            Detect vessels going dark to evade sanctions, smuggle cargo, and fish illegally
          </p>
        </header>

        {darkPeriods.length === 0 ? (
          <div>
            <div className="mb-4 flex items-center gap-4">
              <label className="text-sm text-gray-300">
                Min dark period:
                <input
                  type="number"
                  value={minGapHours}
                  onChange={(e) => setMinGapHours(Number(e.target.value))}
                  className="ml-2 w-20 bg-gray-800 rounded px-2 py-1 text-white"
                  min={1}
                  max={72}
                />
                <span className="ml-1">hours</span>
              </label>
            </div>
            <FileUpload onFileLoad={handleFileLoad} isLoading={isLoading} />
            <div className="mt-4 text-center">
              <button
                onClick={handleDemo}
                className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded transition-colors"
              >
                🎮 Run Demo with Sample Data
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <StatsCards
              darkPeriods={darkPeriods}
              totalVessels={summary?.uniqueVessels || 0}
              totalRecords={summary?.totalRecords || 0}
            />

            <div className="bg-gray-800 rounded-lg p-4">
              <h2 className="text-xl font-semibold mb-4">🗺️ Dark Periods Map</h2>
              <DarkPeriodsMap
                darkPeriods={darkPeriods}
                onSelectPeriod={setSelectedPeriod}
              />
            </div>

            {/* Vessel Detail Modal */}
            {selectedPeriod && (
              <VesselDetailModal
                period={selectedPeriod}
                onClose={() => setSelectedPeriod(null)}
              />
            )}

            <div className="grid md:grid-cols-2 gap-6">
              <RiskDistributionChart darkPeriods={darkPeriods} />
              <DurationHistogram darkPeriods={darkPeriods} />
            </div>

            <div className="bg-gray-800 rounded-lg p-4">
              <h2 className="text-xl font-semibold mb-4">🚨 Top Suspicious Vessels</h2>
              <VesselTable darkPeriods={darkPeriods} onSelect={setSelectedPeriod} />
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleDownload}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded transition-colors"
              >
                📥 Download Results CSV
              </button>
              <button
                onClick={handleReset}
                className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded transition-colors"
              >
                Upload New File
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
