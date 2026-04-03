import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { ensureDir } from '../../utils/fs.js';

let tmpRoot;

beforeEach(() => {
  tmpRoot = path.join(os.tmpdir(), 'bioauth-test-' + randomUUID());
  fs.mkdirSync(tmpRoot, { recursive: true });
});

afterEach(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

describe('ensureDir', () => {
  // If the directory doesn't exist yet, calling ensureDir should create it
  it('creates a directory that does not exist', () => {
    const filePath = path.join(tmpRoot, 'newdir', 'file.txt');
    const dir = path.dirname(filePath);
    expect(fs.existsSync(dir)).toBe(false);
    ensureDir(filePath);
    expect(fs.existsSync(dir)).toBe(true);
  });

  // Calling ensureDir when the directory already exists should do nothing and not throw
  it('is a no-op when the directory already exists', () => {
    const dir = path.join(tmpRoot, 'existing');
    fs.mkdirSync(dir);
    const filePath = path.join(dir, 'file.txt');
    expect(() => ensureDir(filePath)).not.toThrow();
    expect(fs.existsSync(dir)).toBe(true);
  });

  // Deep nested paths like a/b/c/file.txt should all be created in one call
  it('creates nested directories recursively', () => {
    const filePath = path.join(tmpRoot, 'a', 'b', 'c', 'file.txt');
    ensureDir(filePath);
    expect(fs.existsSync(path.dirname(filePath))).toBe(true);
  });
});
