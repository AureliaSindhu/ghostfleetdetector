'use client';

import { useState } from 'react';
import { FileText, Loader2, Mail, Check } from 'lucide-react';
import { ScoredDarkPeriod } from '@/types';
import { MarkdownContent } from './MarkdownContent';

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
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [email, setEmail] = useState('');

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
      setError('Failed to generate report. Check OPENAI_API_KEY.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const sendEmail = async () => {
    if (!email || !report) return;
    setEmailLoading(true);
    setEmailError(null);
    try {
      const response = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          subject: `Intelligence Report: Vessel ${darkPeriod.mmsi}`,
          report,
          vesselData: darkPeriod,
        }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setEmailSent(true);
      setShowEmailInput(false);
      setTimeout(() => setEmailSent(false), 3000);
    } catch (err) {
      setEmailError('Failed to send email. Check RESEND_API_KEY.');
      console.error(err);
    } finally {
      setEmailLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 mt-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-white">
          <FileText className="w-5 h-5" />
          Intelligence Report
        </h3>
        <div className="flex items-center gap-2">
          {report && (
            <button
              onClick={() => setShowEmailInput(!showEmailInput)}
              disabled={emailLoading}
              className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm flex items-center gap-2 disabled:opacity-50 transition-colors"
            >
              {emailSent ? <Check className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
              {emailSent ? 'Sent!' : 'Email Report'}
            </button>
          )}
          <button
            onClick={generateReport}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm flex items-center gap-2 disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : '🤖'}
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
      </div>

      {showEmailInput && (
        <div className="mb-4 flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email address"
            className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
          />
          <button
            onClick={sendEmail}
            disabled={emailLoading || !email}
            className="bg-cyan-600 hover:bg-cyan-700 px-4 py-2 rounded text-sm disabled:opacity-50 transition-colors"
          >
            {emailLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send'}
          </button>
        </div>
      )}

      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}

      {emailError && (
        <p className="text-red-400 text-sm">{emailError}</p>
      )}

      {report && (
        <div className="bg-gray-900 rounded p-4 text-sm text-gray-200 leading-relaxed">
          <MarkdownContent content={report} variant="report" />
        </div>
      )}
    </div>
  );
}
