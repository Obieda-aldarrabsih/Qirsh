import { describe, it, expect, beforeAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { db } from '../../src/db/index.js';
import bcrypt from 'bcryptjs';

describe('Reports Integration Tests', () => {
  let app: FastifyInstance;
  let token: string;
  let workspaceId: string;
  let groceriesId: string;
  let salaryId: string;

  beforeAll(async () => {
    db.reset();
    app = await buildApp({ enableLogging: false });
    await app.ready();

    const pw = await bcrypt.hash('report123', 10);
    const user = await db.createUser({ email: 'reporter@qirsh.dev', password_hash: pw, name: 'Report Tester' });
    const ws = await db.createWorkspace({
      name: 'Report Workspace',
      currency: 'JOD',
      timezone: 'Asia/Amman',
      created_by: user.id,
    });
    workspaceId = ws.id;

    const categories = await db.listCategories(workspaceId);
    groceriesId = categories.find((c) => c.name === 'Groceries')!.id;
    salaryId = categories.find((c) => c.name === 'Salary')!.id;
    token = app.jwt.sign({ userId: user.id, email: user.email, type: 'access' });

    // Set budget for Groceries: 180 JOD (180,000 fils)
    await db.setBudget(workspaceId, groceriesId, '2026-10-01', 180000n);

    // Add Groceries expenses in October: 152.750 JOD total (matches Fig. 1)
    await db.createTransaction({
      workspace_id: workspaceId,
      category_id: groceriesId,
      kind: 'EXPENSE',
      amount_minor: 92750n,
      currency: 'JOD',
      occurred_on: '2026-10-05',
      note: 'Grocery 1',
      created_by: user.id,
    });
    await db.createTransaction({
      workspace_id: workspaceId,
      category_id: groceriesId,
      kind: 'EXPENSE',
      amount_minor: 60000n,
      currency: 'JOD',
      occurred_on: '2026-10-18',
      note: 'Grocery 2',
      created_by: user.id,
    });

    // Add Salary income: 1,500.000 JOD
    await db.createTransaction({
      workspace_id: workspaceId,
      category_id: salaryId,
      kind: 'INCOME',
      amount_minor: 1500000n,
      currency: 'JOD',
      occurred_on: '2026-10-01',
      note: 'Salary',
      created_by: user.id,
    });
  });

  it('computes budget-vs-actual report matching Fig. 1 specification', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/v1/workspaces/${workspaceId}/reports/budget-vs-actual?month=2026-10`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.month).toBe('2026-10');
    expect(body.currency).toBe('JOD');

    const groceriesItem = body.items.find((i: any) => i.category === 'Groceries');
    expect(groceriesItem).toBeDefined();
    expect(groceriesItem.budgetMinor).toBe('180000');
    expect(groceriesItem.spentMinor).toBe('152750');
    expect(groceriesItem.remainingMinor).toBe('27250');
    expect(groceriesItem.usedPercent).toBe(84.86);
  });

  it('computes monthly summary report with correct net calculation', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/v1/workspaces/${workspaceId}/reports/summary?month=2026-10`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.incomeMinor).toBe('1500000');
    expect(body.expensesMinor).toBe('152750');
    expect(body.netMinor).toBe('1347250'); // 1,500,000 - 152,750
  });

  it('computes spending by category with percentage shares', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/v1/workspaces/${workspaceId}/reports/by-category?from=2026-10-01&to=2026-10-31`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.totalExpensesMinor).toBe('152750');
    expect(body.items.length).toBeGreaterThan(0);
    expect(body.items[0].sharePercent).toBe(100);
  });

  it('generates 12-month trend report', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/v1/workspaces/${workspaceId}/reports/trend?months=6&toMonth=2026-10`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.series.length).toBe(6);
    expect(body.series[5].month).toBe('2026-10');
    expect(body.series[5].expensesMinor).toBe('152750');
  });
});
