import { DarkPeriod, ScoredDarkPeriod, TransshipmentZone } from '@/types';
import { ScoringFactors } from '@/components/ScoringConfig';

const TRANSSHIPMENT_ZONES: TransshipmentZone[] = [
  { name: 'South China Sea', latMin: 5, latMax: 25, lonMin: 105, lonMax: 120 },
  { name: 'Gulf of Guinea', latMin: -5, latMax: 10, lonMin: -10, lonMax: 15 },
  { name: 'Strait of Hormuz', latMin: 24, latMax: 28, lonMin: 54, lonMax: 58 },
  { name: 'Strait of Malacca', latMin: 0, latMax: 8, lonMin: 98, lonMax: 105 },
  { name: 'Caribbean', latMin: 10, latMax: 25, lonMin: -85, lonMax: -60 },
  { name: 'East Africa Coast', latMin: -10, latMax: 15, lonMin: 40, lonMax: 55 },
];

const HIGH_RISK_SHIP_TYPES: Record<number, string> = {
  80: 'Tanker',
  81: 'Tanker - Hazardous A',
  82: 'Tanker - Hazardous B',
  83: 'Tanker - Hazardous C',
  84: 'Tanker - Hazardous D',
  30: 'Fishing',
  31: 'Towing',
  32: 'Towing (large)',
};

function inTransshipmentZone(
  lat: number,
  lon: number
): { inZone: boolean; zoneName: string | null } {
  for (const zone of TRANSSHIPMENT_ZONES) {
    if (
      lat >= zone.latMin &&
      lat <= zone.latMax &&
      lon >= zone.lonMin &&
      lon <= zone.lonMax
    ) {
      return { inZone: true, zoneName: zone.name };
    }
  }
  return { inZone: false, zoneName: null };
}

export function calculateSuspicionScore(
  darkPeriod: DarkPeriod,
  shipType?: number
): ScoredDarkPeriod {
  let score = 0;
  const reasons: string[] = [];

  if (darkPeriod.gapHours >= 72) {
    score += 30;
    reasons.push(`⏰ Extended dark period: ${darkPeriod.gapHours.toFixed(0)} hours`);
  } else if (darkPeriod.gapHours >= 24) {
    score += 20;
    reasons.push(`⏰ Long dark period: ${darkPeriod.gapHours.toFixed(0)} hours`);
  } else if (darkPeriod.gapHours >= 12) {
    score += 10;
    reasons.push(`⏰ Dark period: ${darkPeriod.gapHours.toFixed(0)} hours`);
  }

  if (darkPeriod.distanceNm > 200) {
    score += 20;
    reasons.push(`📍 Large distance while dark: ${darkPeriod.distanceNm.toFixed(0)} nm`);
  } else if (darkPeriod.distanceNm > 100) {
    score += 10;
    reasons.push(`📍 Significant distance: ${darkPeriod.distanceNm.toFixed(0)} nm`);
  }

  const zoneCheck = inTransshipmentZone(darkPeriod.lastLat, darkPeriod.lastLon);
  if (zoneCheck.inZone) {
    score += 25;
    reasons.push(`🗺️ In transshipment zone: ${zoneCheck.zoneName}`);
  }

  if (darkPeriod.impliedSpeedKnots > 30) {
    score += 20;
    reasons.push(`⚡ Impossible speed: ${darkPeriod.impliedSpeedKnots.toFixed(1)} knots`);
  } else if (darkPeriod.impliedSpeedKnots > 25) {
    score += 10;
    reasons.push(`⚡ Very high speed: ${darkPeriod.impliedSpeedKnots.toFixed(1)} knots`);
  }

  if (shipType && HIGH_RISK_SHIP_TYPES[shipType]) {
    score += 10;
    reasons.push(`🚢 High-risk type: ${HIGH_RISK_SHIP_TYPES[shipType]}`);
  }

  const hour = darkPeriod.lastSeenTime.getHours();
  if (hour >= 22 || hour <= 5) {
    score += 5;
    reasons.push('🌙 Went dark at night');
  }

  score = Math.min(score, 100);

  let riskLevel: ScoredDarkPeriod['riskLevel'];
  if (score >= 70) riskLevel = 'CRITICAL';
  else if (score >= 50) riskLevel = 'HIGH';
  else if (score >= 30) riskLevel = 'MEDIUM';
  else riskLevel = 'LOW';

  return { ...darkPeriod, suspicionScore: score, riskLevel, reasons };
}

export function scoreAllDarkPeriods(darkPeriods: DarkPeriod[]): ScoredDarkPeriod[] {
  return darkPeriods
    .map((dp) => calculateSuspicionScore(dp))
    .sort((a, b) => b.suspicionScore - a.suspicionScore);
}

// Dynamic scoring with custom factors
export function calculateScoreWithFactors(
  darkPeriod: DarkPeriod,
  factors: ScoringFactors
): ScoredDarkPeriod {
  let score = 0;
  const reasons: string[] = [];

  // Dark period duration
  if (darkPeriod.gapHours >= 72) {
    score += factors.darkPeriodOver72h;
    reasons.push(`⏰ Extended dark period: ${darkPeriod.gapHours.toFixed(0)} hours (+${factors.darkPeriodOver72h})`);
  } else if (darkPeriod.gapHours >= 24) {
    score += factors.darkPeriod24to72h;
    reasons.push(`⏰ Long dark period: ${darkPeriod.gapHours.toFixed(0)} hours (+${factors.darkPeriod24to72h})`);
  } else if (darkPeriod.gapHours >= 12) {
    score += factors.darkPeriod12to24h;
    reasons.push(`⏰ Dark period: ${darkPeriod.gapHours.toFixed(0)} hours (+${factors.darkPeriod12to24h})`);
  } else if (darkPeriod.gapHours >= 6) {
    score += factors.darkPeriod6to12h;
    reasons.push(`⏰ Suspicious gap: ${darkPeriod.gapHours.toFixed(0)} hours (+${factors.darkPeriod6to12h})`);
  }

  // Distance while dark
  if (darkPeriod.distanceNm > 200) {
    score += factors.distanceOver200nm;
    reasons.push(`📍 Large distance while dark: ${darkPeriod.distanceNm.toFixed(0)} nm (+${factors.distanceOver200nm})`);
  } else if (darkPeriod.distanceNm > 100) {
    score += factors.distance100to200nm;
    reasons.push(`📍 Significant distance: ${darkPeriod.distanceNm.toFixed(0)} nm (+${factors.distance100to200nm})`);
  }

  // Transshipment zone
  const zoneCheck = inTransshipmentZone(darkPeriod.lastLat, darkPeriod.lastLon);
  if (zoneCheck.inZone) {
    score += factors.inTransshipmentZone;
    reasons.push(`🗺️ In transshipment zone: ${zoneCheck.zoneName} (+${factors.inTransshipmentZone})`);
  }

  // Impossible speed
  if (darkPeriod.impliedSpeedKnots > 30) {
    score += factors.impossibleSpeed;
    reasons.push(`⚡ Impossible speed: ${darkPeriod.impliedSpeedKnots.toFixed(1)} knots (+${factors.impossibleSpeed})`);
  }

  // Went dark at night
  const hour = darkPeriod.lastSeenTime.getHours();
  if (hour >= 22 || hour <= 5) {
    score += factors.wentDarkAtNight;
    reasons.push(`🌙 Went dark at night (+${factors.wentDarkAtNight})`);
  }

  // Clamp score to 0-100
  score = Math.max(0, Math.min(100, score));

  // Determine risk level
  let riskLevel: ScoredDarkPeriod['riskLevel'];
  if (score >= 70) riskLevel = 'CRITICAL';
  else if (score >= 50) riskLevel = 'HIGH';
  else if (score >= 30) riskLevel = 'MEDIUM';
  else riskLevel = 'LOW';

  return { ...darkPeriod, suspicionScore: score, riskLevel, reasons };
}

export function rescoreAllWithFactors(
  darkPeriods: ScoredDarkPeriod[],
  factors: ScoringFactors
): ScoredDarkPeriod[] {
  return darkPeriods
    .map((dp) => calculateScoreWithFactors(dp, factors))
    .sort((a, b) => b.suspicionScore - a.suspicionScore);
}
