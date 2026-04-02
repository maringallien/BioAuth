import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { StatusIndicator } from './StatusIndicator.jsx';
import { FlowDiagram } from './FlowDiagram.jsx';

export function LoginForm({ onSwitchToRegister }) {
  const { login, step, error, clearError } = useAuth();
  const [username, setUsername] = useState('');

  const isLoading = step === 'requesting' || step === 'authenticating' || step === 'verifying';

  async function handleSubmit(e) {
    e.preventDefault();
    clearError();
    await login(username.trim());
  }

  return (
    <div className="card gradient-border p-8">
      <div className="text-center mb-7">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-600/20 border border-indigo-500/20 flex items-center justify-center text-3xl">
          🔓
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Welcome back</h2>
        <p className="text-sm text-slate-400 mt-1.5">
          Sign in instantly with your biometric passkey
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="login-username" className="block text-sm font-medium text-slate-300 mb-1.5">
            Username
          </label>
          <input
            id="login-username"
            type="text"
            autoComplete="username webauthn"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isLoading}
            placeholder="Enter your username"
            className="input-field"
          />
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
              <span>🔑</span>
              Login with Biometric
            </>
          )}
        </button>

        {step !== 'idle' && (
          <div className="flex justify-center pt-1">
            <StatusIndicator step={step} />
          </div>
        )}

        <FlowDiagram step={step} mode="login" />
      </form>

      <div className="mt-7 pt-5 border-t border-slate-800/60 text-center">
        <p className="text-sm text-slate-500">
          Don&apos;t have an account?{' '}
          <button
            onClick={onSwitchToRegister}
            className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
          >
            Create one
          </button>
        </p>
      </div>
    </div>
  );
}
