import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { CredentialList } from './CredentialList.jsx';

export function Dashboard() {
  const { user, credentials, logout, removeCredential, error, clearError } = useAuth();

  if (!user) return null;

  return (
    <div className="card gradient-border p-8 space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-600/20 border border-emerald-500/20 flex items-center justify-center text-3xl">
          🏠
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Dashboard</h2>
        <p className="text-sm text-slate-400 mt-1.5">
          Signed in as{' '}
          <span className="text-indigo-300 font-semibold">{user.username}</span>
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="p-3.5 bg-red-950/40 border border-red-700/50 rounded-xl flex items-start justify-between gap-2 animate-fade-in">
          <div className="flex items-start gap-2.5">
            <span className="text-red-400 mt-0.5 shrink-0">⚠</span>
            <p className="text-sm text-red-300">{error}</p>
          </div>
          <button
            onClick={clearError}
            className="text-red-500 hover:text-red-300 transition-colors text-sm shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {/* Passkeys section */}
      <div className="bg-slate-800/40 rounded-xl border border-slate-700/40 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-sm">🔑</span>
            Registered Passkeys
          </h3>
          <span className="text-xs bg-slate-700/60 text-slate-400 px-2 py-0.5 rounded-full">
            {credentials.length} {credentials.length === 1 ? 'key' : 'keys'}
          </span>
        </div>
        <CredentialList credentials={credentials} onDelete={removeCredential} />
      </div>

      {/* Footer */}
      <div className="pt-1">
        <div className="flex items-center justify-between text-xs text-slate-600 mb-4 px-1">
          <span>Joined {new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
          <span className="font-mono">ID: {user.id.slice(0, 8)}…</span>
        </div>
        <button
          onClick={logout}
          className="w-full py-2.5 px-4 border border-slate-700/60 hover:border-red-700/60 hover:bg-red-950/20 hover:text-red-400 text-slate-400 font-medium rounded-xl transition-all duration-200"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
