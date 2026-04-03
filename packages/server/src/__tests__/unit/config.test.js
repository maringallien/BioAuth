import { config } from '../../config.js';

describe('config', () => {
  // Nobody should be able to accidentally mutate the config at runtime
  it('is a frozen object', () => {
    expect(Object.isFrozen(config)).toBe(true);
  });

  // All the keys we rely on elsewhere in the app must be present
  it('has all required keys', () => {
    expect(config).toHaveProperty('port');
    expect(config).toHaveProperty('rpId');
    expect(config).toHaveProperty('rpName');
    expect(config).toHaveProperty('rpOrigin');
    expect(config).toHaveProperty('sessionSecret');
    expect(config).toHaveProperty('dbPath');
    expect(config).toHaveProperty('nodeEnv');
  });

  // The port should be usable as a number, not accidentally left as a string
  it('port is a number', () => {
    expect(typeof config.port).toBe('number');
  });

  // Without an RP_ID env var the server should default to localhost
  it('uses default rpId of localhost when RP_ID is not set', () => {
    if (!process.env['RP_ID']) {
      expect(config.rpId).toBe('localhost');
    }
  });

  // Without an RP_ORIGIN env var the server should default to the Vite dev origin
  it('uses default rpOrigin when RP_ORIGIN is not set', () => {
    if (!process.env['RP_ORIGIN']) {
      expect(config.rpOrigin).toBe('https://localhost:5173');
    }
  });

  // The session secret must always be a real string — empty would break signing
  it('sessionSecret is a non-empty string', () => {
    expect(typeof config.sessionSecret).toBe('string');
    expect(config.sessionSecret.length).toBeGreaterThan(0);
  });

  // The database path must always resolve to something so SQLite can open it
  it('dbPath is a non-empty string', () => {
    expect(typeof config.dbPath).toBe('string');
    expect(config.dbPath.length).toBeGreaterThan(0);
  });
});
