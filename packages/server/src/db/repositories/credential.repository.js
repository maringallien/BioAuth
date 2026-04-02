import { db } from '../schema.js';

// Convert database credential row to immutable object
function rowToCredential(row) {
  return Object.freeze({
    id: row.id,
    userId: row.user_id,
    publicKey: new Uint8Array(row.public_key),
    counter: row.counter,
    deviceType: row.device_type,
    backedUp: row.backed_up === 1,
    transports: JSON.parse(row.transports),
    createdAt: row.created_at,
  });
}

export function saveCredential(input) {
  const stmt = db.prepare(`
    INSERT INTO credentials (id, user_id, public_key, counter, device_type, backed_up, transports)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    input.id,
    input.userId,
    Buffer.from(input.publicKey),
    input.counter,
    input.deviceType,
    input.backedUp ? 1 : 0,
    JSON.stringify(input.transports)
  );
}

export function findCredentialById(id) {
  const stmt = db.prepare('SELECT * FROM credentials WHERE id = ?');
  const row = stmt.get(id);
  return row ? rowToCredential(row) : null;
}

export function findCredentialsByUserId(userId) {
  const stmt = db.prepare('SELECT * FROM credentials WHERE user_id = ? ORDER BY created_at ASC');
  const rows = stmt.all(userId);
  return rows.map(rowToCredential);
}

export function updateCredentialCounter(id, newCounter) {
  const stmt = db.prepare('UPDATE credentials SET counter = ? WHERE id = ?');
  stmt.run(newCounter, id);
}

export function deleteCredential(id) {
  const stmt = db.prepare('DELETE FROM credentials WHERE id = ?');
  stmt.run(id);
}
