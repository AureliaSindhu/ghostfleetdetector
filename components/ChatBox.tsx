'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Loader2, AlertTriangle, Ship, MapPin, Clock } from 'lucide-react';
import { ScoredDarkPeriod } from '@/types';
import { MarkdownContent } from './MarkdownContent';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatBoxProps {
  darkPeriods: ScoredDarkPeriod[];
}

const PRESET_QUESTIONS = [
  {
    icon: <AlertTriangle className="w-3 h-3" />,
    label: 'Suspicious ships?',
    query: 'Are there any suspicious ships right now? List the most critical threats.',
  },
  {
    icon: <Ship className="w-3 h-3" />,
    label: 'Summary',
    query: 'Give me a brief summary of the current maritime surveillance data.',
  },
  {
    icon: <MapPin className="w-3 h-3" />,
    label: 'Hot zones',
    query: 'What are the most active geographic zones with dark period activity?',
  },
  {
    icon: <Clock className="w-3 h-3" />,
    label: 'Long gaps',
    query: 'Which vessels have the longest dark periods? Should I be concerned?',
  },
];

export function ChatBox({ darkPeriods }: ChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Generate context from dark periods data
  const generateContext = () => {
    const critical = darkPeriods.filter((dp) => dp.riskLevel === 'CRITICAL');
    const high = darkPeriods.filter((dp) => dp.riskLevel === 'HIGH');
    const medium = darkPeriods.filter((dp) => dp.riskLevel === 'MEDIUM');
    const low = darkPeriods.filter((dp) => dp.riskLevel === 'LOW');

    const avgGapHours = darkPeriods.length > 0
      ? (darkPeriods.reduce((sum, dp) => sum + dp.gapHours, 0) / darkPeriods.length).toFixed(1)
      : 0;

    const topThreats = critical.slice(0, 5).map((dp) => ({
      mmsi: dp.mmsi,
      score: dp.suspicionScore,
      gapHours: dp.gapHours,
      reasons: dp.reasons.slice(0, 2),
    }));

    return `
Total dark periods detected: ${darkPeriods.length}
Risk breakdown:
- CRITICAL: ${critical.length} vessels
- HIGH: ${high.length} vessels
- MEDIUM: ${medium.length} vessels
- LOW: ${low.length} vessels

Average dark period duration: ${avgGapHours} hours

Top threats (CRITICAL):
${topThreats.map((t) => `- MMSI ${t.mmsi}: Score ${t.score}, Dark for ${t.gapHours}h. Reasons: ${t.reasons.join(', ')}`).join('\n')}
`;
  };

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          context: generateContext(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.reply,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-slate-700 bg-slate-950/35">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700/80 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.75)]" />
          <span className="font-sans text-xs font-semibold tracking-[0.14em] text-cyan-100">AI ANALYST</span>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-slate-500">{darkPeriods.length} contacts</span>
      </div>

      {/* Messages */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex h-full min-h-[340px] flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-cyan-400/10">
              <MessageSquare className="h-7 w-7 text-cyan-300" />
            </div>
            <p className="mb-5 font-sans text-sm uppercase tracking-[0.12em] text-cyan-200/80">
              Ask me about the data
            </p>
            <div className="grid w-full grid-cols-2 gap-2">
              {PRESET_QUESTIONS.map((preset, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(preset.query)}
                  className="flex min-h-10 items-center justify-center gap-2 rounded border border-cyan-400/30 bg-cyan-400/10 px-2 py-2 text-xs font-sans text-cyan-100 transition hover:bg-cyan-400/15"
                >
                  {preset.icon}
                  <span className="truncate">{preset.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-md border p-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'border-cyan-400/35 bg-cyan-400/15 text-cyan-50'
                    : 'border-slate-700 bg-slate-900/80 text-slate-200'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <MarkdownContent content={msg.content} variant="chat" />
                ) : (
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                )}
                <div className="mt-2 font-sans text-[10px] text-slate-500">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900/80 p-3">
                <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />
                <span className="font-sans text-sm text-slate-300">Analyzing...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-md border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Preset buttons when there are messages */}
      {messages.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t border-slate-700/80 px-3 py-2">
          {PRESET_QUESTIONS.slice(0, 2).map((preset, i) => (
            <button
              key={i}
              onClick={() => sendMessage(preset.query)}
              disabled={isLoading}
              className="flex items-center gap-1 rounded border border-cyan-400/20 bg-cyan-400/5 px-2 py-1 text-[10px] font-sans text-cyan-200 transition hover:bg-cyan-400/10 disabled:opacity-50"
            >
              {preset.icon}
              {preset.label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-slate-700/80 p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about the data..."
            disabled={isLoading}
            className="min-w-0 flex-1 rounded border border-slate-600 bg-slate-950 px-3 py-2 font-sans text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-400 focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-cyan-400/30 bg-cyan-400/10 text-cyan-200 transition hover:bg-cyan-400/15 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
