'use client';

import { useState, useEffect } from 'react';
import { Scan, Mail, Bell, Shield, Zap, Check, Loader2 } from 'lucide-react';

interface MagicScannerProps {
  onSubscribe?: (email: string, preferences: AlertPreferences) => void;
}

interface AlertPreferences {
  criticalOnly: boolean;
  highAndAbove: boolean;
  allAlerts: boolean;
  regions: string[];
}

const REGIONS = [
  { id: 'south_china_sea', label: 'South China Sea', flag: '🌏' },
  { id: 'strait_of_hormuz', label: 'Strait of Hormuz', flag: '🌍' },
  { id: 'gulf_of_guinea', label: 'Gulf of Guinea', flag: '🌍' },
  { id: 'strait_of_malacca', label: 'Strait of Malacca', flag: '🌏' },
  { id: 'black_sea', label: 'Black Sea', flag: '🌍' },
  { id: 'mediterranean', label: 'Mediterranean', flag: '🌍' },
];

export function MagicScanner({ onSubscribe }: MagicScannerProps) {
  const [email, setEmail] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<AlertPreferences>({
    criticalOnly: false,
    highAndAbove: true,
    allAlerts: false,
    regions: ['south_china_sea', 'strait_of_hormuz'],
  });

  // Scanning animation
  useEffect(() => {
    if (isScanning) {
      const interval = setInterval(() => {
        setScanProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsScanning(false);
            setIsSubscribed(true);
            return 100;
          }
          return prev + 5;
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isScanning]);

  const handleSubscribe = () => {
    if (!email || !email.includes('@')) return;
    setIsScanning(true);
    setScanProgress(0);
    onSubscribe?.(email, preferences);
  };

  const toggleRegion = (regionId: string) => {
    setPreferences((prev) => ({
      ...prev,
      regions: prev.regions.includes(regionId)
        ? prev.regions.filter((r) => r !== regionId)
        : [...prev.regions, regionId],
    }));
  };

  if (isSubscribed) {
    return (
      <div className="bg-gradient-to-br from-green-900/50 to-emerald-900/50 border border-green-500/30 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
            <Check className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-green-300">Scanner Active</h3>
            <p className="text-sm text-green-400/70">Monitoring global maritime traffic</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center mb-4">
          <div className="bg-black/30 rounded p-2">
            <div className="text-2xl font-bold text-green-400">234</div>
            <div className="text-xs text-gray-400">Vessels Tracked</div>
          </div>
          <div className="bg-black/30 rounded p-2">
            <div className="text-2xl font-bold text-yellow-400">12</div>
            <div className="text-xs text-gray-400">Dark Periods</div>
          </div>
          <div className="bg-black/30 rounded p-2">
            <div className="text-2xl font-bold text-red-400">3</div>
            <div className="text-xs text-gray-400">Critical Alerts</div>
          </div>
        </div>

        <div className="text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            <span>Alerts will be sent to: <strong className="text-white">{email}</strong></span>
          </div>
        </div>

        <button
          onClick={() => {
            setIsSubscribed(false);
            setEmail('');
            setScanProgress(0);
          }}
          className="mt-4 text-sm text-gray-500 hover:text-gray-300"
        >
          Change settings
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-900 to-blue-900/30 border border-blue-500/30 rounded-lg p-6 relative overflow-hidden">
      {/* Animated background scanner effect */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0 bg-gradient-to-b from-blue-500/10 to-transparent"
          style={{
            transform: `translateY(${isScanning ? scanProgress : 0}%)`,
            transition: 'transform 0.1s linear',
          }}
        />
        {isScanning && (
          <div
            className="absolute left-0 right-0 h-1 bg-blue-400 shadow-lg shadow-blue-400/50"
            style={{
              top: `${scanProgress}%`,
              transition: 'top 0.1s linear',
            }}
          />
        )}
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
            <Scan className={`w-6 h-6 text-blue-400 ${isScanning ? 'animate-pulse' : ''}`} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Magic Scanner</h3>
            <p className="text-sm text-blue-400/70">Real-time dark fleet detection</p>
          </div>
        </div>

        {isScanning ? (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2 py-4">
              <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
              <span className="text-blue-300">Initializing scanner...</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-100"
                style={{ width: `${scanProgress}%` }}
              />
            </div>
            <div className="text-center text-xs text-gray-500">
              {scanProgress < 30
                ? 'Connecting to AIS feeds...'
                : scanProgress < 60
                ? 'Analyzing vessel patterns...'
                : scanProgress < 90
                ? 'Configuring alerts...'
                : 'Activating monitor...'}
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Enter your email to activate alerts</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="analyst@agency.gov"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowPreferences(!showPreferences)}
              className="text-sm text-blue-400 hover:text-blue-300 mb-3 flex items-center gap-1"
            >
              <Settings className="w-3 h-3" />
              {showPreferences ? 'Hide' : 'Show'} alert preferences
            </button>

            {showPreferences && (
              <div className="space-y-3 mb-4 bg-black/20 rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-2">Alert Threshold</div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() =>
                      setPreferences({ ...preferences, criticalOnly: true, highAndAbove: false, allAlerts: false })
                    }
                    className={`px-3 py-1 rounded text-xs ${
                      preferences.criticalOnly ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'
                    }`}
                  >
                    Critical Only
                  </button>
                  <button
                    onClick={() =>
                      setPreferences({ ...preferences, criticalOnly: false, highAndAbove: true, allAlerts: false })
                    }
                    className={`px-3 py-1 rounded text-xs ${
                      preferences.highAndAbove ? 'bg-orange-600 text-white' : 'bg-gray-700 text-gray-300'
                    }`}
                  >
                    High & Above
                  </button>
                  <button
                    onClick={() =>
                      setPreferences({ ...preferences, criticalOnly: false, highAndAbove: false, allAlerts: true })
                    }
                    className={`px-3 py-1 rounded text-xs ${
                      preferences.allAlerts ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
                    }`}
                  >
                    All Alerts
                  </button>
                </div>

                <div className="text-xs text-gray-400 mt-3 mb-2">Monitored Regions</div>
                <div className="flex flex-wrap gap-2">
                  {REGIONS.map((region) => (
                    <button
                      key={region.id}
                      onClick={() => toggleRegion(region.id)}
                      className={`px-2 py-1 rounded text-xs ${
                        preferences.regions.includes(region.id)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300'
                      }`}
                    >
                      {region.flag} {region.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleSubscribe}
              disabled={!email || !email.includes('@')}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
            >
              <Zap className="w-5 h-5" />
              Activate Scanner
            </button>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs text-gray-500">
              <div className="flex flex-col items-center gap-1">
                <Shield className="w-4 h-4 text-green-500" />
                <span>Secure</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Bell className="w-4 h-4 text-yellow-500" />
                <span>Real-time</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Scan className="w-4 h-4 text-blue-500" />
                <span>24/7 Monitor</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Settings({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
