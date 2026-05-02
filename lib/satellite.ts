const SENTINEL_HUB_URL = 'https://services.sentinel-hub.com';

export interface SatelliteSearchResult {
  available: boolean;
  imageCount: number;
  dates: string[];
  cloudCover: number[];
  canVerify: boolean;
}

export class SentinelHubClient {
  private token: string | null = null;
  private clientId: string;
  private clientSecret: string;

  constructor(clientId: string, clientSecret: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  async authenticate(): Promise<void> {
    const response = await fetch(
      `${SENTINEL_HUB_URL}/oauth/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
        }),
      }
    );
    const data = await response.json();
    this.token = data.access_token;
  }

  async searchImagery(
    lat: number,
    lon: number,
    date: Date,
    daysRange: number = 3
  ): Promise<SatelliteSearchResult> {
    if (!this.token) await this.authenticate();

    const startDate = new Date(date);
    startDate.setDate(startDate.getDate() - daysRange);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + daysRange);

    const bbox = [lon - 0.1, lat - 0.1, lon + 0.1, lat + 0.1];

    const response = await fetch(`${SENTINEL_HUB_URL}/api/v1/catalog/search`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bbox,
        datetime: `${startDate.toISOString().split('T')[0]}/${endDate.toISOString().split('T')[0]}`,
        collections: ['sentinel-2-l2a'],
        limit: 10,
      }),
    });

    const data = await response.json();
    const features: { properties?: { datetime?: string; 'eo:cloud_cover'?: number } }[] =
      data.features || [];

    return {
      available: features.length > 0,
      imageCount: features.length,
      dates: features.map((f) => f.properties?.datetime ?? ''),
      cloudCover: features.map((f) => f.properties?.['eo:cloud_cover'] ?? 100),
      canVerify: features.some((f) => (f.properties?.['eo:cloud_cover'] ?? 100) < 30),
    };
  }
}

export async function checkSatelliteForDarkPeriod(
  lastLat: number,
  lastLon: number,
  reappearLat: number,
  reappearLon: number,
  timestamp: Date,
  gapHours: number
): Promise<SatelliteSearchResult & { midpointChecked: boolean }> {
  const clientId = process.env.SENTINEL_CLIENT_ID || '';
  const clientSecret = process.env.SENTINEL_CLIENT_SECRET || '';

  if (!clientId || !clientSecret) {
    return {
      available: false,
      imageCount: 0,
      dates: [],
      cloudCover: [],
      canVerify: false,
      midpointChecked: false,
    };
  }

  const client = new SentinelHubClient(clientId, clientSecret);
  const midLat = (lastLat + reappearLat) / 2;
  const midLon = (lastLon + reappearLon) / 2;

  const result = await client.searchImagery(
    midLat,
    midLon,
    timestamp,
    Math.ceil(gapHours / 24) + 1
  );

  return { ...result, midpointChecked: true };
}
