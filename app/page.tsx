'use client';

import { useState, useCallback, useEffect } from 'react';
import { FileUpload } from '@/components/FileUpload';
import { DarkPeriodsMap } from '@/components/Map';
import { RiskDistributionChart, DurationHistogram } from '@/components/Charts';
import { VesselTable } from '@/components/VesselTable';
import { StatsCards } from '@/components/StatsCards';
import { VesselDetailModal } from '@/components/VesselDetailModal';
import { parseAISData, validateAISData, groupByVessel, getDataSummary } from '@/lib/dataLoader';
import { findAllDarkPeriods } from '@/lib/detector';
import { scoreAllDarkPeriods } from '@/lib/scorer';
import { ScoredDarkPeriod, AISRecord } from '@/types';
import { SAMPLE_DARK_PERIODS, SAMPLE_SUMMARY } from '@/lib/sampleData';
import { useSupabase } from '@/lib/supabase/hooks';
import { saveDarkPeriodsAnon, fetchAllDarkPeriods, fetchUploadHistory } from '@/lib/supabase/anon-data';

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [records, setRecords] = useState<AISRecord[]>([]);
  const [darkPeriods, setDarkPeriods] = useState<ScoredDarkPeriod[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<ScoredDarkPeriod | null>(null);
  const [minGapHours, setMinGapHours] = useState(6);
  const [isDemo, setIsDemo] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [uploadHistory, setUploadHistory] = useState<Array<{ id: string; filename: string | null; dark_periods_found: number; created_at: string }>>([]);
  const [showHistory, setShowHistory] = useState(false);

  const supabase = useSupabase();

  // Load history on mount
  useEffect(() => {
    fetchUploadHistory(supabase).then(setUploadHistory);
  }, [supabase]);

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
    setSaveStatus('idle');
  };

  const handleSaveToSupabase = async () => {
    if (darkPeriods.length === 0) return;
    setIsSaving(true);
    setSaveStatus('idle');

    const result = await saveDarkPeriodsAnon(supabase, darkPeriods, 'manual_upload');

    if (result.success) {
      setSaveStatus('saved');
      // Refresh history
      fetchUploadHistory(supabase).then(setUploadHistory);
    } else {
      setSaveStatus('error');
    }
    setIsSaving(false);
  };

  const handleLoadFromHistory = async (batchId: string) => {
    setIsLoading(true);
    const periods = await fetchAllDarkPeriods(supabase, { limit: 100 });
    // Filter by batch if needed - for now just load all
    if (periods.length > 0) {
      setDarkPeriods(periods);
      setIsDemo(false);
      setShowHistory(false);
    }
    setIsLoading(false);
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
            <div className="mb-4 flex items-center gap-4 flex-wrap">
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
              {uploadHistory.length > 0 && (
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  📜 {showHistory ? 'Hide' : 'Show'} History ({uploadHistory.length})
                </button>
              )}
            </div>

            {showHistory && uploadHistory.length > 0 && (
              <div className="mb-6 bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3">📜 Previous Analyses</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {uploadHistory.map((batch) => (
                    <button
                      key={batch.id}
                      onClick={() => handleLoadFromHistory(batch.id)}
                      className="w-full text-left bg-gray-700 hover:bg-gray-600 rounded p-3 transition-colors"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{batch.filename || 'Unnamed'}</span>
                        <span className="text-sm text-gray-400">
                          {batch.dark_periods_found} dark periods
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(batch.created_at).toLocaleString()}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

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

            <div className="flex gap-4 flex-wrap">
              <button
                onClick={handleDownload}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded transition-colors"
              >
                📥 Download CSV
              </button>
              <button
                onClick={handleSaveToSupabase}
                disabled={isSaving || saveStatus === 'saved'}
                className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded transition-colors disabled:opacity-50"
              >
                {isSaving ? '💾 Saving...' : saveStatus === 'saved' ? '✅ Saved!' : '💾 Save to Database'}
              </button>
              <button
                onClick={handleReset}
                className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded transition-colors"
              >
                🔄 New Analysis
              </button>
            </div>
            {saveStatus === 'error' && (
              <p className="text-red-400 text-sm mt-2">
                Could not save to database. Data is still available locally.
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
