'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { FileUpload } from '@/components/FileUpload';
import { DarkPeriodsMap } from '@/components/Map';
import { RiskDistributionChart, DurationHistogram } from '@/components/Charts';
import { VesselTable } from '@/components/VesselTable';
import { StatsCards } from '@/components/StatsCards';
import { VesselDetailModal } from '@/components/VesselDetailModal';
import { parseAISData, validateAISData, groupByVessel, getDataSummary } from '@/lib/dataLoader';
import { findAllDarkPeriods } from '@/lib/detector';
import { scoreAllDarkPeriods, rescoreAllWithFactors } from '@/lib/scorer';
import { ScoredDarkPeriod, AISRecord } from '@/types';
import { SAMPLE_DARK_PERIODS, SAMPLE_SUMMARY } from '@/lib/sampleData';
import { useSupabase } from '@/lib/supabase/hooks';
import { saveDarkPeriodsAnon, fetchAllDarkPeriods, fetchUploadHistory } from '@/lib/supabase/anon-data';
import { LiveFeed } from '@/components/LiveFeed';
import { ScoringConfig, ScoringFactors, DEFAULT_SCORING_FACTORS } from '@/components/ScoringConfig';
import { MagicScanner } from '@/components/MagicScanner';

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
  const [dbCount, setDbCount] = useState<number>(0);

  // Chart filter state
  const [chartRiskFilter, setChartRiskFilter] = useState<string | null>(null);
  const [chartDurationFilter, setChartDurationFilter] = useState<{ min: number | null; max: number | null }>({ min: null, max: null });

  // Live feed state
  const [isLiveFeedActive, setIsLiveFeedActive] = useState(false);

  // Scoring configuration
  const [scoringFactors, setScoringFactors] = useState<ScoringFactors>(DEFAULT_SCORING_FACTORS);
  const [scoreChangeNotification, setScoreChangeNotification] = useState<{
    upgraded: number;
    downgraded: number;
    visible: boolean;
  } | null>(null);

  // Rescore dark periods when scoring factors change
  useEffect(() => {
    if (darkPeriods.length > 0) {
      const rescored = rescoreAllWithFactors(darkPeriods, scoringFactors);

      // Track risk level changes
      let upgraded = 0;
      let downgraded = 0;
      const riskOrder = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

      rescored.forEach((newDp, i) => {
        const oldDp = darkPeriods[i];
        if (oldDp) {
          const oldIdx = riskOrder.indexOf(oldDp.riskLevel);
          const newIdx = riskOrder.indexOf(newDp.riskLevel);
          if (newIdx > oldIdx) upgraded++;
          if (newIdx < oldIdx) downgraded++;
        }
      });

      const scoresChanged = rescored.some(
        (dp, i) => dp.suspicionScore !== darkPeriods[i]?.suspicionScore
      );

      if (scoresChanged) {
        setDarkPeriods(rescored);
        if (upgraded > 0 || downgraded > 0) {
          setScoreChangeNotification({ upgraded, downgraded, visible: true });
          setTimeout(() => {
            setScoreChangeNotification((prev) => prev ? { ...prev, visible: false } : null);
          }, 3000);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoringFactors]);

  const handleNewLiveAlert = useCallback((alert: ScoredDarkPeriod) => {
    setDarkPeriods((prev) => [alert, ...prev]);
  }, []);

  const handleScannerSubscribe = useCallback((email: string, preferences: { criticalOnly: boolean; highAndAbove: boolean; allAlerts: boolean; regions: string[] }) => {
    console.log('Scanner activated:', email, preferences);
    // In a real app, this would save to Supabase
  }, []);

  const supabase = useSupabase();

  // Auto-load demo data on mount for better first impression
  useEffect(() => {
    setDarkPeriods(SAMPLE_DARK_PERIODS);
    setIsDemo(true);
  }, []);

  // Load history and count on mount
  useEffect(() => {
    fetchUploadHistory(supabase).then((history) => {
      setUploadHistory(history);
      // Sum up all dark periods
      const total = history.reduce((sum, batch) => sum + (batch.dark_periods_found || 0), 0);
      setDbCount(total);
    });
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

  // Filter dark periods based on chart selections
  const filteredDarkPeriods = useMemo(() => {
    let result = darkPeriods;

    if (chartRiskFilter) {
      result = result.filter((dp) => dp.riskLevel === chartRiskFilter);
    }

    if (chartDurationFilter.min != null && chartDurationFilter.max != null) {
      result = result.filter(
        (dp) => dp.gapHours >= chartDurationFilter.min! && dp.gapHours < chartDurationFilter.max!
      );
    }

    return result;
  }, [darkPeriods, chartRiskFilter, chartDurationFilter]);

  const handleDurationFilter = (min: number | null, max: number | null) => {
    setChartDurationFilter({ min, max });
  };

  const handleDownloadCSV = () => {
    const csv = [
      'mmsi,score,risk,gap_hours,distance_nm,last_lat,last_lon,reappear_lat,reappear_lon,reasons',
      ...darkPeriods.map(
        (dp) =>
          `${dp.mmsi},${dp.suspicionScore},${dp.riskLevel},${dp.gapHours.toFixed(1)},${dp.distanceNm.toFixed(1)},${dp.lastLat},${dp.lastLon},${dp.reappearLat},${dp.reappearLon},"${dp.reasons.join('; ')}"`
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

  const handleDownloadJSON = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      totalDarkPeriods: darkPeriods.length,
      riskSummary: {
        critical: darkPeriods.filter((d) => d.riskLevel === 'CRITICAL').length,
        high: darkPeriods.filter((d) => d.riskLevel === 'HIGH').length,
        medium: darkPeriods.filter((d) => d.riskLevel === 'MEDIUM').length,
        low: darkPeriods.filter((d) => d.riskLevel === 'LOW').length,
      },
      darkPeriods: darkPeriods.map((dp) => ({
        mmsi: dp.mmsi,
        suspicionScore: dp.suspicionScore,
        riskLevel: dp.riskLevel,
        gapHours: dp.gapHours,
        distanceNm: dp.distanceNm,
        impliedSpeedKnots: dp.impliedSpeedKnots,
        lastPosition: { lat: dp.lastLat, lon: dp.lastLon },
        reappearPosition: { lat: dp.reappearLat, lon: dp.reappearLon },
        lastSeenTime: dp.lastSeenTime,
        reappearTime: dp.reappearTime,
        reasons: dp.reasons,
      })),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ghost_fleet_results.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
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
    if (periods.length > 0) {
      setDarkPeriods(periods);
      setRecords([]);
      setIsDemo(false);
      setShowHistory(false);
    }
    setIsLoading(false);
  };

  const handleLoadAllFromDatabase = async () => {
    setIsLoading(true);
    const periods = await fetchAllDarkPeriods(supabase, { limit: 500 });
    if (periods.length > 0) {
      setDarkPeriods(periods);
      setRecords([]);
      setIsDemo(false);
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

            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <FileUpload onFileLoad={handleFileLoad} isLoading={isLoading} />
                <div className="mt-4 flex justify-center gap-4 flex-wrap">
                  <button
                    onClick={handleDemo}
                    className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded transition-colors"
                  >
                    🎮 Run Demo with Sample Data
                  </button>
                  <button
                    onClick={handleLoadAllFromDatabase}
                    disabled={isLoading || dbCount === 0}
                    className="bg-cyan-600 hover:bg-cyan-700 px-4 py-2 rounded transition-colors disabled:opacity-50"
                  >
                    {isLoading ? '⏳ Loading...' : `🗄️ Load from Database${dbCount > 0 ? ` (${dbCount})` : ''}`}
                  </button>
                </div>
              </div>
              <div className="lg:col-span-1">
                <MagicScanner onSubscribe={handleScannerSubscribe} />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid lg:grid-cols-4 gap-6">
              <div className="lg:col-span-3">
                <StatsCards
                  darkPeriods={darkPeriods}
                  totalVessels={summary?.uniqueVessels || 0}
                  totalRecords={summary?.totalRecords || 0}
                />
              </div>
              <div className="lg:col-span-1">
                <LiveFeed
                  onNewAlert={handleNewLiveAlert}
                  isActive={isLiveFeedActive}
                  onToggle={() => setIsLiveFeedActive(!isLiveFeedActive)}
                />
              </div>
            </div>

            <ScoringConfig factors={scoringFactors} onChange={setScoringFactors} />

            {/* Score change notification */}
            {scoreChangeNotification?.visible && (
              <div className="fixed top-4 right-4 z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-xl p-4 max-w-sm animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">📊</div>
                  <div>
                    <p className="font-semibold text-white">Scores Updated</p>
                    <div className="text-sm text-gray-300 mt-1 space-y-1">
                      {scoreChangeNotification.upgraded > 0 && (
                        <p className="text-red-400">
                          ↑ {scoreChangeNotification.upgraded} vessel{scoreChangeNotification.upgraded > 1 ? 's' : ''} increased risk
                        </p>
                      )}
                      {scoreChangeNotification.downgraded > 0 && (
                        <p className="text-green-400">
                          ↓ {scoreChangeNotification.downgraded} vessel{scoreChangeNotification.downgraded > 1 ? 's' : ''} decreased risk
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

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
              <RiskDistributionChart
                darkPeriods={darkPeriods}
                onRiskFilter={setChartRiskFilter}
                activeRiskFilter={chartRiskFilter}
              />
              <DurationHistogram
                darkPeriods={darkPeriods}
                onDurationFilter={handleDurationFilter}
                activeDurationFilter={chartDurationFilter}
              />
            </div>

            {(chartRiskFilter || chartDurationFilter.min != null) && (
              <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-3 flex items-center justify-between">
                <span className="text-blue-300 text-sm">
                  Showing {filteredDarkPeriods.length} of {darkPeriods.length} dark periods
                  {chartRiskFilter && ` (${chartRiskFilter} risk)`}
                  {chartDurationFilter.min != null && ` (${chartDurationFilter.min}-${chartDurationFilter.max === Infinity ? '72+' : chartDurationFilter.max}h duration)`}
                </span>
                <button
                  onClick={() => {
                    setChartRiskFilter(null);
                    setChartDurationFilter({ min: null, max: null });
                  }}
                  className="text-xs bg-blue-600 hover:bg-blue-500 px-2 py-1 rounded"
                >
                  Clear All Filters
                </button>
              </div>
            )}

            <div className="bg-gray-800 rounded-lg p-4">
              <h2 className="text-xl font-semibold mb-4">🚨 Top Suspicious Vessels</h2>
              <VesselTable darkPeriods={filteredDarkPeriods} onSelect={setSelectedPeriod} />
            </div>

            <div className="flex gap-4 flex-wrap">
              <button
                onClick={handleDownloadCSV}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded transition-colors"
              >
                📥 Download CSV
              </button>
              <button
                onClick={handleDownloadJSON}
                className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded transition-colors"
              >
                📥 Download JSON
              </button>
              <button
                onClick={handlePrint}
                className="bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded transition-colors print:hidden"
              >
                🖨️ Print Report
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
