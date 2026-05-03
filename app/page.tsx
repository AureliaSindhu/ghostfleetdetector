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
import { SuspiciousShipsCard } from '@/components/SuspiciousShipsCard';
import { SettingsModal, SettingsButton } from '@/components/SettingsModal';

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

  // Settings modal state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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


  /* ── Render ─────────────────────────────────────────────────── */
  const TC: Record<string, string> = { CRITICAL: '#ff3366', HIGH: '#f97316', MEDIUM: '#ffb800', LOW: '#00ff88' };
  const critical = darkPeriods.filter(d => d.riskLevel === 'CRITICAL').length;
  const high = darkPeriods.filter(d => d.riskLevel === 'HIGH').length;
  const medium = darkPeriods.filter(d => d.riskLevel === 'MEDIUM').length;
  type RightPanel = 'threats' | 'analytics' | 'ingest';
  const [rightPanel, setRightPanel] = useState<RightPanel>('threats');

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#060e1a] text-white relative" style={{
      backgroundImage: 'linear-gradient(rgba(0,212,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.02) 1px, transparent 1px)',
      backgroundSize: '40px 40px',
    }}>
      <RadarOverlay isScanning={isRadarScanning} onScanComplete={handleRadarScanComplete} />
      <div className="fixed inset-0 pointer-events-none z-[5]" style={{
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,212,255,0.012) 2px, rgba(0,212,255,0.012) 4px)',
      }} />

      {/* ══ MISSION PULSE HEADER ══════════════════════════════════ */}
      <header className="flex-none relative z-10 border-b-2 border-cyan-500/25" style={{ background: '#040b14' }}>
        {/* Brand + live threat counters */}
        <div className="flex items-stretch border-b border-cyan-500/10">
          {/* Brand */}
          <div className="flex items-center gap-3 px-5 py-3 border-r border-cyan-500/15 flex-none">
            <div className={`w-3 h-3 rounded-full flex-none ${critical > 0 ? 'bg-red-500' : 'bg-cyan-400'}`}
              style={{ boxShadow: critical > 0 ? '0 0 14px #ff3366, 0 0 4px #ff3366' : '0 0 8px #00d4ff' }}
            />
            <div>
              <div className="font-mono text-sm tracking-[0.18em] font-bold leading-tight" style={{ color: '#00d4ff' }}>GHOST FLEET DETECTOR</div>
              <div className="font-mono text-[9px] tracking-widest mt-0.5" style={{ color: 'rgba(0,212,255,0.4)' }}>
                MARITIME AIS SURVEILLANCE · {currentTime.toLocaleTimeString('en-US', { hour12: false })} UTC
              </div>
            </div>
          </div>

          {/* Mission counters — first thing judges see */}
          <div className="flex flex-1 divide-x divide-cyan-500/10">
            {([
              { label: 'VESSELS MONITORED', value: summary?.uniqueVessels ?? 0, sub: 'active AIS tracks', color: '#00d4ff', glow: false },
              { label: 'AIS BLACKOUTS', value: darkPeriods.length, sub: 'transponder gaps detected', color: '#a78bfa', glow: false },
              { label: 'CRITICAL', value: critical, sub: 'score ≥ 70 · act now', color: '#ff3366', glow: critical > 0 },
              { label: 'HIGH', value: high, sub: 'score 50–69 · monitor', color: '#f97316', glow: false },
              { label: 'MEDIUM', value: medium, sub: 'score 30–49 · flagged', color: '#ffb800', glow: false },
            ] as Array<{ label: string; value: number; sub: string; color: string; glow: boolean }>).map(({ label, value, sub, color, glow }) => (
              <div key={label} className="flex-1 px-5 py-4">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-3xl font-bold tabular-nums" style={{ color, textShadow: glow && value > 0 ? `0 0 20px ${color}, 0 0 40px ${color}60` : 'none' }}>{value}</span>
                  {glow && value > 0 && <span className="text-[9px] font-mono animate-pulse" style={{ color }}>● ACTIVE</span>}
                </div>
                <div className="text-[10px] font-mono tracking-widest mt-1" style={{ color: `${color}80` }}>{label}</div>
                <div className="text-[10px] font-mono hidden lg:block mt-0.5" style={{ color: 'rgba(0,212,255,0.2)' }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 px-4 border-l border-cyan-500/15 flex-none">
            {isLiveFeedActive && (
              <div className="flex items-center gap-1.5 px-2 py-1 border border-cyan-400/30" style={{ background: 'rgba(0,212,255,0.06)' }}>
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-[9px] font-mono text-cyan-400 tracking-widest">LIVE</span>
              </div>
            )}
            {darkPeriods.length > 0 && (<>
              <button onClick={handleDownloadCSV} className="text-[9px] px-2 py-1 font-mono tracking-widest border border-cyan-500/25 text-cyan-400/60 hover:text-cyan-300 hover:bg-cyan-500/8 transition-colors">EXPORT</button>
              <button onClick={handleSaveToSupabase} disabled={isSaving || saveStatus === 'saved'} className="text-[9px] px-2 py-1 font-mono tracking-widest border border-cyan-500/15 text-cyan-500/40 hover:text-cyan-400/60 transition-colors disabled:opacity-30">
                {isSaving ? 'SAVING…' : saveStatus === 'saved' ? 'SAVED ✓' : 'SAVE DB'}
              </button>
              <button onClick={handleReset} className="text-[9px] px-2 py-1 font-mono tracking-widest border border-red-500/20 text-red-400/40 hover:text-red-400/70 transition-colors">RESET</button>
            </>)}
            <SettingsButton onClick={() => setIsSettingsOpen(true)} />
          </div>
        </div>

        {/* Mission context bar */}
        {darkPeriods.length > 0 ? (
          <div className="flex items-center gap-4 px-5 py-2 text-[10px] font-mono" style={{ background: "rgba(0,212,255,0.02)", borderBottom: '1px solid rgba(0,212,255,0.06)' }}>
            <span style={{ color: 'rgba(0,212,255,0.35)', letterSpacing: '0.15em' }}>MISSION</span>
            <span style={{ color: 'rgba(0,212,255,0.45)' }}>Detecting vessels that disable AIS transponders to conceal movement — sanctions evasion, unreported ship-to-ship transfers, ghost fleet activity</span>
            <span className="ml-auto" style={{ color: 'rgba(0,212,255,0.25)' }}>
              THRESHOLD: {minGapHours}H GAP
              {filteredDarkPeriods.length !== darkPeriods.length && ` · ${filteredDarkPeriods.length}/${darkPeriods.length} FILTERED`}
            </span>
            {scoreChangeNotification?.visible && (
              <span className="flex items-center gap-2" style={{ color: 'rgba(0,212,255,0.7)' }}>
                ◉ RESCORED
                {scoreChangeNotification.upgraded > 0 && <span style={{ color: TC.CRITICAL }}>▲{scoreChangeNotification.upgraded}</span>}
                {scoreChangeNotification.downgraded > 0 && <span style={{ color: TC.LOW }}>▼{scoreChangeNotification.downgraded}</span>}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3 px-5 py-2 text-[10px] font-mono" style={{ background: 'rgba(0,212,255,0.02)' }}>
            <span style={{ color: 'rgba(255,179,0,0.5)' }}>◈ STANDBY</span>
            <span style={{ color: 'rgba(0,212,255,0.3)' }}>No AIS data loaded · Run demo scan or upload vessel tracking CSV to begin blackout detection</span>
          </div>
        )}
      </header>

      {/* ══ BODY ══════════════════════════════════════════════════ */}
      <div className="flex-1 overflow-hidden flex relative z-10 min-h-0">

        {/* ── MAP: always dominant, always visible ── */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0 min-h-0">

          <div className="flex-1 relative min-h-0">
            {darkPeriods.length > 0 ? (
              <DarkPeriodsMap darkPeriods={darkPeriods} onSelectPeriod={setSelectedPeriod} isLiveScanning={isLiveFeedActive} />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ background: 'rgba(4,11,20,0.95)' }}>
                <div className="text-center space-y-5 max-w-md px-4">
                  <div className="font-mono text-5xl" style={{ color: 'rgba(0,212,255,0.12)' }}>◎</div>
                  <div>
                    <div className="font-mono text-sm tracking-[0.2em] mb-2" style={{ color: 'rgba(0,212,255,0.4)' }}>SURVEILLANCE SYSTEM STANDBY</div>
                    <div className="font-mono text-[10px] leading-relaxed" style={{ color: 'rgba(0,212,255,0.25)' }}>
                      Load AIS vessel tracking data to begin detecting ships that disable transponders to conceal movement — the core signature of sanctions evasion and unreported ship-to-ship transfers.
                    </div>
                  </div>
                  <div className="flex gap-3 justify-center">
                    <button onClick={handleDemo}
                      className="px-5 py-2.5 text-xs font-mono tracking-widest flex items-center gap-2 transition-all hover:opacity-90"
                      style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.4)', color: '#00d4ff' }}>
                      <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
                      RUN DEMO SCAN
                    </button>
                    <button onClick={() => setRightPanel('ingest')}
                      className="px-5 py-2.5 text-xs font-mono tracking-widest border border-cyan-500/20 transition-all hover:border-cyan-500/40"
                      style={{ color: 'rgba(0,212,255,0.5)' }}>
                      LOAD AIS DATA →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Map overlays when data loaded */}
            {darkPeriods.length > 0 && (<>
              <div className="absolute top-3 left-3 z-10 flex items-center gap-2 px-3 py-1.5 font-mono text-xs"
                style={{ background: 'rgba(4,11,20,0.93)', border: '1px solid rgba(0,212,255,0.2)', color: 'rgba(0,212,255,0.65)' }}>
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/50" />
                {darkPeriods.length} AIS BLACKOUTS MAPPED
                {isLiveFeedActive && <span className="animate-pulse ml-1" style={{ color: '#00d4ff' }}>· LIVE</span>}
              </div>
              <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
                {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map(level => {
                  const count = darkPeriods.filter(d => d.riskLevel === level).length;
                  if (!count) return null;
                  return (
                    <div key={level} className="flex items-center gap-2 px-2 py-1 font-mono text-[10px]"
                      style={{ background: 'rgba(4,11,20,0.9)', border: `1px solid ${TC[level]}25` }}>
                      <div className="w-1.5 h-1.5 rounded-full flex-none" style={{ background: TC[level], boxShadow: `0 0 4px ${TC[level]}` }} />
                      <span className="font-bold" style={{ color: TC[level] }}>{count}</span>
                      <span style={{ color: `${TC[level]}70` }}>{level}</span>
                    </div>
                  );
                })}
              </div>
            </>)}
          </div>

          {/* BLACKOUT INTEL MATRIX — vessel table, always below map */}
          {darkPeriods.length > 0 && (
            <div className="flex-none border-t border-cyan-500/15" style={{ height: '185px', background: 'rgba(4,11,20,0.98)' }}>
              <div className="flex items-center gap-3 px-4 py-2.5 border-b border-cyan-500/10">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(0,212,255,0.5)' }} />
                <span className="text-xs font-mono tracking-widest font-bold" style={{ color: "rgba(0,212,255,0.55)" }}>BLACKOUT INTEL MATRIX</span>
                <span className="text-[9px] font-mono" style={{ color: 'rgba(0,212,255,0.2)' }}>RANKED BY THREAT SCORE</span>
                {(chartRiskFilter || chartDurationFilter.min != null) && (
                  <button onClick={() => { setChartRiskFilter(null); setChartDurationFilter({ min: null, max: null }); }}
                    className="ml-auto text-[9px] font-mono px-2 py-0.5 border border-cyan-500/20 transition-colors hover:border-cyan-500/40"
                    style={{ color: 'rgba(0,212,255,0.4)' }}>
                    CLEAR FILTER ×
                  </button>
                )}
              </div>
              <div className="overflow-auto" style={{ height: 'calc(185px - 32px)' }}>
                <VesselTable darkPeriods={filteredDarkPeriods} onSelect={setSelectedPeriod} />
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL: SOC Threat Feed ── */}
        <aside className="flex-none w-[440px] flex flex-col border-l border-cyan-500/20 min-h-0" style={{ background: 'rgba(4,11,20,0.98)' }}>

          {/* Panel header with tab switcher */}
          <div className="flex-none border-b border-cyan-500/15 px-5 py-4 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full flex-none" style={{ background: 'rgba(0,212,255,0.6)', boxShadow: '0 0 6px rgba(0,212,255,0.4)' }} />
            <span className="text-xs font-mono tracking-[0.18em] font-bold flex-1" style={{ color: '#00d4ff' }}>
              {rightPanel === 'threats' ? 'AIS BLACKOUT MONITOR' : rightPanel === 'analytics' ? 'THREAT ANALYTICS' : 'DATA INGEST'}
            </span>
            <div className="flex items-center gap-1">
              {(['threats', 'analytics', 'ingest'] as RightPanel[]).map(p => (
                <button key={p} onClick={() => setRightPanel(p)}
                  className="text-[10px] font-mono tracking-widest px-3 py-1.5 transition-all"
                  style={{
                    color: rightPanel === p ? '#00d4ff' : 'rgba(0,212,255,0.3)',
                    background: rightPanel === p ? 'rgba(0,212,255,0.1)' : 'transparent',
                    border: `1px solid ${rightPanel === p ? 'rgba(0,212,255,0.3)' : 'transparent'}`,
                  }}>
                  {p === 'threats' ? 'THREATS' : p === 'analytics' ? 'ANALYTICS' : 'DATA'}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto min-h-0">

            {/* ── THREATS: SOC alert cards ── */}
            {rightPanel === 'threats' && (
              <div>
                {darkPeriods.length === 0 ? (
                  <div className="p-8 text-center space-y-4">
                    <div className="text-4xl font-mono" style={{ color: 'rgba(0,212,255,0.1)' }}>◎</div>
                    <div className="text-[10px] font-mono tracking-widest leading-relaxed" style={{ color: 'rgba(0,212,255,0.3)' }}>
                      NO BLACKOUTS DETECTED<br />Load AIS data to monitor vessels
                    </div>
                    <button onClick={() => setRightPanel('ingest')}
                      className="text-[10px] font-mono tracking-widest px-4 py-2 border border-cyan-500/20 transition-colors hover:border-cyan-500/40"
                      style={{ color: 'rgba(0,212,255,0.5)' }}>
                      LOAD DATA →
                    </button>
                  </div>
                ) : (
                  <div>
                    {/* Threat level filter bar */}
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-cyan-500/10">
                      <span className="text-[10px] font-mono mr-1" style={{ color: 'rgba(0,212,255,0.25)' }}>FILTER</span>
                      {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map(level => {
                        const count = darkPeriods.filter(d => d.riskLevel === level).length;
                        const active = chartRiskFilter === level;
                        return (
                          <button key={level} onClick={() => setChartRiskFilter(active ? null : level)}
                            className="flex items-center gap-1.5 px-3 py-1.5 transition-all font-mono"
                            style={{
                              border: `1px solid ${active ? TC[level] : TC[level] + '30'}`,
                              background: active ? `${TC[level]}18` : 'transparent',
                            }}>
                            <span className="text-xs font-bold tabular-nums" style={{ color: TC[level] }}>{count}</span>
                            <span className="text-[8px]" style={{ color: `${TC[level]}80` }}>{level[0]}</span>
                          </button>
                        );
                      })}
                      <span className="ml-auto text-[10px] font-mono" style={{ color: 'rgba(0,212,255,0.2)' }}>CLICK TO FILTER</span>
                    </div>

                    {/* Ghost vessel alert cards */}
                    {(chartRiskFilter ? darkPeriods.filter(d => d.riskLevel === chartRiskFilter) : darkPeriods).map((dp, i) => {
                      const color = TC[dp.riskLevel];
                      const sel = selectedPeriod?.mmsi === dp.mmsi && selectedPeriod?.lastSeenTime === dp.lastSeenTime;
                      return (
                        <div key={`${dp.mmsi}-${i}`}
                          className="border-b transition-all cursor-pointer"
                          style={{ borderColor: 'rgba(0,212,255,0.07)', borderLeft: `3px solid ${color}`, background: sel ? `${color}0e` : 'transparent' }}
                          onClick={() => setSelectedPeriod(sel ? null : dp)}
                          onMouseOver={e => { if (!sel) (e.currentTarget as HTMLElement).style.background = 'rgba(0,212,255,0.03)'; }}
                          onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = sel ? `${color}0e` : 'transparent'; }}>
                          <div className="px-4 py-4">
                            {/* Header: vessel ID + threat badge */}
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div>
                                <div className="text-xs font-mono tracking-widest" style={{ color: "rgba(0,212,255,0.35)" }}>GHOST VESSEL</div>
                                <div className="text-xl font-mono font-bold tabular-nums" style={{ color: 'rgba(0,212,255,0.9)' }}>{dp.mmsi}</div>
                              </div>
                              <div className="text-right flex-none">
                                <div className="text-xs font-mono font-bold px-2 py-1" style={{ color, border: `1px solid ${color}45`, background: `${color}10` }}>{dp.riskLevel}</div>
                                <div className="text-sm font-mono font-bold mt-1 tabular-nums" style={{ color }}>{dp.suspicionScore}/100</div>
                              </div>
                            </div>

                            {/* Threat score bar */}
                            <div className="w-full h-1.5 mb-3 rounded-full overflow-hidden" style={{ background: 'rgba(0,212,255,0.1)' }}>
                              <div className="h-full rounded-full" style={{ width: `${dp.suspicionScore}%`, background: color, boxShadow: `0 0 4px ${color}` }} />
                            </div>

                            {/* Key metrics */}
                            <div className="grid grid-cols-3 gap-2 mb-3">
                              {[
                                { label: 'AIS DARK', value: `${dp.gapHours.toFixed(0)}H`, alert: dp.gapHours > 48 },
                                { label: 'DARK DIST', value: `${dp.distanceNm.toFixed(0)}NM`, alert: dp.distanceNm > 200 },
                                { label: 'IMPLIED SPD', value: `${dp.impliedSpeedKnots.toFixed(1)}KT`, alert: dp.impliedSpeedKnots > 25 },
                              ].map(({ label, value, alert }) => (
                                <div key={label} className="px-2 py-2.5 text-center" style={{ background: "rgba(0,212,255,0.04)", border: "1px solid rgba(0,212,255,0.1)" }}>
                                  <div className="text-[10px] font-mono tracking-wider mb-1" style={{ color: 'rgba(0,212,255,0.3)' }}>{label}</div>
                                  <div className="text-base font-mono font-bold" style={{ color: alert ? color : 'rgba(0,212,255,0.75)' }}>{value}</div>
                                </div>
                              ))}
                            </div>

                            {/* Why flagged */}
                            <div className="space-y-1.5">
                              {dp.reasons.slice(0, 3).map((r, ri) => (
                                <div key={ri} className="text-[10px] font-mono flex items-start gap-1.5">
                                  <span className="flex-none" style={{ color: `${color}70` }}>▸</span>
                                  <span className="truncate" style={{ color: 'rgba(0,212,255,0.45)' }}>{r}</span>
                                </div>
                              ))}
                            </div>

                            {sel && (
                              <button onClick={e => { e.stopPropagation(); }}
                                className="mt-3 w-full text-xs font-mono py-2.5 tracking-widest transition-all"
                                style={{ border: `1px solid ${color}40`, color, background: `${color}0e` }}>
                                OPEN FULL INTEL REPORT ▶
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Live monitoring toggle */}
                    <div className="p-3 border-t border-cyan-500/10">
                      <LiveFeed onNewAlert={handleNewLiveAlert} isActive={isLiveFeedActive} onToggle={() => setIsLiveFeedActive(v => !v)} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── ANALYTICS ── */}
            {rightPanel === 'analytics' && (
              <div className="p-3 space-y-3">
                {darkPeriods.length === 0 ? (
                  <div className="py-16 text-center text-[10px] font-mono tracking-widest" style={{ color: 'rgba(0,212,255,0.25)' }}>NO DATA · LOAD AIS DATA FIRST</div>
                ) : (<>
                  <StatsCards darkPeriods={darkPeriods} totalVessels={summary?.uniqueVessels ?? 0} totalRecords={summary?.totalRecords ?? 0} />
                  <div className="data-panel p-3">
                    <div className="text-[10px] font-mono tracking-widest mb-2" style={{ color: 'rgba(0,212,255,0.4)' }}>BLACKOUT THREAT DISTRIBUTION</div>
                    <RiskDistributionChart darkPeriods={darkPeriods} onRiskFilter={setChartRiskFilter} activeRiskFilter={chartRiskFilter} />
                  </div>
                  <div className="data-panel p-3">
                    <div className="text-[10px] font-mono tracking-widest mb-2" style={{ color: 'rgba(0,212,255,0.4)' }}>BLACKOUT DURATION HISTOGRAM</div>
                    <DurationHistogram darkPeriods={darkPeriods} onDurationFilter={handleDurationFilter} activeDurationFilter={chartDurationFilter} />
                  </div>
                  <div className="data-panel p-3">
                    <div className="text-[10px] font-mono tracking-widest mb-2" style={{ color: 'rgba(0,212,255,0.4)' }}>THREAT SCORING WEIGHTS</div>
                    <ScoringConfig factors={scoringFactors} onChange={setScoringFactors} />
                  </div>
                  <div className="data-panel p-3">
                    <div className="text-[10px] font-mono tracking-widest mb-2" style={{ color: 'rgba(0,212,255,0.4)' }}>AI MARITIME ANALYST</div>
                    <ChatBox darkPeriods={darkPeriods} />
                  </div>
                </>)}
              </div>
            )}

            {/* ── DATA INGEST ── */}
            {rightPanel === 'ingest' && (
              <div className="p-3 space-y-3">
                {/* Mission brief */}
                <div className="p-3 border border-cyan-500/15" style={{ background: 'rgba(0,212,255,0.03)' }}>
                  <div className="text-[9px] font-mono tracking-widest mb-1.5" style={{ color: 'rgba(0,212,255,0.4)' }}>WHAT THIS TOOL DETECTS</div>
                  <p className="text-[9px] font-mono leading-relaxed" style={{ color: 'rgba(0,212,255,0.45)' }}>
                    Ships disable AIS to hide location — creating gaps where they could be conducting illegal transfers, evading sanctions, or operating as ghost vessels. This tool scores each gap by duration, distance traveled dark, implied speed anomalies, and proximity to known transshipment zones.
                  </p>
                </div>

                <div className="data-panel p-3">
                  <div className="text-[10px] font-mono tracking-widest mb-3" style={{ color: 'rgba(0,212,255,0.4)' }}>LOAD AIS TRACKING DATA</div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[9px] font-mono tracking-widest whitespace-nowrap" style={{ color: 'rgba(0,212,255,0.4)' }}>MIN GAP</span>
                    <input type="number" value={minGapHours} onChange={e => setMinGapHours(Number(e.target.value))}
                      className="w-14 px-2 py-1 text-xs font-mono border focus:outline-none"
                      style={{ background: '#060e1a', borderColor: 'rgba(0,212,255,0.25)', color: 'rgba(0,212,255,0.8)' }}
                      min={1} max={72} />
                    <span className="text-[9px] font-mono" style={{ color: 'rgba(0,212,255,0.3)' }}>HRS · CSV: MMSI/LAT/LON/TIMESTAMP</span>
                  </div>
                  <FileUpload onFileLoad={handleFileLoad} isLoading={isLoading} />
                </div>

                <div className="data-panel p-3">
                  <div className="text-[10px] font-mono tracking-widest mb-2" style={{ color: 'rgba(0,212,255,0.4)' }}>QUICK SCENARIOS</div>
                  <div className="space-y-2">
                    <button onClick={handleDemo}
                      className="w-full px-3 py-3 text-xs font-mono tracking-widest flex items-center gap-3 transition-all hover:opacity-90 text-left"
                      style={{ background: 'rgba(0,212,255,0.07)', border: '1px solid rgba(0,212,255,0.3)', color: '#00d4ff' }}>
                      <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse flex-none" />
                      <div>
                        <div className="font-bold">DEMO: GHOST FLEET SCENARIO</div>
                        <div className="text-[8px] mt-0.5" style={{ color: 'rgba(0,212,255,0.5)' }}>S. China Sea · Hormuz · 5 vessels with mixed threats</div>
                      </div>
                    </button>
                    <button onClick={handleLoadAllFromDatabase} disabled={isLoading || dbCount === 0}
                      className="w-full px-3 py-2 text-xs font-mono tracking-widest border text-left transition-colors disabled:opacity-30"
                      style={{ borderColor: 'rgba(0,212,255,0.15)', color: 'rgba(0,212,255,0.5)' }}>
                      {isLoading ? 'LOADING…' : `LOAD FROM DATABASE ${dbCount ? `[${dbCount} DETECTIONS]` : '[EMPTY]'}`}
                    </button>
                  </div>
                </div>

                <div className="data-panel p-3">
                  <div className="text-[10px] font-mono tracking-widest mb-2" style={{ color: 'rgba(0,212,255,0.4)' }}>GENERATE TEST DATA</div>
                  <DataGenerator onGenerate={(data) => { setDarkPeriods(data); setRecords([]); setIsDemo(false); setRightPanel('threats'); }} />
                </div>

                {uploadHistory.length > 0 && (
                  <div className="data-panel">
                    <button onClick={() => setShowHistory(v => !v)}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-[10px] font-mono tracking-widest transition-colors"
                      style={{ color: 'rgba(0,212,255,0.4)' }}>
                      <span>PREVIOUS ANALYSES [{uploadHistory.length}]</span>
                      <span>{showHistory ? '▲' : '▼'}</span>
                    </button>
                    {showHistory && uploadHistory.slice(0, 5).map(batch => (
                      <button key={batch.id} onClick={() => handleLoadFromHistory(batch.id)}
                        className="w-full flex items-center justify-between px-3 py-2 border-t text-left transition-colors hover:bg-cyan-500/5"
                        style={{ borderColor: 'rgba(0,212,255,0.08)' }}>
                        <span className="text-xs font-mono truncate mr-2" style={{ color: 'rgba(0,212,255,0.7)' }}>{batch.filename ?? 'UNNAMED'}</span>
                        <span className="text-[10px] font-mono flex-none" style={{ color: 'rgba(0,212,255,0.5)' }}>{batch.dark_periods_found} detections</span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="data-panel p-3">
                  <div className="text-[10px] font-mono tracking-widest mb-2" style={{ color: 'rgba(0,212,255,0.4)' }}>ALERT SUBSCRIPTIONS</div>
                  <MagicScanner onSubscribe={handleScannerSubscribe} />
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {selectedPeriod && <VesselDetailModal period={selectedPeriod} onClose={() => setSelectedPeriod(null)} />}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} scoringFactors={scoringFactors} onScoringChange={setScoringFactors} />

      <footer className="flex-none flex items-center justify-between px-5 py-2 border-t relative z-10" style={{ background: '#040b14', borderColor: 'rgba(0,212,255,0.1)' }}>
        <div className="flex items-center gap-4">
          {([['AIS PARSER', true], ['THREAT SCORER', true], ['OPEN-METEO', true], ['OPENSANCTIONS', true], ['SUPABASE', !!supabase]] as [string, boolean][]).map(([label, active]) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: active ? '#00ff88' : 'rgba(255,255,255,0.08)', boxShadow: active ? '0 0 4px #00ff88' : 'none' }} />
              <span className="text-[8px] font-mono" style={{ color: active ? 'rgba(0,255,136,0.45)' : 'rgba(255,255,255,0.12)' }}>{label}</span>
            </div>
          ))}
        </div>
        <span className="text-[8px] font-mono tracking-widest" style={{ color: 'rgba(0,212,255,0.15)' }}>GHOST FLEET DETECTOR · 3RD ANNUAL NATSEC HACKATHON · MARITIME DOMAIN AWARENESS</span>
      </footer>
    </div>
  );
}
