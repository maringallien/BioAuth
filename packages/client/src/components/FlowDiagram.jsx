import React from 'react';

const REGISTER_STEPS = [
  { id: '1', label: 'Client requests options',  activeOn: ['requesting'] },
  { id: '2', label: 'Server sends challenge',   activeOn: ['requesting'] },
  { id: '3', label: 'Browser prompts biometric', activeOn: ['authenticating'] },
  { id: '4', label: 'Client sends attestation', activeOn: ['verifying'] },
  { id: '5', label: 'Server verifies & stores', activeOn: ['verifying', 'success'] },
];

const LOGIN_STEPS = [
  { id: '1', label: 'Client requests challenge', activeOn: ['requesting'] },
  { id: '2', label: 'Server sends challenge',    activeOn: ['requesting'] },
  { id: '3', label: 'Browser prompts biometric', activeOn: ['authenticating'] },
  { id: '4', label: 'Client sends assertion',    activeOn: ['verifying'] },
  { id: '5', label: 'Server verifies signature', activeOn: ['verifying', 'success'] },
];

export function FlowDiagram({ step, mode }) {
  const steps = mode === 'register' ? REGISTER_STEPS : LOGIN_STEPS;

  if (step === 'idle' || step === 'error') return null;

  const activeSteps = ['requesting', 'authenticating', 'verifying'];
  const currentIdx = steps.findIndex((s) => s.activeOn.includes(step));

  return (
    <div className="mt-3 p-4 bg-slate-800/30 rounded-xl border border-slate-700/40 animate-fade-in">
      <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-widest">
        WebAuthn Flow
      </p>
      <ol className="space-y-2">
        {steps.map((s, idx) => {
          const isActive = s.activeOn.includes(step);
          const isDone =
            step === 'success' ||
            (activeSteps.includes(step) && idx < currentIdx);

          return (
            <li key={s.id} className="flex items-center gap-3">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 transition-all duration-300 ${
                  isDone
                    ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                    : isActive
                    ? 'bg-indigo-500/25 border border-indigo-400/50 text-indigo-300'
                    : 'bg-slate-800/60 border border-slate-700/40 text-slate-600'
                }`}
              >
                {isDone ? '✓' : idx + 1}
              </div>
              <span
                className={`text-xs transition-colors duration-300 ${
                  isDone ? 'text-emerald-400/80' : isActive ? 'text-indigo-300 font-medium' : 'text-slate-600'
                }`}
              >
                {s.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
