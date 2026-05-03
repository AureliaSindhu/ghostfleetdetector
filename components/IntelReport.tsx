'use client';

import { useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { ScoredDarkPeriod } from '@/types';

interface IntelReportProps {
  darkPeriod: ScoredDarkPeriod;
  weatherData?: unknown;
  sanctionsData?: unknown;
  stormData?: unknown;
}

export function IntelReport({ darkPeriod, weatherData, sanctionsData, stormData }: IntelReportProps) {
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ darkPeriod, weatherData, sanctionsData, stormData }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setReport(data.report);
    } catch (err) {
      setError('Failed to generate report. Check ANTHROPIC_API_KEY.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 mt-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-white">
          <FileText className="w-5 h-5" />
          Intelligence Report
        </h3>
        <button
          onClick={generateReport}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm flex items-center gap-2 disabled:opacity-50 transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : '🤖'}
          {loading ? 'Generating...' : 'Generate Report'}
        </button>
      </div>

      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}

      {report && (
        <div className="bg-gray-900 rounded p-4 text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
          {report}
        </div>
      )}
    </div>
  );
}
