import { jest } from '@jest/globals';
import Database from 'better-sqlite3';

// Create in-memory database with the real schema
const inMemoryDb = new Database(':memory:');
inMemoryDb.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Mock schema.js to return the in-memory database
jest.unstable_mockModule('../../../db/schema.js', () => ({ db: inMemoryDb }));

const { createUser, findUserById, findUserByUsername } =
  await import('../../../db/repositories/user.repository.js');

beforeEach(() => {
  inMemoryDb.exec('DELETE FROM users');
});

describe('createUser', () => {
  // A freshly created user should come back with an id, username, and timestamp
  it('inserts a user and returns a frozen object with id and username', () => {
    const user = createUser('alice');
    expect(user.id).toBeDefined();
    expect(user.username).toBe('alice');
    expect(user.createdAt).toBeDefined();
    expect(Object.isFrozen(user)).toBe(true);
  });

  // Two different users should never get the same id
  it('generates a unique id for each user', () => {
    const a = createUser('alice');
    const b = createUser('bob');
    expect(a.id).not.toBe(b.id);
  });

  // The user should actually land in the database, not just be returned in memory
  it('persists the user to the database', () => {
    const user = createUser('alice');
    const row = inMemoryDb.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
    expect(row).not.toBeNull();
    expect(row.username).toBe('alice');
  });
});

describe('findUserById', () => {
  // Looking up a user that exists should return a frozen object with the right data
  it('returns the user for a valid id', () => {
    const created = createUser('alice');
    const found = findUserById(created.id);
    expect(found.id).toBe(created.id);
    expect(found.username).toBe('alice');
    expect(Object.isFrozen(found)).toBe(true);
  });

  // A made-up id that's not in the database should return null, not throw
  it('returns null for an unknown id', () => {
    expect(findUserById('nonexistent')).toBeNull();
  });
});

describe('findUserByUsername', () => {
  // Looking up by username should work the same as by id
  it('returns the user for a valid username', () => {
    createUser('alice');
    const found = findUserByUsername('alice');
    expect(found.username).toBe('alice');
    expect(Object.isFrozen(found)).toBe(true);
  });

  // A username that was never registered should return null
  it('returns null for an unknown username', () => {
    expect(findUserByUsername('nobody')).toBeNull();
  });
});
