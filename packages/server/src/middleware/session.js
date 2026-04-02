import session from 'express-session';
import connectSqlite3 from 'connect-sqlite3';
import path from 'node:path';
import { config } from '../config.js';
import { ensureDir } from '../utils/fs.js';

// Create class to store session data in SQLite
const SQLiteStore = connectSqlite3(session);

// Ensure /data directory exists
const sessionDir = path.dirname(config.dbPath);
ensureDir(path.join(sessionDir, 'sessions.sqlite'));

// Init instance
const store = new SQLiteStore({
  db: 'sessions.sqlite',
  dir: sessionDir,
});

store.on('error', (err) => {
  console.error('[session store] SQLite error:', err);
});

// Configuration for middleware function
export const sessionMiddleware = session({
  store,
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  // Rules for session cookie
  cookie: {
    httpOnly: true,
    secure: config.nodeEnv !== 'development' ? true : false,
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
});
