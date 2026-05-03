'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, ChevronUp, Loader2, AlertTriangle, Ship, MapPin, Clock } from 'lucide-react';
import { ScoredDarkPeriod } from '@/types';

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
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
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

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 p-4 rounded-full shadow-lg transition-all hover:scale-105"
        style={{ boxShadow: '0 0 20px rgba(0, 212, 255, 0.4)' }}
      >
        <MessageSquare className="w-6 h-6 text-white" />
      </button>
    );
  }

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 bg-[#0a1628] border border-cyan-500/30 rounded-lg shadow-2xl transition-all ${
        isMinimized ? 'w-72' : 'w-96'
      }`}
      style={{ boxShadow: '0 0 40px rgba(0, 212, 255, 0.2)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-cyan-500/20 bg-[#0d1f35]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_6px_#00d4ff] animate-pulse" />
          <span className="font-mono text-cyan-300 text-sm tracking-wider">AI ANALYST</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 text-cyan-400/60 hover:text-cyan-300 transition-colors"
          >
            <ChevronUp className={`w-4 h-4 transition-transform ${isMinimized ? 'rotate-180' : ''}`} />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 text-cyan-400/60 hover:text-cyan-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="h-80 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-cyan-500/10 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-cyan-400" />
                </div>
                <p className="text-cyan-300/70 text-sm font-mono mb-4">
                  ASK ME ABOUT THE DATA
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {PRESET_QUESTIONS.map((preset, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(preset.query)}
                      className="flex items-center gap-1.5 bg-[#1e3a5f] border border-cyan-500/30 hover:border-cyan-400/50 px-3 py-1.5 rounded text-xs font-mono text-cyan-300 transition-all"
                    >
                      {preset.icon}
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg p-3 text-sm ${
                    msg.role === 'user'
                      ? 'bg-cyan-600/30 border border-cyan-500/40 text-cyan-100'
                      : 'bg-[#132743] border border-cyan-500/20 text-cyan-200'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  <div className="text-[10px] text-cyan-500/50 mt-1 font-mono">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-[#132743] border border-cyan-500/20 rounded-lg p-3 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                  <span className="text-cyan-300/70 text-sm font-mono">ANALYZING...</span>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-300 text-sm">
                {error}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Preset buttons when there are messages */}
          {messages.length > 0 && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5">
              {PRESET_QUESTIONS.slice(0, 2).map((preset, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(preset.query)}
                  disabled={isLoading}
                  className="flex items-center gap-1 bg-[#1e3a5f]/50 border border-cyan-500/20 hover:border-cyan-400/40 px-2 py-1 rounded text-[10px] font-mono text-cyan-400/70 transition-all disabled:opacity-50"
                >
                  {preset.icon}
                  {preset.label}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-cyan-500/20">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about the data..."
                disabled={isLoading}
                className="flex-1 bg-[#132743] border border-cyan-500/30 rounded px-3 py-2 text-sm text-cyan-100 placeholder-cyan-500/40 font-mono focus:border-cyan-400 focus:outline-none disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="bg-cyan-600/50 hover:bg-cyan-500/50 border border-cyan-500/50 p-2 rounded text-cyan-300 transition-all disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
