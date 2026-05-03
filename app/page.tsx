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
import { DataGenerator } from '@/components/DataGenerator';
import { RadarOverlay } from '@/components/RadarOverlay';
import { ChatBox } from '@/components/ChatBox';

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

  // Radar scan animation state
  const [isRadarScanning, setIsRadarScanning] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Update current time every second for real-time feel
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
    setIsRadarScanning(true);
  };

  const handleRadarScanComplete = () => {
    setDarkPeriods(SAMPLE_DARK_PERIODS);
    setRecords([]);
    setIsDemo(true);
    setIsRadarScanning(false);
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
    <main className="min-h-screen bg-[#0a1628] text-white p-6 tactical-grid relative">
      {/* Radar scanning overlay */}
      <RadarOverlay isScanning={isRadarScanning} onScanComplete={handleRadarScanComplete} />

      {/* Scan lines effect */}
      <div className="fixed inset-0 pointer-events-none z-[5] scan-lines" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Naval Header */}
        <header className="mb-8 relative">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-3 h-3 bg-cyan-400 rounded-full shadow-[0_0_10px_#00d4ff] animate-pulse" />
                <span className="text-cyan-400/70 font-mono text-xs tracking-widest">MARITIME SURVEILLANCE SYSTEM</span>
              </div>
              <h1 className="text-4xl font-bold mb-2 text-white tracking-tight">
                GHOST FLEET DETECTOR
              </h1>
              <p className="text-cyan-300/60 font-mono text-sm">
                DETECTING DARK VESSELS // TRACKING AIS GAPS // MONITORING SUSPICIOUS ACTIVITY
              </p>
            </div>
            <div className="text-right font-mono">
              <div className="text-cyan-400 text-2xl tabular-nums">
                {currentTime.toLocaleTimeString('en-US', { hour12: false })}
              </div>
              <div className="text-cyan-300/50 text-xs">
                {currentTime.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }).toUpperCase()}
              </div>
              <div className="mt-2 flex items-center gap-2 justify-end">
                <div className="w-2 h-2 bg-green-400 rounded-full shadow-[0_0_6px_#22c55e]" />
                <span className="text-green-400/80 text-xs">SYSTEM ONLINE</span>
              </div>
            </div>
          </div>
          {/* Decorative line */}
          <div className="mt-4 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
        </header>

        {darkPeriods.length === 0 ? (
          <div>
            <div className="mb-4 flex items-center gap-4 flex-wrap">
              <label className="text-sm text-cyan-300/80 font-mono flex items-center gap-2">
                <span className="text-cyan-400/60">MIN_DARK_PERIOD:</span>
                <input
                  type="number"
                  value={minGapHours}
                  onChange={(e) => setMinGapHours(Number(e.target.value))}
                  className="w-20 bg-[#132743] border border-cyan-500/30 rounded px-2 py-1 text-cyan-300 font-mono text-center focus:border-cyan-400 focus:outline-none"
                  min={1}
                  max={72}
                />
                <span className="text-cyan-400/60">HRS</span>
              </label>
              {uploadHistory.length > 0 && (
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="text-sm text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1"
                >
                  <span className="w-2 h-2 bg-cyan-400/50 rounded-full" />
                  {showHistory ? 'HIDE' : 'SHOW'} HISTORY [{uploadHistory.length}]
                </button>
              )}
            </div>

            {showHistory && uploadHistory.length > 0 && (
              <div className="mb-6 data-panel rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3 text-cyan-300 font-mono">// PREVIOUS ANALYSES</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {uploadHistory.map((batch) => (
                    <button
                      key={batch.id}
                      onClick={() => handleLoadFromHistory(batch.id)}
                      className="w-full text-left bg-[#1e3a5f]/50 hover:bg-[#2d5a87]/50 border border-cyan-500/20 hover:border-cyan-400/40 rounded p-3 transition-all"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-mono text-cyan-200">{batch.filename || 'UNNAMED'}</span>
                        <span className="text-sm text-cyan-400/70 font-mono">
                          {batch.dark_periods_found} DETECTIONS
                        </span>
                      </div>
                      <div className="text-xs text-cyan-500/50 mt-1 font-mono">
                        {new Date(batch.created_at).toLocaleString().toUpperCase()}
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
                    className="bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 px-6 py-2.5 rounded font-mono text-sm tracking-wide transition-all shadow-[0_0_15px_rgba(0,212,255,0.3)] hover:shadow-[0_0_25px_rgba(0,212,255,0.5)] flex items-center gap-2"
                  >
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    INITIALIZE DEMO SCAN
                  </button>
                  <button
                    onClick={handleLoadAllFromDatabase}
                    disabled={isLoading || dbCount === 0}
                    className="bg-[#1e3a5f] hover:bg-[#2d5a87] border border-cyan-500/30 hover:border-cyan-400/50 px-6 py-2.5 rounded font-mono text-sm tracking-wide transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                        LOADING...
                      </>
                    ) : (
                      <>
                        <span className="text-cyan-400">▸</span>
                        LOAD DATABASE {dbCount > 0 && `[${dbCount}]`}
                      </>
                    )}
                  </button>
                </div>
              </div>
              <div className="lg:col-span-1">
                <MagicScanner onSubscribe={handleScannerSubscribe} />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Top row: Stats and Live Feed */}
            <div className="grid lg:grid-cols-5 gap-4">
              <div className="lg:col-span-4">
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

            {/* Score change notification */}
            {scoreChangeNotification?.visible && (
              <div className="fixed top-4 right-4 z-50 data-panel rounded-lg shadow-[0_0_30px_rgba(0,212,255,0.2)] p-4 max-w-sm border-l-4 border-l-cyan-400">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded bg-cyan-500/20 flex items-center justify-center">
                    <span className="text-cyan-400 text-lg">◉</span>
                  </div>
                  <div>
                    <p className="font-mono text-cyan-200 tracking-wide">RISK RECALCULATED</p>
                    <div className="text-sm mt-2 space-y-1 font-mono">
                      {scoreChangeNotification.upgraded > 0 && (
                        <p className="text-red-400 flex items-center gap-2">
                          <span>▲</span> {scoreChangeNotification.upgraded} VESSEL{scoreChangeNotification.upgraded > 1 ? 'S' : ''} ELEVATED
                        </p>
                      )}
                      {scoreChangeNotification.downgraded > 0 && (
                        <p className="text-green-400 flex items-center gap-2">
                          <span>▼</span> {scoreChangeNotification.downgraded} VESSEL{scoreChangeNotification.downgraded > 1 ? 'S' : ''} REDUCED
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Vessel Detail Modal */}
            {selectedPeriod && (
              <VesselDetailModal
                period={selectedPeriod}
                onClose={() => setSelectedPeriod(null)}
              />
            )}

            {/* Main content: Map on left, Charts/Table on right */}
            <div className="grid lg:grid-cols-5 gap-4">
              {/* Left side: Tactical Map */}
              <div className="lg:col-span-3">
                <div className="data-panel rounded-lg p-4 h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_6px_#00d4ff]" />
                    <h2 className="text-lg font-semibold text-cyan-100 font-mono tracking-wide">TACTICAL MAP</h2>
                    <div className="flex-1 h-px bg-gradient-to-r from-cyan-500/30 to-transparent" />
                  </div>
                  <div className="h-[calc(100vh-320px)] min-h-[400px]">
                    <DarkPeriodsMap
                      darkPeriods={darkPeriods}
                      onSelectPeriod={setSelectedPeriod}
                      isLiveScanning={isLiveFeedActive}
                    />
                  </div>
                </div>
              </div>

              {/* Right side: Charts and Threat Analysis */}
              <div className="lg:col-span-2 space-y-4">
                {/* Charts stacked vertically */}
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

                {/* Filter indicator */}
                {(chartRiskFilter || chartDurationFilter.min != null) && (
                  <div className="bg-cyan-900/20 border border-cyan-500/30 rounded-lg p-2 flex items-center justify-between">
                    <span className="text-cyan-300 text-xs font-mono">
                      FILTERED: {filteredDarkPeriods.length}/{darkPeriods.length}
                      {chartRiskFilter && ` // ${chartRiskFilter}`}
                    </span>
                    <button
                      onClick={() => {
                        setChartRiskFilter(null);
                        setChartDurationFilter({ min: null, max: null });
                      }}
                      className="text-[10px] bg-cyan-600/50 hover:bg-cyan-500/50 border border-cyan-400/30 px-2 py-0.5 rounded font-mono"
                    >
                      CLEAR
                    </button>
                  </div>
                )}

                {/* Threat Analysis Table */}
                <div className="data-panel rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-2 h-2 bg-red-400 rounded-full shadow-[0_0_6px_#f87171] animate-pulse" />
                    <h2 className="text-lg font-semibold text-cyan-100 font-mono tracking-wide">THREAT ANALYSIS</h2>
                    <div className="flex-1 h-px bg-gradient-to-r from-red-500/30 to-transparent" />
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    <VesselTable darkPeriods={filteredDarkPeriods} onSelect={setSelectedPeriod} />
                  </div>
                </div>
              </div>
            </div>

            {/* Scoring Config - collapsible or in a drawer could be nice */}
            <ScoringConfig factors={scoringFactors} onChange={setScoringFactors} />

            <div className="flex gap-3 flex-wrap data-panel rounded-lg p-4">
              <div className="text-cyan-400/60 font-mono text-xs mr-2 self-center">EXPORT:</div>
              <button
                onClick={handleDownloadCSV}
                className="bg-[#1e3a5f] hover:bg-[#2d5a87] border border-cyan-500/30 hover:border-cyan-400/50 px-4 py-2 rounded font-mono text-sm transition-all flex items-center gap-2"
              >
                <span className="text-cyan-400">▼</span> CSV
              </button>
              <button
                onClick={handleDownloadJSON}
                className="bg-[#1e3a5f] hover:bg-[#2d5a87] border border-cyan-500/30 hover:border-cyan-400/50 px-4 py-2 rounded font-mono text-sm transition-all flex items-center gap-2"
              >
                <span className="text-cyan-400">▼</span> JSON
              </button>
              <button
                onClick={handlePrint}
                className="bg-[#1e3a5f] hover:bg-[#2d5a87] border border-cyan-500/30 hover:border-cyan-400/50 px-4 py-2 rounded font-mono text-sm transition-all print:hidden flex items-center gap-2"
              >
                <span className="text-cyan-400">◎</span> PRINT
              </button>
              <div className="w-px h-8 bg-cyan-500/20 self-center mx-2" />
              <button
                onClick={handleSaveToSupabase}
                disabled={isSaving || saveStatus === 'saved'}
                className="bg-green-600/30 hover:bg-green-500/40 border border-green-500/50 hover:border-green-400/70 px-4 py-2 rounded font-mono text-sm transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <span className="w-3 h-3 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                    SAVING...
                  </>
                ) : saveStatus === 'saved' ? (
                  <>
                    <span className="text-green-400">✓</span> SAVED
                  </>
                ) : (
                  <>
                    <span className="text-green-400">▲</span> SAVE TO DB
                  </>
                )}
              </button>
              <button
                onClick={handleReset}
                className="bg-amber-600/30 hover:bg-amber-500/40 border border-amber-500/50 hover:border-amber-400/70 px-4 py-2 rounded font-mono text-sm transition-all flex items-center gap-2"
              >
                <span className="text-amber-400">↻</span> NEW SCAN
              </button>
            </div>
            {saveStatus === 'error' && (
              <p className="text-red-400 text-sm mt-2 font-mono">
                ⚠ DATABASE CONNECTION FAILED // DATA AVAILABLE LOCALLY
              </p>
            )}

            <DataGenerator onGenerate={(data) => {
              setDarkPeriods(data);
              setRecords([]);
              setIsDemo(false);
            }} />
          </div>
        )}

        {/* AI Chat Assistant */}
        {darkPeriods.length > 0 && <ChatBox darkPeriods={darkPeriods} />}
      </div>
    </main>
  );
}
