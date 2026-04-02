import React from 'react';

// Maps step value to appearance
const STEP_CONFIG = {
  idle:           { icon: '🔑', label: 'Ready',                   color: 'text-slate-400', bg: 'bg-slate-800/60' },
  requesting:     { icon: null, label: 'Requesting options…',      color: 'text-indigo-300', bg: 'bg-indigo-950/40', spinning: true },
  authenticating: { icon: '👆', label: 'Waiting for biometric…',  color: 'text-amber-300',  bg: 'bg-amber-950/30' },
  verifying:      { icon: null, label: 'Verifying with server…',   color: 'text-indigo-300', bg: 'bg-indigo-950/40', spinning: true },
  success:        { icon: '✓',  label: 'Success!',                 color: 'text-emerald-300', bg: 'bg-emerald-950/30' },
  error:          { icon: '✕',  label: 'Failed',                   color: 'text-red-300',    bg: 'bg-red-950/30' },
};

export function StatusIndicator({ step }) {
  const config = STEP_CONFIG[step] ?? STEP_CONFIG.idle;
  const { icon, label, color, bg, spinning } = config;

  return (
    <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/5 text-sm font-medium ${color} ${bg} animate-fade-in`}>
      {spinning ? (
        <span className="spinner" style={{ width: 14, height: 14 }} />
      ) : (
        <span className="text-base leading-none">{icon}</span>
      )}
      <span>{label}</span>
    </div>
  );
}
