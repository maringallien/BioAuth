import React from 'react';

export function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-md sticky top-0 z-10 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-lg shadow-lg shadow-indigo-500/20">
            🔑
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">Biometric Login</h1>
            <p className="text-xs text-slate-500">Powered by WebAuthn + passkeys</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
            <span className="text-xs text-slate-500">Secure</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md animate-slide-up">{children}</div>
      </main>

      <footer className="border-t border-slate-800/60 px-6 py-4 text-center">
        <p className="text-xs text-slate-600">
          WebAuthn showcase — passkeys · fingerprints · Face ID · Windows Hello
        </p>
      </footer>
    </div>
  );
}
