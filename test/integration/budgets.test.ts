import { describe, it, expect, beforeAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { db } from '../../src/db/index.js';
import bcrypt from 'bcryptjs';

describe('Budgets Integration Tests', () => {
  let app: FastifyInstance;
  let token: string;
  let workspaceId: string;
  let categoryId: string;

  beforeAll(async () => {
    db.reset();
    app = await buildApp({ enableLogging: false });
    await app.ready();

    const pw = await bcrypt.hash('budget123', 10);
    const user = await db.createUser({ email: 'budget@qirsh.dev', password_hash: pw, name: 'Budget Tester' });
    const ws = await db.createWorkspace({
      name: 'Budget Workspace',
      currency: 'JOD',
      timezone: 'Asia/Amman',
      created_by: user.id,
    });
    workspaceId = ws.id;

    const categories = await db.listCategories(workspaceId);
    categoryId = categories[0].id;
    token = app.jwt.sign({ userId: user.id, email: user.email, type: 'access' });
  });

  it('sets and retrieves monthly category budgets', async () => {
    const putRes = await app.inject({
      method: 'PUT',
      url: `/v1/workspaces/${workspaceId}/budgets/2026-10`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        budgets: [{ categoryId, limitMinor: '180.000' }],
      },
    });

    expect(putRes.statusCode).toBe(200);
    const putBody = JSON.parse(putRes.payload);
    expect(putBody.data[0].limitMinor).toBe('180000');

    // Retrieve
    const getRes = await app.inject({
      method: 'GET',
      url: `/v1/workspaces/${workspaceId}/budgets/2026-10`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(getRes.statusCode).toBe(200);
    const getBody = JSON.parse(getRes.payload);
    expect(getBody.data.length).toBe(1);
    expect(getBody.data[0].limitMinor).toBe('180000');
  });

  it('copies previous month budgets into next month', async () => {
    const copyRes = await app.inject({
      method: 'POST',
      url: `/v1/workspaces/${workspaceId}/budgets/2026-11/copy-from/2026-10`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(copyRes.statusCode).toBe(200);
    const copyBody = JSON.parse(copyRes.payload);
    expect(copyBody.data.length).toBe(1);
    expect(copyBody.data[0].month).toBe('2026-11');
    expect(copyBody.data[0].limitMinor).toBe('180000');
  });
});
