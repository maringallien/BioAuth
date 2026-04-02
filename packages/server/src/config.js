import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Get env variable or crash. For production use
function requireEnv(key, defaultValue) {
  const value = process.env[key] ?? defaultValue;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getSessionSecret() {
  // If dev set session secret in env, use that
  if (process.env['SESSION_SECRET']) {
    return process.env['SESSION_SECRET'];
  }

  // In production, must have session secret, else crash
  if (process.env['NODE_ENV'] === 'production') {
    throw new Error('SESSION_SECRET environment variable is required in production');
  }

  // Make up random session secret for dev
  return 'dev-' + randomBytes(32).toString('hex');
}

export const config = Object.freeze({
  port: parseInt(process.env['PORT'] ?? '3001', 10),
  rpId: process.env['RP_ID'] ?? 'localhost',
  rpName: process.env['RP_NAME'] ?? 'Biometric Login Showcase',
  rpOrigin: process.env['RP_ORIGIN'] ?? 'https://localhost:5173',
  sessionSecret: getSessionSecret(),
  dbPath: process.env['DB_PATH'] ?? path.join(__dirname, '..', 'data', 'app.sqlite'),
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
});
