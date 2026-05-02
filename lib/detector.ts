import { AISRecord, DarkPeriod } from '@/types';

const EARTH_RADIUS_NM = 3440.065;

export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_NM * c;
}

export function detectDarkPeriods(
  track: AISRecord[],
  minGapHours: number = 6
): DarkPeriod[] {
  const darkPeriods: DarkPeriod[] = [];

  if (track.length < 2) return darkPeriods;

  const sorted = [...track].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];

    const gapMs = curr.timestamp.getTime() - prev.timestamp.getTime();
    const gapHours = gapMs / (1000 * 60 * 60);

    if (gapHours >= minGapHours) {
      const distanceNm = haversineDistance(
        prev.latitude,
        prev.longitude,
        curr.latitude,
        curr.longitude
      );

      const impliedSpeedKnots = gapHours > 0 ? distanceNm / gapHours : 0;

      darkPeriods.push({
        mmsi: curr.mmsi,
        lastSeenTime: prev.timestamp,
        reappearTime: curr.timestamp,
        gapHours: Math.round(gapHours * 100) / 100,
        lastLat: prev.latitude,
        lastLon: prev.longitude,
        reappearLat: curr.latitude,
        reappearLon: curr.longitude,
        distanceNm: Math.round(distanceNm * 100) / 100,
        impliedSpeedKnots: Math.round(impliedSpeedKnots * 100) / 100,
      });
    }
  }

  return darkPeriods;
}

export function findAllDarkPeriods(
  vesselGroups: Map<string, AISRecord[]>,
  minGapHours: number = 6,
  onProgress?: (progress: number) => void
): DarkPeriod[] {
  const allDarkPeriods: DarkPeriod[] = [];
  const vessels = Array.from(vesselGroups.entries());

  vessels.forEach(([, track], index) => {
    const periods = detectDarkPeriods(track, minGapHours);
    allDarkPeriods.push(...periods);

    if (onProgress && index % 100 === 0) {
      onProgress(index / vessels.length);
    }
  });

  return allDarkPeriods.sort((a, b) => b.gapHours - a.gapHours);
}
