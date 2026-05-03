import Papa from 'papaparse';
import { AISRecord } from '@/types';

type AISCsvRow = Partial<Record<string, string>>;

export function parseAISData(csvText: string): AISRecord[] {
  const result = Papa.parse<AISCsvRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.toUpperCase().trim(),
  });

  return result.data.map((row) => ({
    mmsi: String(row.MMSI || row.mmsi || ''),
    timestamp: new Date(row.TIMESTAMP || row.BASEDATETIME || row.timestamp || ''),
    latitude: parseFloat(row.LATITUDE || row.LAT || row.latitude || ''),
    longitude: parseFloat(row.LONGITUDE || row.LON || row.longitude || ''),
    sog: parseFloat(row.SOG || row.sog || '') || undefined,
    cog: parseFloat(row.COG || row.cog || '') || undefined,
    shipType: parseInt(row.SHIPTYPE || row.shiptype || '') || undefined,
    shipName: row.SHIPNAME || row.NAME || row.shipname,
    flag: row.FLAG || row.flag,
  }));
}

export function validateAISData(records: AISRecord[]): AISRecord[] {
  return records.filter((record) => {
    if (record.latitude < -90 || record.latitude > 90) return false;
    if (record.longitude < -180 || record.longitude > 180) return false;
    if (record.latitude === 0 && record.longitude === 0) return false;
    if (record.mmsi.length !== 9) return false;
    if (isNaN(record.timestamp.getTime())) return false;
    return true;
  });
}

export function groupByVessel(records: AISRecord[]): Map<string, AISRecord[]> {
  const groups = new Map<string, AISRecord[]>();

  const sorted = [...records].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );

  for (const record of sorted) {
    const existing = groups.get(record.mmsi) || [];
    existing.push(record);
    groups.set(record.mmsi, existing);
  }

  return groups;
}

export function getDataSummary(records: AISRecord[]) {
  const timestamps = records.map((r) => r.timestamp.getTime());

  return {
    totalRecords: records.length,
    uniqueVessels: new Set(records.map((r) => r.mmsi)).size,
    dateRange: {
      start: new Date(Math.min(...timestamps)),
      end: new Date(Math.max(...timestamps)),
    },
  };
}
