'use client';

import { X, Settings, Sliders } from 'lucide-react';
import { ScoringConfig, ScoringFactors } from './ScoringConfig';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  scoringFactors: ScoringFactors;
  onScoringChange: (factors: ScoringFactors) => void;
}

export function SettingsModal({ isOpen, onClose, scoringFactors, onScoringChange }: SettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#0a1628]/90 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[#0d1f35] border border-cyan-500/30 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden" style={{ boxShadow: '0 0 60px rgba(0, 212, 255, 0.2)' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-cyan-500/20 bg-[#0a1628]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-cyan-500/20 flex items-center justify-center">
              <Settings className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-sans font-semibold text-cyan-100 tracking-wide">SETTINGS</h2>
              <p className="text-[10px] font-sans text-cyan-500/50">CONFIGURE DETECTION PARAMETERS</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-cyan-400/60 hover:text-cyan-300 hover:bg-cyan-500/10 rounded transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Scoring Configuration Section */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-sans text-cyan-300 tracking-wider">SCORING CONFIGURATION</span>
            </div>
            <ScoringConfig factors={scoringFactors} onChange={onScoringChange} />
          </div>

          {/* Future settings sections can go here */}
          {/*
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-sans text-cyan-300 tracking-wider">NOTIFICATIONS</span>
            </div>
          </div>
          */}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-cyan-500/20 bg-[#0a1628]">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-cyan-600/30 hover:bg-cyan-500/40 border border-cyan-500/50 rounded font-sans text-sm text-cyan-300 transition-all"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}

// Settings button component to use in header
export function SettingsButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-2 bg-[#1e3a5f]/50 hover:bg-[#2d5a87]/50 border border-cyan-500/30 hover:border-cyan-400/50 rounded-lg text-cyan-400/70 hover:text-cyan-300 transition-all"
      title="Settings"
    >
      <Settings className="w-5 h-5" />
    </button>
  );
}
