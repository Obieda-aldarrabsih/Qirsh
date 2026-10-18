import { describe, it, expect } from 'vitest';
import { encodeCursor, decodeCursor } from '../../src/lib/cursor.js';

describe('Cursor pagination unit tests', () => {
  it('encodes and decodes (occurred_on, id) accurately', () => {
    const occurredOn = '2026-10-18';
    const id = '123e4567-e89b-12d3-a456-426614174000';

    const cursor = encodeCursor(occurredOn, id);
    expect(typeof cursor).toBe('string');
    expect(cursor).not.toContain(' ');

    const decoded = decodeCursor(cursor);
    expect(decoded).toEqual({ occurredOn, id });
  });

  it('returns null on invalid or corrupted cursor', () => {
    expect(decodeCursor('invalid-base64!@#$')).toBeNull();
    expect(decodeCursor(Buffer.from('not json').toString('base64url'))).toBeNull();
    expect(decodeCursor(Buffer.from(JSON.stringify({ a: 1 })).toString('base64url'))).toBeNull();
  });
});
