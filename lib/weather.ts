import { WeatherData } from '@/types';

const OPEN_METEO_URL = 'https://archive-api.open-meteo.com/v1/archive';

const SEVERE_WEATHER_CODES: Record<number, string> = {
  95: '⛈️ Thunderstorm',
  96: '⛈️ Thunderstorm with hail',
  99: '⛈️ Thunderstorm with heavy hail',
  65: '🌧️ Heavy rain',
  67: '🌧️ Heavy freezing rain',
  75: '❄️ Heavy snow',
  82: '🌧️ Violent rain showers',
  86: '❄️ Heavy snow showers',
};

export async function getWeatherAtLocation(
  lat: number,
  lon: number,
  timestamp: Date
): Promise<WeatherData | null> {
  const dateStr = timestamp.toISOString().split('T')[0];

  try {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      start_date: dateStr,
      end_date: dateStr,
      hourly: 'wind_speed_10m,wind_gusts_10m,precipitation,weather_code,visibility',
    });

    const response = await fetch(`${OPEN_METEO_URL}?${params}`);
    if (!response.ok) return null;

    const data = await response.json();
    const hour = timestamp.getHours();
    const hourly = data.hourly || {};

    const windKmh = hourly.wind_speed_10m?.[hour] || 0;
    const gustsKmh = hourly.wind_gusts_10m?.[hour] || 0;

    return {
      windSpeedKnots: Math.round(windKmh * 0.539957 * 10) / 10,
      windGustsKnots: Math.round(gustsKmh * 0.539957 * 10) / 10,
      precipitationMm: hourly.precipitation?.[hour] || 0,
      weatherCode: hourly.weather_code?.[hour] || 0,
      visibilityM: hourly.visibility?.[hour] || 10000,
    };
  } catch (error) {
    console.error('Weather API error:', error);
    return null;
  }
}

export function assessWeatherSeverity(weather: WeatherData): {
  isSevere: boolean;
  scoreReduction: number;
  reasons: string[];
} {
  const reasons: string[] = [];
  let isSevere = false;

  if (weather.windSpeedKnots > 48) {
    isSevere = true;
    reasons.push(`🌊 Storm force winds: ${weather.windSpeedKnots} knots`);
  } else if (weather.windSpeedKnots > 34) {
    reasons.push(`💨 Gale force winds: ${weather.windSpeedKnots} knots`);
  }

  if (weather.windGustsKnots > 60) {
    isSevere = true;
    reasons.push(`💨 Dangerous gusts: ${weather.windGustsKnots} knots`);
  }

  if (SEVERE_WEATHER_CODES[weather.weatherCode]) {
    isSevere = true;
    reasons.push(SEVERE_WEATHER_CODES[weather.weatherCode]);
  }

  if (weather.visibilityM < 1000) {
    reasons.push(`🌫️ Poor visibility: ${weather.visibilityM}m`);
  }

  return {
    isSevere,
    scoreReduction: isSevere ? 30 : reasons.length > 0 ? 15 : 0,
    reasons,
  };
}
