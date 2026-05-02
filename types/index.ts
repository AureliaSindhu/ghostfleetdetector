export interface AISRecord {
  mmsi: string;
  timestamp: Date;
  latitude: number;
  longitude: number;
  sog?: number;
  cog?: number;
  shipType?: number;
  shipName?: string;
  flag?: string;
}

export interface DarkPeriod {
  mmsi: string;
  lastSeenTime: Date;
  reappearTime: Date;
  gapHours: number;
  lastLat: number;
  lastLon: number;
  reappearLat: number;
  reappearLon: number;
  distanceNm: number;
  impliedSpeedKnots: number;
}

export interface ScoredDarkPeriod extends DarkPeriod {
  suspicionScore: number;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  reasons: string[];
}

export interface WeatherData {
  windSpeedKnots: number;
  windGustsKnots: number;
  precipitationMm: number;
  weatherCode: number;
  visibilityM: number;
}

export interface SanctionsResult {
  isSanctioned: boolean;
  matches: Array<{
    name: string;
    score: number;
    type: string;
  }>;
  flagSanctioned: boolean;
  flagOfConvenience: boolean;
  reasons: string[];
}

export interface TransshipmentZone {
  name: string;
  latMin: number;
  latMax: number;
  lonMin: number;
  lonMax: number;
}
