import { describe, it, expect, beforeAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { db } from '../../src/db/index.js';
import bcrypt from 'bcryptjs';

describe('Concurrency & Idempotency Tests', () => {
  let app: FastifyInstance;
  let token: string;
  let workspaceId: string;
  let categoryId: string;

  beforeAll(async () => {
    db.reset();
    app = await buildApp({ enableLogging: false });
    await app.ready();

    const pw = await bcrypt.hash('concurr123', 10);
    const user = await db.createUser({ email: 'concurrency@qirsh.dev', password_hash: pw, name: 'Concurrency Tester' });
    const ws = await db.createWorkspace({
      name: 'Concurrency Workspace',
      currency: 'JOD',
      timezone: 'Asia/Amman',
      created_by: user.id,
    });
    workspaceId = ws.id;

    const categories = await db.listCategories(workspaceId);
    categoryId = categories[0].id;
    token = app.jwt.sign({ userId: user.id, email: user.email, type: 'access' });
  });

  it('handles lost updates: two PATCHes with initial ETag result in one 200 and one 412', async () => {
    // 1. Create a transaction
    const createRes = await app.inject({
      method: 'POST',
      url: `/v1/workspaces/${workspaceId}/transactions`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        amountMinor: 10000,
        currency: 'JOD',
        categoryId,
        occurredOn: '2026-10-18',
        note: 'Original note',
      },
    });

    const tx = JSON.parse(createRes.payload);
    expect(createRes.headers.etag).toBe('"v1"');

    // 2. First client sends PATCH with If-Match: "v1"
    const patch1 = await app.inject({
      method: 'PATCH',
      url: `/v1/workspaces/${workspaceId}/transactions/${tx.id}`,
      headers: {
        authorization: `Bearer ${token}`,
        'if-match': '"v1"',
      },
      payload: { note: 'Client 1 update' },
    });
    expect(patch1.statusCode).toBe(200);
    expect(patch1.headers.etag).toBe('"v2"');

    // 3. Second client was holding the stale "v1" ETag and tries to PATCH -> 412 Precondition Failed!
    const patch2 = await app.inject({
      method: 'PATCH',
      url: `/v1/workspaces/${workspaceId}/transactions/${tx.id}`,
      headers: {
        authorization: `Bearer ${token}`,
        'if-match': '"v1"', // Stale version!
      },
      payload: { note: 'Client 2 conflicting update' },
    });

    expect(patch2.statusCode).toBe(412);
    const errorBody = JSON.parse(patch2.payload);
    expect(errorBody.code).toBe('PRECONDITION_FAILED');
  });

  it('guarantees duplicate-free import with Idempotency-Key header', async () => {
    const idempotencyKey = 'idem-key-import-test-12345';
    const csvContent = `occurredOn,category,amount,kind,note\n2026-10-10,Groceries,25.500,EXPENSE,Bulk import 1\n2026-10-11,Transport,5.000,EXPENSE,Bulk import 2`;

    // First request
    const res1 = await app.inject({
      method: 'POST',
      url: `/v1/workspaces/${workspaceId}/imports`,
      headers: {
        authorization: `Bearer ${token}`,
        'idempotency-key': idempotencyKey,
      },
      payload: { csvData: csvContent },
    });
    expect(res1.statusCode).toBe(202);
    const body1 = JSON.parse(res1.payload);
    expect(body1.inserted).toBe(2);

    // Replay same request with same key
    const res2 = await app.inject({
      method: 'POST',
      url: `/v1/workspaces/${workspaceId}/imports`,
      headers: {
        authorization: `Bearer ${token}`,
        'idempotency-key': idempotencyKey,
      },
      payload: { csvData: csvContent },
    });
    expect(res2.statusCode).toBe(202);
    const body2 = JSON.parse(res2.payload);
    expect(body2.id).toBe(body1.id);
    expect(body2.inserted).toBe(2);

    // Try sending DIFFERENT payload with same idempotency key -> 422 IDEMPOTENCY_KEY_REUSED
    const resMismatch = await app.inject({
      method: 'POST',
      url: `/v1/workspaces/${workspaceId}/imports`,
      headers: {
        authorization: `Bearer ${token}`,
        'idempotency-key': idempotencyKey,
      },
      payload: { csvData: 'occurredOn,category,amount,kind,note\n2026-10-12,Groceries,99.000,EXPENSE,Modified' },
    });
    expect(resMismatch.statusCode).toBe(422);
    const mismatchBody = JSON.parse(resMismatch.payload);
    expect(mismatchBody.code).toBe('IDEMPOTENCY_KEY_REUSED');
  });
});
