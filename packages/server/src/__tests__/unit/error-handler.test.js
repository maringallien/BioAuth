import { jest } from '@jest/globals';
import { z } from 'zod';
import { AppError, errorHandler } from '../../middleware/error-handler.js';

function mockRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

function makeZodError() {
  try {
    z.object({ name: z.string().min(3) }).parse({ name: 'ab' });
  } catch (err) {
    return err;
  }
}

describe('AppError', () => {
  // AppError should behave like a normal Error so catch blocks work as expected
  it('is an instance of Error', () => {
    const err = new AppError(404, 'Not found');
    expect(err).toBeInstanceOf(Error);
  });

  // The statusCode and message we pass in should be readable back off the object
  it('stores statusCode and message', () => {
    const err = new AppError(403, 'Forbidden');
    expect(err.statusCode).toBe(403);
    expect(err.message).toBe('Forbidden');
    expect(err.name).toBe('AppError');
  });
});

describe('errorHandler', () => {
  const req = {};
  const next = jest.fn();
  let res;

  beforeEach(() => {
    res = mockRes();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Zod validation failures should come back as 400 with field-level details
  it('returns 400 with field details for ZodError', () => {
    const zodErr = makeZodError();
    errorHandler(zodErr, req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    const body = res.json.mock.calls[0][0];
    expect(body.error).toBe('Validation failed');
    expect(Array.isArray(body.details)).toBe(true);
    expect(body.details[0]).toHaveProperty('field');
    expect(body.details[0]).toHaveProperty('message');
  });

  // AppErrors should use whatever status code the thrower chose
  it('returns the correct status code for AppError', () => {
    const err = new AppError(422, 'Unprocessable');
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unprocessable' });
  });

  // Unexpected errors should return 500 without leaking internal details to the client
  it('returns 500 for unknown errors without leaking details', () => {
    const err = new Error('internal db crash details');
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    const body = res.json.mock.calls[0][0];
    expect(body.error).toBe('An internal server error occurred.');
    expect(body.error).not.toContain('db crash');
  });

  // Unknown errors should still be logged so we can debug them server-side
  it('logs unknown errors to console.error', () => {
    const err = new Error('boom');
    errorHandler(err, req, res, next);
    expect(console.error).toHaveBeenCalled();
  });

  // Non-Error values thrown (e.g. a plain string) should also produce a safe 500
  it('returns 500 for non-Error thrown values', () => {
    errorHandler('something went wrong', req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
