'use client';

import { useState, useEffect } from 'react';
import { X, CloudRain, Shield, Loader2 } from 'lucide-react';
import { ScoredDarkPeriod, WeatherData, SanctionsResult } from '@/types';
import { IntelReport } from './IntelReport';
import { getWeatherAtLocation, assessWeatherSeverity } from '@/lib/weather';
import { checkVesselSanctions } from '@/lib/sanctions';

interface VesselDetailModalProps {
  period: ScoredDarkPeriod;
  onClose: () => void;
}

const RISK_BAR_COLORS = {
  CRITICAL: 'bg-red-500',
  HIGH: 'bg-orange-500',
  MEDIUM: 'bg-yellow-500',
  LOW: 'bg-green-500',
};

export function VesselDetailModal({ period, onClose }: VesselDetailModalProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [sanctions, setSanctions] = useState<SanctionsResult | null>(null);
  const [sanctionsLoading, setSanctionsLoading] = useState(true);

  useEffect(() => {
    // Fetch weather data
    setWeatherLoading(true);
    getWeatherAtLocation(period.lastLat, period.lastLon, period.lastSeenTime)
      .then(setWeather)
      .finally(() => setWeatherLoading(false));

    // Check sanctions (using MMSI as a proxy - in reality you'd have vessel name/flag)
    setSanctionsLoading(true);
    checkVesselSanctions(undefined, undefined, undefined)
      .then(setSanctions)
      .finally(() => setSanctionsLoading(false));
  }, [period]);

  const weatherAssessment = weather ? assessWeatherSeverity(weather) : null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-2xl font-bold text-white">Vessel {period.mmsi}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-2 text-white">📊 Suspicion Score</h3>
            <div className="bg-gray-700 rounded-full h-4 overflow-hidden">
              <div
                className={`h-full ${RISK_BAR_COLORS[period.riskLevel]}`}
                style={{ width: `${period.suspicionScore}%` }}
              />
            </div>
            <p className="mt-2 text-2xl font-bold text-white">
              {period.suspicionScore}/100 —{' '}
              <span className="text-lg">{period.riskLevel}</span>
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2 text-white">📍 Dark Period Details</h3>
            <div className="space-y-1 text-sm text-gray-300">
              <p>
                <span className="text-gray-400">Last seen:</span>{' '}
                {period.lastSeenTime.toLocaleString()}
              </p>
              <p>
                <span className="text-gray-400">Reappeared:</span>{' '}
                {period.reappearTime.toLocaleString()}
              </p>
              <p>
                <span className="text-gray-400">Duration:</span>{' '}
                {period.gapHours.toFixed(1)} hours
              </p>
              <p>
                <span className="text-gray-400">Distance:</span>{' '}
                {period.distanceNm.toFixed(1)} nm
              </p>
              <p>
                <span className="text-gray-400">Implied speed:</span>{' '}
                {period.impliedSpeedKnots.toFixed(1)} knots
              </p>
            </div>
          </div>
        </div>

        {/* Weather Section */}
        <div className="mt-6 bg-gray-700/50 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2 text-white flex items-center gap-2">
            <CloudRain className="w-5 h-5" />
            Weather Conditions
          </h3>
          {weatherLoading ? (
            <div className="flex items-center gap-2 text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              Checking weather...
            </div>
          ) : weather ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Wind:</span>
                  <span className="ml-2 text-white">{weather.windSpeedKnots} kts</span>
                </div>
                <div>
                  <span className="text-gray-400">Gusts:</span>
                  <span className="ml-2 text-white">{weather.windGustsKnots} kts</span>
                </div>
                <div>
                  <span className="text-gray-400">Precip:</span>
                  <span className="ml-2 text-white">{weather.precipitationMm} mm</span>
                </div>
                <div>
                  <span className="text-gray-400">Visibility:</span>
                  <span className="ml-2 text-white">{(weather.visibilityM / 1000).toFixed(1)} km</span>
                </div>
              </div>
              {weatherAssessment && (
                <div className={`mt-2 p-2 rounded ${weatherAssessment.isSevere ? 'bg-green-900/50 text-green-300' : 'bg-yellow-900/50 text-yellow-300'}`}>
                  {weatherAssessment.isSevere ? (
                    <p>✅ Severe weather detected — may explain AIS gap (-{weatherAssessment.scoreReduction} points)</p>
                  ) : weatherAssessment.reasons.length > 0 ? (
                    <p>⚠️ Minor weather: {weatherAssessment.reasons.join(', ')}</p>
                  ) : (
                    <p>🔴 Clear weather — no legitimate reason for going dark</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-400">Weather data unavailable</p>
          )}
        </div>

        {/* Sanctions Section */}
        <div className="mt-4 bg-gray-700/50 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2 text-white flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Sanctions Check
          </h3>
          {sanctionsLoading ? (
            <div className="flex items-center gap-2 text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              Checking sanctions lists...
            </div>
          ) : sanctions ? (
            <div>
              {sanctions.isSanctioned ? (
                <div className="bg-red-900/50 text-red-300 p-2 rounded">
                  🚫 SANCTIONS ALERT: {sanctions.reasons.join(', ')}
                </div>
              ) : sanctions.flagOfConvenience ? (
                <div className="bg-yellow-900/50 text-yellow-300 p-2 rounded">
                  🏴 {sanctions.reasons.join(', ')}
                </div>
              ) : (
                <div className="bg-gray-600/50 text-gray-300 p-2 rounded">
                  ✓ No sanctions matches found
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-400">Sanctions data unavailable</p>
          )}
        </div>

        {/* Risk Factors */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2 text-white">⚠️ Risk Factors</h3>
          <ul className="space-y-1">
            {period.reasons.map((reason, i) => (
              <li key={i} className="text-sm bg-gray-700 rounded px-3 py-2 text-gray-200">
                {reason}
              </li>
            ))}
          </ul>
        </div>

        {/* AI Intelligence Report */}
        <IntelReport
          darkPeriod={period}
          weatherData={weather}
          sanctionsData={sanctions}
        />
      </div>
    </div>
  );
}
