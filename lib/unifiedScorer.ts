import { DarkPeriod, ScoredDarkPeriod, WeatherData, SanctionsResult } from '@/types';
import { calculateSuspicionScore } from './scorer';
import { getWeatherAtLocation, assessWeatherSeverity } from './weather';
import { checkStormOverlap, StormData } from './storms';
import { checkVesselSanctions } from './sanctions';

export interface UnifiedScoreResult extends ScoredDarkPeriod {
  baseScore: number;
  finalScore: number;
  modifiers: {
    weather: number;
    storm: number;
    sanctions: number;
    satellite: number;
  };
  weatherData?: WeatherData;
  sanctionsData?: SanctionsResult;
  stormData?: { name: string; category?: string };
}

export async function calculateUnifiedScore(
  darkPeriod: DarkPeriod,
  options: {
    checkWeather?: boolean;
    checkSanctions?: boolean;
    vesselName?: string;
    flag?: string;
  } = {}
): Promise<UnifiedScoreResult> {
  const baseResult = calculateSuspicionScore(darkPeriod);
  let score = baseResult.suspicionScore;
  const reasons = [...baseResult.reasons];
  const modifiers = { weather: 0, storm: 0, sanctions: 0, satellite: 0 };

  let weatherData: WeatherData | undefined;
  let sanctionsData: SanctionsResult | undefined;
  let stormData: { name: string; category?: string } | undefined;

  if (options.checkWeather !== false) {
    try {
      const weather = await getWeatherAtLocation(
        darkPeriod.lastLat,
        darkPeriod.lastLon,
        darkPeriod.lastSeenTime
      );
      if (weather) {
        weatherData = weather;
        const assessment = assessWeatherSeverity(weather);
        if (assessment.scoreReduction > 0) {
          modifiers.weather = -assessment.scoreReduction;
          score -= assessment.scoreReduction;
          reasons.push(`🌤️ Weather: ${assessment.reasons.join(', ')}`);
        }
      }
    } catch (e) {
      console.error('Weather check failed:', e);
    }
  }

  const stormCheck = checkStormOverlap(
    darkPeriod.lastLat,
    darkPeriod.lastLon,
    darkPeriod.lastSeenTime
  );
  if (stormCheck.inStorm && stormCheck.storm) {
    modifiers.storm = -stormCheck.scoreReduction;
    score -= stormCheck.scoreReduction;
    stormData = { name: stormCheck.storm.name, category: (stormCheck.storm as StormData).category };
    reasons.push(`⛈️ In storm zone: ${stormCheck.storm.name}`);
  }

  if (options.checkSanctions !== false) {
    try {
      const sanctions = await checkVesselSanctions(options.vesselName, options.flag);
      sanctionsData = sanctions;
      if (sanctions.isSanctioned) {
        const bonus = sanctions.flagSanctioned ? 35 : 25;
        modifiers.sanctions = bonus;
        score += bonus;
        reasons.push(...sanctions.reasons);
      } else if (sanctions.flagOfConvenience) {
        modifiers.sanctions = 10;
        score += 10;
        reasons.push(...sanctions.reasons);
      }
    } catch (e) {
      console.error('Sanctions check failed:', e);
    }
  }

  score = Math.max(0, Math.min(100, score));

  let riskLevel: ScoredDarkPeriod['riskLevel'];
  if (score >= 70) riskLevel = 'CRITICAL';
  else if (score >= 50) riskLevel = 'HIGH';
  else if (score >= 30) riskLevel = 'MEDIUM';
  else riskLevel = 'LOW';

  return {
    ...darkPeriod,
    baseScore: baseResult.suspicionScore,
    finalScore: score,
    suspicionScore: score,
    riskLevel,
    reasons,
    modifiers,
    weatherData,
    sanctionsData,
    stormData,
  };
}
