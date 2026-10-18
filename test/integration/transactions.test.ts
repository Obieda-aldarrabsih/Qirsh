import { describe, it, expect, beforeAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { db } from '../../src/db/index.js';
import bcrypt from 'bcryptjs';

describe('Transactions Integration Tests', () => {
  let app: FastifyInstance;
  let token: string;
  let workspaceId: string;
  let categoryId: string;

  beforeAll(async () => {
    db.reset();
    app = await buildApp({ enableLogging: false });
    await app.ready();

    const pw = await bcrypt.hash('pass123', 10);
    const user = await db.createUser({ email: 'tx_tester@qirsh.dev', password_hash: pw, name: 'Tx Tester' });
    const ws = await db.createWorkspace({
      name: 'Tx Test Workspace',
      currency: 'JOD',
      timezone: 'Asia/Amman',
      created_by: user.id,
    });
    workspaceId = ws.id;

    const categories = await db.listCategories(workspaceId);
    categoryId = categories[0].id;
    token = app.jwt.sign({ userId: user.id, email: user.email, type: 'access' });
  });

  it('creates transaction with Location header and ETag', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/v1/workspaces/${workspaceId}/transactions`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        amountMinor: '15.250',
        currency: 'JOD',
        categoryId,
        occurredOn: '2026-10-18',
        note: 'Supermarket shopping',
      },
    });

    expect(res.statusCode).toBe(201);
    expect(res.headers.location).toMatch(new RegExp(`^/v1/workspaces/${workspaceId}/transactions/`));
    expect(res.headers.etag).toBe('"v1"');

    const body = JSON.parse(res.payload);
    expect(body.amountMinor).toBe('15250');
    expect(body.amountFormatted).toBe('15.250');
    expect(body.currency).toBe('JOD');
  });

  it('rejects currency mismatch with 422 CURRENCY_MISMATCH', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/v1/workspaces/${workspaceId}/transactions`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        amountMinor: 5000,
        currency: 'USD', // Workspace is JOD!
        categoryId,
        occurredOn: '2026-10-18',
      },
    });

    expect(res.statusCode).toBe(422);
    const body = JSON.parse(res.payload);
    expect(body.code).toBe('CURRENCY_MISMATCH');
    expect(body.detail).toContain('Workspace uses JOD; got USD');
  });

  it('rejects decimal precision exceeding exponent without silent rounding', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/v1/workspaces/${workspaceId}/transactions`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        amountMinor: '15.2505', // 4 decimals in JOD (max 3 allowed)
        currency: 'JOD',
        categoryId,
        occurredOn: '2026-10-18',
      },
    });

    expect(res.statusCode).toBe(422);
    const body = JSON.parse(res.payload);
    expect(body.code).toBe('INVALID_AMOUNT_PRECISION');
  });

  it('rejects date more than 1 day in future', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/v1/workspaces/${workspaceId}/transactions`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        amountMinor: 10000,
        currency: 'JOD',
        categoryId,
        occurredOn: '2099-01-01',
      },
    });

    expect(res.statusCode).toBe(422);
    const body = JSON.parse(res.payload);
    expect(body.code).toBe('DATE_TOO_FAR_IN_FUTURE');
  });

  it('performs cursor pagination accurately', async () => {
    // Insert 5 transactions on sequential dates
    for (let i = 1; i <= 5; i++) {
      await app.inject({
        method: 'POST',
        url: `/v1/workspaces/${workspaceId}/transactions`,
        headers: { authorization: `Bearer ${token}` },
        payload: {
          amountMinor: i * 1000,
          currency: 'JOD',
          categoryId,
          occurredOn: `2026-10-0${i}`,
          note: `Tx #${i}`,
        },
      });
    }

    // Fetch page 1 with limit 2
    const page1Res = await app.inject({
      method: 'GET',
      url: `/v1/workspaces/${workspaceId}/transactions?limit=2`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(page1Res.statusCode).toBe(200);
    const page1 = JSON.parse(page1Res.payload);
    expect(page1.data.length).toBe(2);
    expect(page1.nextCursor).toBeDefined();

    // Fetch page 2 with nextCursor
    const page2Res = await app.inject({
      method: 'GET',
      url: `/v1/workspaces/${workspaceId}/transactions?limit=2&cursor=${page1.nextCursor}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(page2Res.statusCode).toBe(200);
    const page2 = JSON.parse(page2Res.payload);
    expect(page2.data.length).toBe(2);
    // Elements on page 2 must be strictly distinct from page 1
    const p1Ids = page1.data.map((d: any) => d.id);
    const p2Ids = page2.data.map((d: any) => d.id);
    expect(p1Ids.some((id: string) => p2Ids.includes(id))).toBe(false);
  });

  it('supports soft-delete', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: `/v1/workspaces/${workspaceId}/transactions`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        amountMinor: 5000,
        currency: 'JOD',
        categoryId,
        occurredOn: '2026-10-18',
        note: 'To delete',
      },
    });
    const txId = JSON.parse(createRes.payload).id;

    // Delete
    const delRes = await app.inject({
      method: 'DELETE',
      url: `/v1/workspaces/${workspaceId}/transactions/${txId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(delRes.statusCode).toBe(204);

    // Get deleted tx -> 404
    const getRes = await app.inject({
      method: 'GET',
      url: `/v1/workspaces/${workspaceId}/transactions/${txId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(getRes.statusCode).toBe(404);
  });
});
