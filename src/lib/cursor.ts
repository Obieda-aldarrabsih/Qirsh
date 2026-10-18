/**
 * Stable cursor pagination based on (occurred_on, id).
 * Encodes and decodes URL-safe base64 cursors.
 */

export interface CursorPayload {
  occurredOn: string;
  id: string;
}

export function encodeCursor(occurredOn: string, id: string): string {
  const json = JSON.stringify({ occurredOn, id });
  return Buffer.from(json, 'utf8').toString('base64url');
}

export function decodeCursor(cursorString: string): CursorPayload | null {
  try {
    const raw = Buffer.from(cursorString, 'base64url').toString('utf8');
    const parsed = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof parsed.occurredOn === 'string' &&
      typeof parsed.id === 'string'
    ) {
      return {
        occurredOn: parsed.occurredOn,
        id: parsed.id,
      };
    }
    return null;
  } catch {
    return null;
  }
}
