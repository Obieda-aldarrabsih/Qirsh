import { describe, it, expect, beforeAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { db } from '../../src/db/index.js';
import bcrypt from 'bcryptjs';

describe('CSV Imports and Exports Integration Tests', () => {
  let app: FastifyInstance;
  let token: string;
  let workspaceId: string;

  beforeAll(async () => {
    db.reset();
    app = await buildApp({ enableLogging: false });
    await app.ready();

    const pw = await bcrypt.hash('impexp123', 10);
    const user = await db.createUser({ email: 'impexp@qirsh.dev', password_hash: pw, name: 'ImpExp Tester' });
    const ws = await db.createWorkspace({
      name: 'ImpExp Workspace',
      currency: 'JOD',
      timezone: 'Asia/Amman',
      created_by: user.id,
    });
    workspaceId = ws.id;
    token = app.jwt.sign({ userId: user.id, email: user.email, type: 'access' });
  });

  it('imports valid CSV rows and reports line-level errors for invalid rows', async () => {
    const csvContent = [
      'occurredOn,category,amount,kind,note',
      '2026-10-05,Groceries,25.500,EXPENSE,Carrefour milk', // Valid
      'invalid-date,Rent,450.000,EXPENSE,Bad date', // Invalid line 3
      '2026-10-06,Transport,5.2505,EXPENSE,Too many decimals', // Invalid line 4 (4 decimals in JOD)
      '2026-10-07,Dining Out,12.000,EXPENSE,Shawarma lunch', // Valid line 5
    ].join('\n');

    const res = await app.inject({
      method: 'POST',
      url: `/v1/workspaces/${workspaceId}/imports`,
      headers: { authorization: `Bearer ${token}` },
      payload: { csvData: csvContent },
    });

    expect(res.statusCode).toBe(202);
    const body = JSON.parse(res.payload);
    expect(body.totalRows).toBe(4);
    expect(body.inserted).toBe(2);
    expect(body.failed).toBe(2);
    expect(body.errors.length).toBe(2);
    expect(body.errors[0].line).toBe(3);
    expect(body.errors[1].line).toBe(4);
    expect(body.errors[1].error).toContain('exceeds maximum allowed precision');
  });

  it('exports transactions with formula injection protection (escapes =, +, -, @)', async () => {
    // Add transaction with malicious spreadsheet formula note: =cmd|' /C calc'!A0
    const cat = (await db.listCategories(workspaceId))[0];
    await db.createTransaction({
      workspace_id: workspaceId,
      category_id: cat.id,
      kind: 'EXPENSE',
      amount_minor: 1000n,
      currency: 'JOD',
      occurred_on: '2026-10-18',
      note: "=SUM(1, 2); @evil; +5; -10",
      created_by: 'some-user',
    });

    const res = await app.inject({
      method: 'GET',
      url: `/v1/workspaces/${workspaceId}/exports/transactions.csv`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    // Note must be prefixed with a single quote ' to prevent execution in Excel/Sheets
    expect(res.payload).toContain("\"'=SUM(1, 2); @evil; +5; -10\"");
  });
});
