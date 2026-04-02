import React from 'react';

const TRANSPORT_LABELS = {
  usb:      { icon: '🔌', label: 'USB' },
  nfc:      { icon: '📡', label: 'NFC' },
  ble:      { icon: '📶', label: 'BLE' },
  internal: { icon: '💻', label: 'Built-in' },
  hybrid:   { icon: '📱', label: 'Phone' },
};

function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export function CredentialList({ credentials, onDelete }) {
  if (credentials.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-slate-600">No passkeys registered yet.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {credentials.map((cred) => (
        <li
          key={cred.id}
          className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/40 hover:border-slate-600/60 transition-colors"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-slate-400 truncate max-w-[160px]">
                {cred.id.slice(0, 16)}…
              </span>
              {cred.backedUp && (
                <span className="text-xs bg-emerald-900/40 text-emerald-400 border border-emerald-700/40 px-1.5 py-0.5 rounded-full">
                  synced
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span className="capitalize">{cred.deviceType}</span>
              <span className="text-slate-700">·</span>
              {cred.transports.map((t) => {
                const info = TRANSPORT_LABELS[t];
                return (
                  <span key={t} title={info?.label ?? t} className="text-sm leading-none">
                    {info?.icon ?? t}
                  </span>
                );
              })}
              <span className="text-slate-700">·</span>
              <span>{formatDate(cred.createdAt)}</span>
            </div>
          </div>
          {credentials.length > 1 && (
            <button
              onClick={() => onDelete(cred.id)}
              className="ml-3 w-7 h-7 flex items-center justify-center rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-950/30 transition-all text-xs shrink-0"
              title="Remove passkey"
            >
              ✕
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
