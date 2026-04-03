import { jest } from '@jest/globals';
import Database from 'better-sqlite3';

const inMemoryDb = new Database(':memory:');
inMemoryDb.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS credentials (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    public_key BLOB NOT NULL,
    counter INTEGER NOT NULL DEFAULT 0,
    device_type TEXT NOT NULL DEFAULT 'singleDevice',
    backed_up INTEGER NOT NULL DEFAULT 0,
    transports TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);
inMemoryDb.pragma('foreign_keys = ON');

jest.unstable_mockModule('../../../db/schema.js', () => ({ db: inMemoryDb }));

const { saveCredential, findCredentialById, findCredentialsByUserId, updateCredentialCounter, deleteCredential } =
  await import('../../../db/repositories/credential.repository.js');

const USER_ID = 'user-1';
const CRED_INPUT = {
  id: 'cred-1',
  userId: USER_ID,
  publicKey: new Uint8Array([1, 2, 3, 4]),
  counter: 0,
  deviceType: 'platform',
  backedUp: false,
  transports: ['internal', 'hybrid'],
};

beforeAll(() => {
  inMemoryDb.exec(`INSERT INTO users (id, username) VALUES ('user-1', 'alice')`);
});

beforeEach(() => {
  inMemoryDb.exec('DELETE FROM credentials');
});

describe('saveCredential', () => {
  // Inserting a new credential should not throw and the row should appear in the DB
  it('inserts a credential without errors', () => {
    expect(() => saveCredential(CRED_INPUT)).not.toThrow();
    const row = inMemoryDb.prepare('SELECT * FROM credentials WHERE id = ?').get('cred-1');
    expect(row).not.toBeNull();
  });

  // The boolean backedUp:true should be stored as integer 1 in SQLite
  it('stores backedUp as 1 when true', () => {
    saveCredential({ ...CRED_INPUT, id: 'cred-backed', backedUp: true });
    const row = inMemoryDb.prepare('SELECT backed_up FROM credentials WHERE id = ?').get('cred-backed');
    expect(row.backed_up).toBe(1);
  });

  // The boolean backedUp:false should be stored as integer 0 in SQLite
  it('stores backedUp as 0 when false', () => {
    saveCredential(CRED_INPUT);
    const row = inMemoryDb.prepare('SELECT backed_up FROM credentials WHERE id = ?').get('cred-1');
    expect(row.backed_up).toBe(0);
  });
});

describe('findCredentialById', () => {
  // Reading back a saved credential should give us all the right fields as the correct JS types
  it('returns a frozen credential with correct fields', () => {
    saveCredential(CRED_INPUT);
    const cred = findCredentialById('cred-1');
    expect(cred).not.toBeNull();
    expect(cred.id).toBe('cred-1');
    expect(cred.userId).toBe(USER_ID);
    expect(cred.publicKey).toBeInstanceOf(Uint8Array);
    expect(cred.backedUp).toBe(false);
    expect(cred.transports).toEqual(['internal', 'hybrid']);
    expect(Object.isFrozen(cred)).toBe(true);
  });

  // Looking up a credential ID that doesn't exist should return null, not throw
  it('returns null for unknown credential id', () => {
    expect(findCredentialById('nonexistent')).toBeNull();
  });

  // The SQLite integer 1 should come back as the JavaScript boolean true
  it('correctly converts backedUp integer to boolean', () => {
    saveCredential({ ...CRED_INPUT, id: 'cred-backed', backedUp: true });
    const cred = findCredentialById('cred-backed');
    expect(cred.backedUp).toBe(true);
  });
});

describe('findCredentialsByUserId', () => {
  // A user with two credentials should get both back
  it('returns all credentials for a user ordered by created_at', () => {
    saveCredential(CRED_INPUT);
    saveCredential({ ...CRED_INPUT, id: 'cred-2', transports: [] });
    const creds = findCredentialsByUserId(USER_ID);
    expect(creds).toHaveLength(2);
    expect(creds[0].id).toBe('cred-1');
  });

  // A user who has never registered any passkeys should get an empty array, not null
  it('returns empty array when user has no credentials', () => {
    expect(findCredentialsByUserId('user-without-creds')).toEqual([]);
  });
});

describe('updateCredentialCounter', () => {
  // After a successful auth the counter in the DB should reflect the new value
  it('updates the counter value', () => {
    saveCredential(CRED_INPUT);
    updateCredentialCounter('cred-1', 42);
    const cred = findCredentialById('cred-1');
    expect(cred.counter).toBe(42);
  });
});

describe('deleteCredential', () => {
  // After deletion the credential should be gone from the database entirely
  it('removes the credential from the database', () => {
    saveCredential(CRED_INPUT);
    expect(findCredentialById('cred-1')).not.toBeNull();
    deleteCredential('cred-1');
    expect(findCredentialById('cred-1')).toBeNull();
  });
});
