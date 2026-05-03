'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { FileUpload } from '@/components/FileUpload';
import { DarkPeriodsMap } from '@/components/Map';
import { RiskDistributionChart } from '@/components/Charts';
import { StatsCards } from '@/components/StatsCards';
import { parseAISData, validateAISData, groupByVessel, getDataSummary } from '@/lib/dataLoader';
import { findAllDarkPeriods } from '@/lib/detector';
import { scoreAllDarkPeriods, rescoreAllWithFactors } from '@/lib/scorer';
import { ScoredDarkPeriod, AISRecord } from '@/types';
import { SAMPLE_DARK_PERIODS, SAMPLE_SUMMARY } from '@/lib/sampleData';
import { useSupabase } from '@/lib/supabase/hooks';
import { saveDarkPeriodsAnon, fetchAllDarkPeriods, fetchUploadHistory } from '@/lib/supabase/anon-data';
import { LiveFeed } from '@/components/LiveFeed';
import { ScoringFactors, DEFAULT_SCORING_FACTORS } from '@/components/ScoringConfig';
import { DataGenerator } from '@/components/DataGenerator';
import { RadarOverlay } from '@/components/RadarOverlay';
import { SettingsModal, SettingsButton } from '@/components/SettingsModal';
import { ChatBox } from '@/components/ChatBox';

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [records, setRecords] = useState<AISRecord[]>([]);
  const [darkPeriods, setDarkPeriods] = useState<ScoredDarkPeriod[]>(SAMPLE_DARK_PERIODS);
  const [selectedPeriod, setSelectedPeriod] = useState<ScoredDarkPeriod | null>(null);
  const [minGapHours, setMinGapHours] = useState(6);
  const [isDemo, setIsDemo] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [uploadHistory, setUploadHistory] = useState<Array<{ id: string; filename: string | null; dark_periods_found: number; created_at: string }>>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [dbCount, setDbCount] = useState<number>(0);

  // Chart filter state
  const [chartRiskFilter, setChartRiskFilter] = useState<string | null>(null);

  // Live feed state
  const [isLiveFeedActive, setIsLiveFeedActive] = useState(false);

  // Scoring configuration
  const [scoringFactors, setScoringFactors] = useState<ScoringFactors>(DEFAULT_SCORING_FACTORS);
  const [isRadarScanning, setIsRadarScanning] = useState(false);
  const [scanId, setScanId] = useState(0);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Settings modal state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  type RightPanel = 'threats' | 'analytics' | 'ingest' | 'ai';
  const [rightPanel, setRightPanel] = useState<RightPanel>('threats');

  // Update current time every second for real-time feel
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Rescore dark periods when scoring factors change
  useEffect(() => {
    if (darkPeriods.length > 0) {
      const rescored = rescoreAllWithFactors(darkPeriods, scoringFactors);

      const scoresChanged = rescored.some(
        (dp, i) => dp.suspicionScore !== darkPeriods[i]?.suspicionScore
      );

      if (scoresChanged) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDarkPeriods(rescored);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoringFactors]);

  const handleNewLiveAlert = useCallback((alert: ScoredDarkPeriod) => {
    setDarkPeriods((prev) => [alert, ...prev]);
  }, []);

  const supabase = useSupabase();

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
    setSelectedPeriod(SAMPLE_DARK_PERIODS[0] ?? null);
    setChartRiskFilter(null);
    setIsDemo(true);
    setRightPanel('threats');
    setScanId((id) => id + 1);
    setIsRadarScanning(true);
  };

  const handleRadarScanComplete = () => {
    setIsRadarScanning(false);
  };

  const summary = isDemo ? SAMPLE_SUMMARY : records.length > 0 ? getDataSummary(records) : null;

  // Filter dark periods based on chart selections
  const filteredDarkPeriods = useMemo(() => {
    let result = darkPeriods;

    if (chartRiskFilter) {
      result = result.filter((dp) => dp.riskLevel === chartRiskFilter);
    }

    return result;
  }, [darkPeriods, chartRiskFilter]);

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
    void batchId;
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


  /* ── Render ─────────────────────────────────────────────────── */
  const TC: Record<string, string> = { CRITICAL: '#ff3366', HIGH: '#f97316', MEDIUM: '#ffb800', LOW: '#00ff88' };
  const critical = darkPeriods.filter(d => d.riskLevel === 'CRITICAL').length;
  const high = darkPeriods.filter(d => d.riskLevel === 'HIGH').length;
  const medium = darkPeriods.filter(d => d.riskLevel === 'MEDIUM').length;
  const low = darkPeriods.filter(d => d.riskLevel === 'LOW').length;
  const visibleThreats = chartRiskFilter
    ? darkPeriods.filter(d => d.riskLevel === chartRiskFilter)
    : darkPeriods;
  const topThreats = [...visibleThreats]
    .sort((a, b) => b.suspicionScore - a.suspicionScore)
    .slice(0, 8);

  return (
    <div className="h-screen overflow-hidden bg-[#06111f] text-white relative">
      <RadarOverlay isScanning={isRadarScanning} scanId={scanId} onScanComplete={handleRadarScanComplete} />

      <main className="absolute inset-0 z-0">
        {darkPeriods.length > 0 ? (
          <DarkPeriodsMap darkPeriods={darkPeriods} onSelectPeriod={setSelectedPeriod} isLiveScanning={isLiveFeedActive} />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-[#071322]">
            <div className="max-w-sm text-center">
              <div className="text-sm font-sans tracking-[0.2em] text-cyan-200/70">NO AIS DATA LOADED</div>
              <div className="mt-3 text-sm text-slate-300">Run the demo scan or load AIS data to start mapping blackout events.</div>
              <div className="mt-5 flex justify-center gap-3">
                <button onClick={handleDemo} className="px-4 py-2 text-xs font-sans tracking-widest border border-cyan-400/50 bg-cyan-400/10 text-cyan-100">
                  DEMO SCAN
                </button>
                <button onClick={() => setRightPanel('ingest')} className="px-4 py-2 text-xs font-sans tracking-widest border border-slate-500/60 text-slate-200">
                  LOAD DATA
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <header className="absolute top-0 inset-x-0 z-30 h-16 border-b border-slate-700/80 bg-[#07111d]/95 backdrop-blur">
        <div className="h-full flex items-center gap-5 px-5">
          <div className="w-[320px] flex items-center gap-3">
            <div className={`h-2.5 w-2.5 rounded-full ${critical > 0 ? 'bg-red-400' : 'bg-cyan-300'}`} />
            <div>
              <div className="font-sans text-sm font-semibold tracking-[0.16em] text-cyan-100">GHOST FLEET DETECTOR</div>
              <div className="mt-0.5 font-sans text-[10px] tracking-widest text-slate-400">
                {currentTime.toLocaleTimeString('en-US', { hour12: false })} UTC
              </div>
            </div>
          </div>

          <div className="flex flex-1 items-center gap-3">
            {[
              { label: 'Vessels', value: summary?.uniqueVessels ?? 0, color: '#67e8f9' },
              { label: 'Blackouts', value: darkPeriods.length, color: '#a78bfa' },
              { label: 'Critical', value: critical, color: '#fb7185' },
              { label: 'High', value: high, color: '#fb923c' },
            ].map(({ label, value, color }) => (
              <div key={label} className="min-w-24">
                <div className="font-sans text-xl font-semibold tabular-nums" style={{ color }}>{value}</div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400">{label}</div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {isLiveFeedActive && <span className="rounded border border-green-400/40 px-2 py-1 text-[10px] font-sans text-green-300">LIVE</span>}
            {darkPeriods.length > 0 && (
              <>
                <button onClick={handleDownloadCSV} className="px-3 py-1.5 text-xs font-sans text-cyan-100 border border-cyan-400/30 hover:bg-cyan-400/10">EXPORT</button>
                <button onClick={handleSaveToSupabase} disabled={isSaving || saveStatus === 'saved'} className="px-3 py-1.5 text-xs font-sans text-slate-200 border border-slate-500/50 disabled:opacity-50">
                  {isSaving ? 'SAVING' : saveStatus === 'saved' ? 'SAVED' : 'SAVE'}
                </button>
                <button onClick={handleReset} className="px-3 py-1.5 text-xs font-sans text-red-200 border border-red-400/30 hover:bg-red-400/10">RESET</button>
              </>
            )}
            <SettingsButton onClick={() => setIsSettingsOpen(true)} />
          </div>
        </div>
      </header>

      <aside className="absolute left-4 top-20 bottom-4 z-20 w-[340px] rounded-md border border-slate-700/90 bg-[#081524]/95 shadow-2xl backdrop-blur flex flex-col overflow-hidden">
        <div className="border-b border-slate-700/80 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-sans font-semibold tracking-[0.14em] text-cyan-100">DETECTIONS</h2>
            <span className="text-xs text-slate-400">{filteredDarkPeriods.length}/{darkPeriods.length}</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={handleDemo} className="px-3 py-2 text-xs font-sans border border-cyan-400/30 bg-cyan-400/10 text-cyan-100">DEMO</button>
            <button onClick={() => setRightPanel('ingest')} className="px-3 py-2 text-xs font-sans border border-slate-600 text-slate-200">LOAD</button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 p-4 border-b border-slate-700/80">
          {[
            ['Critical', critical, TC.CRITICAL],
            ['High', high, TC.HIGH],
            ['Medium', medium, TC.MEDIUM],
            ['Low', low, TC.LOW],
          ].map(([label, value, color]) => (
            <button
              key={label}
              onClick={() => setChartRiskFilter(chartRiskFilter === label.toString().toUpperCase() ? null : label.toString().toUpperCase())}
              className="rounded border border-slate-700/80 bg-slate-950/35 px-3 py-2 text-left hover:bg-slate-800/60"
            >
              <div className="font-sans text-lg font-semibold tabular-nums" style={{ color: color as string }}>{value}</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">{label}</div>
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto p-2">
          {topThreats.length > 0 ? (
            topThreats.map((dp) => {
              const selected = selectedPeriod?.mmsi === dp.mmsi && selectedPeriod?.lastSeenTime === dp.lastSeenTime;
              const color = TC[dp.riskLevel];
              return (
                <button
                  key={`${dp.mmsi}-${dp.lastSeenTime}`}
                  onClick={() => setSelectedPeriod(dp)}
                  className={`mb-2 w-full rounded border px-3 py-3 text-left transition ${selected ? 'bg-cyan-400/10 border-cyan-300/50' : 'bg-slate-950/35 border-slate-700/70 hover:bg-slate-800/60'}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-sans text-sm text-slate-100">{dp.mmsi}</span>
                    <span className="text-xs font-sans font-semibold" style={{ color }}>{dp.suspicionScore}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
                    <span style={{ color }}>{dp.riskLevel}</span>
                    <span>{dp.gapHours.toFixed(0)}h dark</span>
                    <span>{dp.distanceNm.toFixed(0)} nm</span>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="p-6 text-center text-sm text-slate-400">No detections match the current filter.</div>
          )}
        </div>
      </aside>

      <aside className="absolute right-4 top-20 bottom-4 z-20 w-[380px] rounded-md border border-slate-700/90 bg-[#081524]/95 shadow-2xl backdrop-blur flex flex-col overflow-hidden">
        <div className="border-b border-slate-700/80 p-3">
          <div className="grid grid-cols-4 gap-1 rounded bg-slate-950/50 p-1">
            {(['threats', 'analytics', 'ingest', 'ai'] as RightPanel[]).map((panel) => (
              <button
                key={panel}
                onClick={() => setRightPanel(panel)}
                className={`px-2 py-2 text-xs font-sans uppercase tracking-wider ${rightPanel === panel ? 'bg-cyan-400/15 text-cyan-100' : 'text-slate-400 hover:text-slate-100'}`}
              >
                {panel === 'threats' ? 'Detail' : panel === 'analytics' ? 'Stats' : panel === 'ingest' ? 'Data' : 'AI'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {rightPanel === 'threats' && (
            <div className="space-y-4">
              {selectedPeriod ? (
                <div className="rounded-md border border-slate-700 bg-slate-950/35 p-4">
                  <div className="text-xs uppercase tracking-wider text-slate-400">Selected vessel</div>
                  <div className="mt-1 font-sans text-2xl text-cyan-100">{selectedPeriod.mmsi}</div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-slate-500">Risk</div>
                      <div className="font-sans font-semibold" style={{ color: TC[selectedPeriod.riskLevel] }}>{selectedPeriod.riskLevel}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Score</div>
                      <div className="font-sans text-slate-100">{selectedPeriod.suspicionScore}/100</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Dark</div>
                      <div className="font-sans text-slate-100">{selectedPeriod.gapHours.toFixed(1)}h</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Distance</div>
                      <div className="font-sans text-slate-100">{selectedPeriod.distanceNm.toFixed(0)} nm</div>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    {selectedPeriod.reasons.slice(0, 3).map((reason) => (
                      <div key={reason} className="text-sm text-slate-300">{reason}</div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-slate-700 bg-slate-950/35 p-4 text-sm text-slate-400">
                  Select a vessel from the left panel or the map.
                </div>
              )}
              <LiveFeed onNewAlert={handleNewLiveAlert} isActive={isLiveFeedActive} onToggle={() => setIsLiveFeedActive(v => !v)} />
            </div>
          )}

          {rightPanel === 'analytics' && (
            <div className="space-y-4">
              <StatsCards darkPeriods={darkPeriods} totalVessels={summary?.uniqueVessels ?? 0} totalRecords={summary?.totalRecords ?? 0} />
              <div className="rounded-md border border-slate-700 bg-slate-950/35 p-3">
                <div className="mb-2 text-xs uppercase tracking-wider text-slate-400">Risk distribution</div>
                <RiskDistributionChart darkPeriods={darkPeriods} onRiskFilter={setChartRiskFilter} activeRiskFilter={chartRiskFilter} />
              </div>
            </div>
          )}

          {rightPanel === 'ingest' && (
            <div className="space-y-4">
              <div className="rounded-md border border-slate-700 bg-slate-950/35 p-4">
                <div className="mb-3 text-xs uppercase tracking-wider text-slate-400">Load AIS data</div>
                <div className="mb-3 flex items-center gap-2 text-sm text-slate-300">
                  <span>Min gap</span>
                  <input
                    type="number"
                    value={minGapHours}
                    onChange={e => setMinGapHours(Number(e.target.value))}
                    className="w-16 rounded border border-slate-600 bg-slate-950 px-2 py-1 font-sans text-sm text-slate-100"
                    min={1}
                    max={72}
                  />
                  <span>hours</span>
                </div>
                <FileUpload onFileLoad={handleFileLoad} isLoading={isLoading} />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button onClick={handleDemo} className="rounded border border-cyan-400/30 bg-cyan-400/10 px-3 py-3 text-xs font-sans text-cyan-100">DEMO SCAN</button>
                <button onClick={handleLoadAllFromDatabase} disabled={isLoading || dbCount === 0} className="rounded border border-slate-600 px-3 py-3 text-xs font-sans text-slate-200 disabled:opacity-40">
                  {isLoading ? 'LOADING' : `DATABASE ${dbCount || ''}`}
                </button>
              </div>

              <div className="rounded-md border border-slate-700 bg-slate-950/35 p-4">
                <div className="mb-3 text-xs uppercase tracking-wider text-slate-400">Generate test data</div>
                <DataGenerator onGenerate={(data) => { setDarkPeriods(data); setRecords([]); setSelectedPeriod(data[0] ?? null); setIsDemo(false); setChartRiskFilter(null); setRightPanel('threats'); }} />
              </div>

              {uploadHistory.length > 0 && (
                <div className="rounded-md border border-slate-700 bg-slate-950/35">
                  <button onClick={() => setShowHistory(v => !v)} className="w-full px-4 py-3 text-left text-xs uppercase tracking-wider text-slate-300">
                    Previous analyses [{uploadHistory.length}] {showHistory ? '▲' : '▼'}
                  </button>
                  {showHistory && uploadHistory.slice(0, 5).map(batch => (
                    <button key={batch.id} onClick={() => handleLoadFromHistory(batch.id)} className="w-full border-t border-slate-700 px-4 py-3 text-left text-sm text-slate-300 hover:bg-slate-800/60">
                      <span className="block truncate">{batch.filename ?? 'Unnamed upload'}</span>
                      <span className="text-xs text-slate-500">{batch.dark_periods_found} detections</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {rightPanel === 'ai' && (
            <div className="h-full min-h-[520px]">
              <ChatBox darkPeriods={filteredDarkPeriods} />
            </div>
          )}
        </div>
      </aside>

      <div className="absolute bottom-3 left-[372px] z-20 rounded border border-slate-700/80 bg-[#07111d]/90 px-3 py-2 text-xs text-slate-400 backdrop-blur">
        AIS parser · threat scorer · Supabase {supabase ? 'online' : 'offline'}
      </div>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} scoringFactors={scoringFactors} onScoringChange={setScoringFactors} />
    </div>
  );
}
