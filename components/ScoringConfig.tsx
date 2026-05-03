'use client';

import { useState } from 'react';
import { Settings, RotateCcw, ChevronDown, ChevronUp, AlertTriangle, Shield, Zap, Eye, Info } from 'lucide-react';

export interface ScoringFactors {
  // Dark period duration - THE CORE THESIS: detecting ABSENCE
  darkPeriod6to12h: number;
  darkPeriod12to24h: number;
  darkPeriod24to72h: number;
  darkPeriodOver72h: number;

  // Distance factors - movement while "invisible"
  distance100to200nm: number;
  distanceOver200nm: number;

  // Location factors - high-risk transshipment zones
  inTransshipmentZone: number;

  // Speed factors - physics violations indicate spoofing
  impossibleSpeed: number;

  // Vessel type - tankers and fishing vessels are high risk
  highRiskVesselType: number;

  // Timing - going dark at night is more suspicious
  wentDarkAtNight: number;

  // Weather modifiers (negative = reduces score, filters false positives)
  severeWeather: number;
  hurricaneZone: number;

  // Flag state - sanctioned countries and flags of convenience
  sanctionedFlagState: number;
  flagOfConvenience: number;
}

export const DEFAULT_SCORING_FACTORS: ScoringFactors = {
  // Dark period duration
  darkPeriod6to12h: 10,
  darkPeriod12to24h: 20,
  darkPeriod24to72h: 30,
  darkPeriodOver72h: 40,

  // Distance factors
  distance100to200nm: 10,
  distanceOver200nm: 20,

  // Location factors
  inTransshipmentZone: 25,

  // Speed factors
  impossibleSpeed: 20,

  // Vessel type
  highRiskVesselType: 10,

  // Timing
  wentDarkAtNight: 5,

  // Weather modifiers
  severeWeather: -30,
  hurricaneZone: -40,

  // Flag state
  sanctionedFlagState: 35,
  flagOfConvenience: 10,
};

// Presets for different detection modes
const PRESETS: Record<string, { name: string; description: string; icon: React.ReactNode; factors: ScoringFactors }> = {
  aggressive: {
    name: 'Aggressive',
    description: 'Maximum detection sensitivity. More alerts, may include false positives.',
    icon: <Zap className="w-4 h-4" />,
    factors: {
      darkPeriod6to12h: 15,
      darkPeriod12to24h: 25,
      darkPeriod24to72h: 40,
      darkPeriodOver72h: 50,
      distance100to200nm: 15,
      distanceOver200nm: 25,
      inTransshipmentZone: 30,
      impossibleSpeed: 25,
      highRiskVesselType: 15,
      wentDarkAtNight: 10,
      severeWeather: -20,
      hurricaneZone: -30,
      sanctionedFlagState: 40,
      flagOfConvenience: 15,
    },
  },
  balanced: {
    name: 'Balanced',
    description: 'Optimal detection with weather-based false positive reduction.',
    icon: <Shield className="w-4 h-4" />,
    factors: DEFAULT_SCORING_FACTORS,
  },
  conservative: {
    name: 'Conservative',
    description: 'Fewer alerts, higher confidence. Only flags clear violations.',
    icon: <Eye className="w-4 h-4" />,
    factors: {
      darkPeriod6to12h: 5,
      darkPeriod12to24h: 15,
      darkPeriod24to72h: 25,
      darkPeriodOver72h: 35,
      distance100to200nm: 5,
      distanceOver200nm: 15,
      inTransshipmentZone: 20,
      impossibleSpeed: 15,
      highRiskVesselType: 5,
      wentDarkAtNight: 3,
      severeWeather: -40,
      hurricaneZone: -50,
      sanctionedFlagState: 30,
      flagOfConvenience: 5,
    },
  },
};

interface ScoringConfigProps {
  factors: ScoringFactors;
  onChange: (factors: ScoringFactors) => void;
}

// Example vessel for live preview (matches the main demo target from pitch)
const EXAMPLE_VESSEL = {
  name: 'Demo Tanker (MMSI 538006540)',
  darkHours: 64,
  distanceNm: 342,
  inZone: true,
  zoneName: 'South China Sea',
  isTanker: true,
  wentDarkAtNight: true,
  hasWeather: false,
  inStorm: false,
  sanctionedFlag: false,
  flagOfConvenience: false,
};

const FACTOR_CONFIG: Record<keyof ScoringFactors, {
  label: string;
  description: string;
  category: 'duration' | 'movement' | 'location' | 'anomaly' | 'vessel' | 'timing' | 'weather' | 'flag';
  thesis: string;
  color: string;
}> = {
  darkPeriod6to12h: {
    label: 'Dark 6-12h',
    description: 'Suspicious transmission gap',
    category: 'duration',
    thesis: 'Ships turning off transponders to hide activity',
    color: 'bg-yellow-500'
  },
  darkPeriod12to24h: {
    label: 'Dark 12-24h',
    description: 'Long transmission gap',
    category: 'duration',
    thesis: 'Extended concealment suggests planned activity',
    color: 'bg-orange-500'
  },
  darkPeriod24to72h: {
    label: 'Dark 24-72h',
    description: 'Extended transmission gap',
    category: 'duration',
    thesis: 'Multi-day darkness indicates major evasion',
    color: 'bg-red-500'
  },
  darkPeriodOver72h: {
    label: 'Dark 72h+',
    description: 'Very extended gap',
    category: 'duration',
    thesis: 'Extreme concealment - ship-to-ship transfer likely',
    color: 'bg-red-700'
  },
  distance100to200nm: {
    label: 'Distance 100-200nm',
    description: 'Significant movement while dark',
    category: 'movement',
    thesis: 'Movement while "invisible" suggests evasion',
    color: 'bg-amber-500'
  },
  distanceOver200nm: {
    label: 'Distance 200nm+',
    description: 'Major movement while dark',
    category: 'movement',
    thesis: 'Large distance traveled in darkness is highly suspicious',
    color: 'bg-orange-600'
  },
  inTransshipmentZone: {
    label: 'Transshipment Zone',
    description: 'High-risk transfer area',
    category: 'location',
    thesis: 'South China Sea, Gulf of Guinea, Strait of Hormuz = hot zones',
    color: 'bg-purple-500'
  },
  impossibleSpeed: {
    label: 'Impossible Speed',
    description: 'Physics violation (>30 kn)',
    category: 'anomaly',
    thesis: 'AIS spoofing or position manipulation detected',
    color: 'bg-red-600'
  },
  highRiskVesselType: {
    label: 'High-Risk Vessel',
    description: 'Tanker or fishing vessel',
    category: 'vessel',
    thesis: 'Tankers = sanctions evasion, Fishing = IUU fishing',
    color: 'bg-blue-500'
  },
  wentDarkAtNight: {
    label: 'Went Dark at Night',
    description: 'Timing suspicious',
    category: 'timing',
    thesis: 'Nighttime darkness suggests intentional concealment',
    color: 'bg-indigo-500'
  },
  severeWeather: {
    label: 'Severe Weather',
    description: 'Reduces false positives',
    category: 'weather',
    thesis: 'Storms explain legitimate AIS gaps',
    color: 'bg-green-500'
  },
  hurricaneZone: {
    label: 'Hurricane Zone',
    description: 'Legitimate safety concern',
    category: 'weather',
    thesis: 'NOAA storm correlation reduces 40% false positives',
    color: 'bg-green-600'
  },
  sanctionedFlagState: {
    label: 'Sanctioned Flag',
    description: 'Russia, Iran, DPRK, etc.',
    category: 'flag',
    thesis: 'Vessels from sanctioned countries are high priority',
    color: 'bg-red-500'
  },
  flagOfConvenience: {
    label: 'Flag of Convenience',
    description: 'Panama, Liberia, etc.',
    category: 'flag',
    thesis: 'Weak oversight flags often used for evasion',
    color: 'bg-amber-600'
  },
};

const CATEGORY_INFO = {
  duration: {
    label: 'Dark Period Duration',
    icon: '⏰',
    description: 'Core detection: how long was the vessel "invisible"?',
    thesis: 'DETECTING ABSENCE - The longer dark, the more suspicious'
  },
  movement: {
    label: 'Movement While Dark',
    icon: '📍',
    description: 'Distance traveled during transmission blackout',
    thesis: 'Ships that move far while dark are hiding their route'
  },
  location: {
    label: 'High-Risk Zones',
    icon: '🗺️',
    description: 'Known ship-to-ship transfer areas',
    thesis: 'Transshipment zones are hotspots for sanctions evasion'
  },
  anomaly: {
    label: 'Anomalies',
    icon: '⚡',
    description: 'Physics violations and data inconsistencies',
    thesis: 'Impossible speeds indicate AIS spoofing or manipulation'
  },
  vessel: {
    label: 'Vessel Type',
    icon: '🚢',
    description: 'Ship types commonly used for illegal activity',
    thesis: 'Tankers move sanctioned oil, fishing vessels commit IUU'
  },
  timing: {
    label: 'Timing',
    icon: '🌙',
    description: 'When did the vessel go dark?',
    thesis: 'Night darkness suggests intentional concealment'
  },
  weather: {
    label: 'Weather Modifiers',
    icon: '🌤️',
    description: 'Reduce score when weather explains the gap',
    thesis: '40% false positive reduction through weather correlation'
  },
  flag: {
    label: 'Flag State',
    icon: '🚩',
    description: 'Country of registration risk factors',
    thesis: 'Sanctioned countries and flags of convenience'
  },
};

function calculateExampleScore(factors: ScoringFactors): { score: number; breakdown: Array<{ label: string; points: number; reason: string }> } {
  const breakdown: Array<{ label: string; points: number; reason: string }> = [];
  let score = 0;

  // Dark period (64 hours = 24-72h range)
  if (EXAMPLE_VESSEL.darkHours >= 72) {
    score += factors.darkPeriodOver72h;
    breakdown.push({ label: 'Dark 72h+', points: factors.darkPeriodOver72h, reason: `${EXAMPLE_VESSEL.darkHours}h dark period` });
  } else if (EXAMPLE_VESSEL.darkHours >= 24) {
    score += factors.darkPeriod24to72h;
    breakdown.push({ label: 'Dark 24-72h', points: factors.darkPeriod24to72h, reason: `${EXAMPLE_VESSEL.darkHours}h dark period` });
  } else if (EXAMPLE_VESSEL.darkHours >= 12) {
    score += factors.darkPeriod12to24h;
    breakdown.push({ label: 'Dark 12-24h', points: factors.darkPeriod12to24h, reason: `${EXAMPLE_VESSEL.darkHours}h dark period` });
  } else if (EXAMPLE_VESSEL.darkHours >= 6) {
    score += factors.darkPeriod6to12h;
    breakdown.push({ label: 'Dark 6-12h', points: factors.darkPeriod6to12h, reason: `${EXAMPLE_VESSEL.darkHours}h dark period` });
  }

  // Distance (342nm = over 200nm)
  if (EXAMPLE_VESSEL.distanceNm > 200) {
    score += factors.distanceOver200nm;
    breakdown.push({ label: 'Distance 200nm+', points: factors.distanceOver200nm, reason: `${EXAMPLE_VESSEL.distanceNm}nm while dark` });
  } else if (EXAMPLE_VESSEL.distanceNm > 100) {
    score += factors.distance100to200nm;
    breakdown.push({ label: 'Distance 100-200nm', points: factors.distance100to200nm, reason: `${EXAMPLE_VESSEL.distanceNm}nm while dark` });
  }

  // Transshipment zone
  if (EXAMPLE_VESSEL.inZone) {
    score += factors.inTransshipmentZone;
    breakdown.push({ label: 'Transshipment Zone', points: factors.inTransshipmentZone, reason: EXAMPLE_VESSEL.zoneName });
  }

  // Vessel type
  if (EXAMPLE_VESSEL.isTanker) {
    score += factors.highRiskVesselType;
    breakdown.push({ label: 'High-Risk Vessel', points: factors.highRiskVesselType, reason: 'Tanker vessel type' });
  }

  // Night timing
  if (EXAMPLE_VESSEL.wentDarkAtNight) {
    score += factors.wentDarkAtNight;
    breakdown.push({ label: 'Went Dark at Night', points: factors.wentDarkAtNight, reason: 'Went dark at 22:30' });
  }

  // Weather (example has none)
  if (EXAMPLE_VESSEL.hasWeather) {
    score += factors.severeWeather;
    breakdown.push({ label: 'Severe Weather', points: factors.severeWeather, reason: 'Storm present' });
  }

  // Sanctions
  if (EXAMPLE_VESSEL.sanctionedFlag) {
    score += factors.sanctionedFlagState;
    breakdown.push({ label: 'Sanctioned Flag', points: factors.sanctionedFlagState, reason: 'Sanctioned country' });
  }

  if (EXAMPLE_VESSEL.flagOfConvenience) {
    score += factors.flagOfConvenience;
    breakdown.push({ label: 'Flag of Convenience', points: factors.flagOfConvenience, reason: 'Weak oversight flag' });
  }

  return { score: Math.min(100, Math.max(0, score)), breakdown };
}

function getRiskLevel(score: number): { level: string; color: string; bgColor: string } {
  if (score >= 70) return { level: 'CRITICAL', color: 'text-red-400', bgColor: 'bg-red-500' };
  if (score >= 50) return { level: 'HIGH', color: 'text-orange-400', bgColor: 'bg-orange-500' };
  if (score >= 30) return { level: 'MEDIUM', color: 'text-yellow-400', bgColor: 'bg-yellow-500' };
  return { level: 'LOW', color: 'text-green-400', bgColor: 'bg-green-500' };
}

export function ScoringConfig({ factors, onChange }: ScoringConfigProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);

  const handleFactorChange = (key: keyof ScoringFactors, value: number) => {
    onChange({ ...factors, [key]: value });
  };

  const handlePresetChange = (presetKey: string) => {
    onChange(PRESETS[presetKey].factors);
  };

  const { score: exampleScore, breakdown } = calculateExampleScore(factors);
  const riskInfo = getRiskLevel(exampleScore);

  const categories = ['duration', 'movement', 'location', 'anomaly', 'vessel', 'timing', 'weather', 'flag'] as const;

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-750 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Settings className="w-5 h-5 text-blue-400" />
          <div>
            <h3 className="text-lg font-semibold text-white">Scoring Configuration</h3>
            <p className="text-xs text-gray-400">Customize detection sensitivity and false positive reduction</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Mini score preview when collapsed */}
          {!isExpanded && (
            <div className="flex items-center gap-2 bg-gray-900/50 rounded-lg px-3 py-1">
              <span className="text-xs text-gray-400">Example Score:</span>
              <span className={`font-bold ${riskInfo.color}`}>{exampleScore}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${riskInfo.bgColor} text-white`}>{riskInfo.level}</span>
            </div>
          )}
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-gray-700">
          {/* Thesis Banner */}
          <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 px-4 py-3 border-b border-gray-700">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-white">The Thesis: Detecting ABSENCE</p>
                <p className="text-xs text-gray-300 mt-1">
                  Most tools analyze data that EXISTS. We detect ABSENCE — patterns in MISSING data.
                  Ships going &ldquo;dark&rdquo; to evade sanctions, smuggle cargo, and fish illegally.
                </p>
              </div>
            </div>
          </div>

          {/* Presets */}
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-300">Detection Presets</h4>
              <button
                onClick={() => onChange(DEFAULT_SCORING_FACTORS)}
                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
              >
                <RotateCcw className="w-3 h-3" />
                Reset to Defaults
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(PRESETS).map(([key, preset]) => {
                const isActive = JSON.stringify(factors) === JSON.stringify(preset.factors);
                return (
                  <button
                    key={key}
                    onClick={() => handlePresetChange(key)}
                    className={`p-3 rounded-lg border transition-all text-left ${
                      isActive
                        ? 'border-blue-500 bg-blue-500/20'
                        : 'border-gray-600 bg-gray-900/50 hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={isActive ? 'text-blue-400' : 'text-gray-400'}>{preset.icon}</span>
                      <span className={`font-medium ${isActive ? 'text-blue-300' : 'text-white'}`}>{preset.name}</span>
                    </div>
                    <p className="text-xs text-gray-400">{preset.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Preview */}
          {showPreview && (
            <div className="p-4 bg-gray-900/30 border-b border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-300">Live Score Preview</h4>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-xs text-gray-500 hover:text-gray-400"
                >
                  Hide
                </button>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium text-white">{EXAMPLE_VESSEL.name}</p>
                    <p className="text-xs text-gray-400">
                      {EXAMPLE_VESSEL.darkHours}h dark | {EXAMPLE_VESSEL.distanceNm}nm | {EXAMPLE_VESSEL.zoneName}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${riskInfo.color}`}>{exampleScore}</div>
                    <span className={`text-xs px-2 py-0.5 rounded ${riskInfo.bgColor} text-white`}>{riskInfo.level}</span>
                  </div>
                </div>

                {/* Score bar */}
                <div className="h-3 bg-gray-700 rounded-full overflow-hidden mb-3">
                  <div
                    className={`h-full transition-all duration-300 ${riskInfo.bgColor}`}
                    style={{ width: `${exampleScore}%` }}
                  />
                </div>

                {/* Breakdown */}
                <div className="space-y-1">
                  {breakdown.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">{item.reason}</span>
                      <span className={item.points >= 0 ? 'text-red-400' : 'text-green-400'}>
                        {item.points >= 0 ? '+' : ''}{item.points}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Factor Categories */}
          <div className="p-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {categories.map((category) => {
                const catInfo = CATEGORY_INFO[category];
                const catFactors = (Object.keys(FACTOR_CONFIG) as Array<keyof ScoringFactors>)
                  .filter((key) => FACTOR_CONFIG[key].category === category);
                const isActive = activeCategory === category;

                return (
                  <div
                    key={category}
                    className={`bg-gray-900/50 rounded-lg overflow-hidden border transition-colors ${
                      isActive ? 'border-blue-500' : 'border-transparent'
                    }`}
                  >
                    <button
                      onClick={() => setActiveCategory(isActive ? null : category)}
                      className="w-full p-3 text-left hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{catInfo.icon}</span>
                          <span className="text-sm font-semibold text-gray-200">{catInfo.label}</span>
                        </div>
                        <Info className="w-4 h-4 text-gray-500" />
                      </div>
                      {isActive && (
                        <p className="text-xs text-blue-300 mt-2 italic">{catInfo.thesis}</p>
                      )}
                    </button>

                    <div className="px-3 pb-3 space-y-2">
                      {catFactors.map((key) => {
                        const config = FACTOR_CONFIG[key];
                        const value = factors[key];
                        const isNegative = value < 0;

                        return (
                          <div key={key} className="group">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <label
                                className="text-xs text-gray-400 flex-1 truncate"
                                title={config.description}
                              >
                                {config.label}
                              </label>
                              <input
                                type="number"
                                value={value}
                                onChange={(e) => handleFactorChange(key, Number(e.target.value))}
                                className={`w-14 text-center text-sm rounded px-1 py-0.5 ${
                                  isNegative
                                    ? 'bg-green-900/50 text-green-300 border border-green-700'
                                    : value > 20
                                    ? 'bg-red-900/50 text-red-300 border border-red-700'
                                    : 'bg-gray-700 text-white border border-gray-600'
                                }`}
                                min={-100}
                                max={100}
                              />
                            </div>
                            {/* Mini bar visualization */}
                            <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all ${
                                  isNegative ? 'bg-green-500' : config.color
                                }`}
                                style={{
                                  width: `${Math.min(100, Math.abs(value))}%`,
                                  marginLeft: isNegative ? 'auto' : 0
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Risk Level Legend */}
            <div className="mt-4 p-3 bg-gray-900/50 rounded-lg">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-gray-400 font-medium">Risk Levels:</span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-red-500"></span>
                    <span className="text-red-400">CRITICAL (70-100)</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-orange-500"></span>
                    <span className="text-orange-400">HIGH (50-69)</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-yellow-500"></span>
                    <span className="text-yellow-400">MEDIUM (30-49)</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-green-500"></span>
                    <span className="text-green-400">LOW (0-29)</span>
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  Positive values = increase suspicion | Negative values = reduce false positives
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
