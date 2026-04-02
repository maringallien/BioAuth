import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { StatusIndicator } from './StatusIndicator.jsx';
import { FlowDiagram } from './FlowDiagram.jsx';

export function RegisterForm({ onSwitchToLogin }) {
  const { register, step, error, clearError } = useAuth();    
  const [username, setUsername] = useState('');               
  const [validationError, setValidationError] = useState('');

  // Disable form while any of those steps in progress
  const isLoading = step === 'requesting' || step === 'authenticating' || step === 'verifying';

  // Input validation
  function validateUsername(value) {
    if (value.length < 3) return 'Username must be at least 3 characters';
    if (value.length > 64) return 'Username must be at most 64 characters';
    if (!/^[a-zA-Z0-9_]+$/.test(value)) return 'Only letters, numbers, and underscores';
    return '';
  }

  async function handleSubmit(e) {
    e.preventDefault();
    
    // Validate username before sending
    const err = validateUsername(username.trim());
    if (err) {
      setValidationError(err);
      return;
    }
    
    setValidationError('');
    clearError();
    await register(username.trim());
  }

  return (
    <div className="card gradient-border p-8">
      <div className="text-center mb-7">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-600/20 border border-violet-500/20 flex items-center justify-center text-3xl">
          🔐
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Create account</h2>
        <p className="text-sm text-slate-400 mt-1.5">
          Register a passkey — no password needed
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="reg-username" className="block text-sm font-medium text-slate-300 mb-1.5">
            Username
          </label>
          <input
            id="reg-username"
            type="text"
            autoComplete="username webauthn"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isLoading}
            placeholder="e.g. alice_demo"
            className="input-field"
          />
          {validationError && (
            <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
              <span>⚠</span> {validationError}
            </p>
          )}
        </div>

        {(error || step === 'error') && (
          <div className="p-3.5 bg-red-950/40 border border-red-700/50 rounded-xl flex items-start gap-2.5 animate-fade-in">
            <span className="text-red-400 mt-0.5 shrink-0">⚠</span>
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !username.trim()}
          className="btn-primary mt-2"
        >
          {isLoading ? (
            <>
              <span className="spinner" />
              Processing…
            </>
          ) : (
            <>
              <span>👆</span>
              Register with Biometric
            </>
          )}
        </button>

        {step !== 'idle' && (
          <div className="flex justify-center pt-1">
            <StatusIndicator step={step} />
          </div>
        )}

        <FlowDiagram step={step} mode="register" />
      </form>

      <div className="mt-7 pt-5 border-t border-slate-800/60 text-center">
        <p className="text-sm text-slate-500">
          Already have an account?{' '}
          <button
            onClick={onSwitchToLogin}
            className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
