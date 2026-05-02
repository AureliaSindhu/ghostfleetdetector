export interface StormData {
  name: string;
  startDate: string;
  endDate: string;
  latMin: number;
  latMax: number;
  lonMin: number;
  lonMax: number;
  category?: string;
}

const MAJOR_STORMS: StormData[] = [
  {
    name: 'Typhoon Hinnamnor',
    startDate: '2022-08-28',
    endDate: '2022-09-06',
    latMin: 20, latMax: 40,
    lonMin: 120, lonMax: 145,
    category: 'Super Typhoon',
  },
  {
    name: 'Hurricane Ian',
    startDate: '2022-09-23',
    endDate: '2022-10-02',
    latMin: 15, latMax: 35,
    lonMin: -90, lonMax: -75,
    category: 'Category 5',
  },
  {
    name: 'Cyclone Freddy',
    startDate: '2023-02-06',
    endDate: '2023-03-14',
    latMin: -25, latMax: -10,
    lonMin: 30, lonMax: 90,
    category: 'Category 5',
  },
];

export function checkStormOverlap(
  lat: number,
  lon: number,
  timestamp: Date
): { inStorm: boolean; storm: StormData | null; scoreReduction: number } {
  const dateStr = timestamp.toISOString().split('T')[0];

  for (const storm of MAJOR_STORMS) {
    if (dateStr >= storm.startDate && dateStr <= storm.endDate) {
      if (
        lat >= storm.latMin && lat <= storm.latMax &&
        lon >= storm.lonMin && lon <= storm.lonMax
      ) {
        return { inStorm: true, storm, scoreReduction: 40 };
      }
    }
  }

  return { inStorm: false, storm: null, scoreReduction: 0 };
}

export async function fetchActiveStorms(): Promise<StormData[]> {
  try {
    const response = await fetch('https://www.nhc.noaa.gov/CurrentStorms.json');
    if (response.ok) {
      const data = await response.json();
      return data.activeStorms || [];
    }
  } catch (error) {
    console.error('Failed to fetch storm data:', error);
  }
  return MAJOR_STORMS;
}
