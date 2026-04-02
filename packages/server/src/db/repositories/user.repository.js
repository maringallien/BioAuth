import { randomUUID } from 'node:crypto';
import { db } from '../schema.js';

// Convert database user row to immutable object
function rowToUser(row) {
  return Object.freeze({
    id: row.id,
    username: row.username,
    createdAt: row.created_at,
  });
}

export function createUser(username) {
  const id = randomUUID();
  const stmt = db.prepare(
    'INSERT INTO users (id, username) VALUES (?, ?)'
  );
  stmt.run(id, username);
  return Object.freeze({ id, username, createdAt: new Date().toISOString() });
}

export function findUserById(id) {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  const row = stmt.get(id);
  return row ? rowToUser(row) : null;
}

export function findUserByUsername(username) {
  const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
  const row = stmt.get(username);
  return row ? rowToUser(row) : null;
}
