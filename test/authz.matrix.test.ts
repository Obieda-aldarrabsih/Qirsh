import { describe, it, expect, beforeAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { db } from '../src/db/index.js';
import bcrypt from 'bcryptjs';

describe('HEADLINE TEST · Authorization Matrix (Route × Role)', () => {
  let app: FastifyInstance;
  let workspaceId: string;
  let categoryId: string;
  let transactionId: string;

  let ownerToken: string;
  let memberToken: string;
  let viewerToken: string;
  let strangerToken: string;
  let validApiKey: string;
  let noScopeApiKey: string;

  beforeAll(async () => {
    db.reset();
    app = await buildApp({ enableLogging: false });
    await app.ready();

    const pw = await bcrypt.hash('matrix123', 10);

    // Create 4 users: Owner, Member, Viewer, Stranger
    const owner = await db.createUser({ email: 'owner@matrix.test', password_hash: pw, name: 'Owner' });
    const member = await db.createUser({ email: 'member@matrix.test', password_hash: pw, name: 'Member' });
    const viewer = await db.createUser({ email: 'viewer@matrix.test', password_hash: pw, name: 'Viewer' });
    const stranger = await db.createUser({ email: 'stranger@matrix.test', password_hash: pw, name: 'Stranger' });

    // Create Workspace
    const ws = await db.createWorkspace({
      name: 'Matrix Test Workspace',
      currency: 'JOD',
      timezone: 'Asia/Amman',
      created_by: owner.id,
    });
    workspaceId = ws.id;

    // Memberships
    await db.addMembership({ workspace_id: workspaceId, user_id: member.id, role: 'member' });
    await db.addMembership({ workspace_id: workspaceId, user_id: viewer.id, role: 'viewer' });
    // Note: stranger has NO membership in workspaceId!

    // Default category & sample transaction
    const categories = await db.listCategories(workspaceId);
    categoryId = categories[0].id;

    const tx = await db.createTransaction({
      workspace_id: workspaceId,
      category_id: categoryId,
      kind: 'EXPENSE',
      amount_minor: 10000n,
      currency: 'JOD',
      occurred_on: '2026-10-18',
      note: 'Seed matrix tx',
      created_by: owner.id,
    });
    transactionId = tx.id;

    // Tokens
    ownerToken = app.jwt.sign({ userId: owner.id, email: owner.email, type: 'access' });
    memberToken = app.jwt.sign({ userId: member.id, email: member.email, type: 'access' });
    viewerToken = app.jwt.sign({ userId: viewer.id, email: viewer.email, type: 'access' });
    strangerToken = app.jwt.sign({ userId: stranger.id, email: stranger.email, type: 'access' });

    // Scoped API Key (has transactions:read and transactions:write)
    const crypto = await import('crypto');
    const fullValidKey = 'qirsh_live_valid1234567890abcdef1234';
    const validPrefix = fullValidKey.substring(0, 19);
    const validHash = crypto.createHash('sha256').update(fullValidKey).digest('hex');
    await db.createApiKey({
      workspace_id: workspaceId,
      name: 'Valid Key',
      prefix: validPrefix,
      key_hash: validHash,
      scopes: ['transactions:read', 'transactions:write', 'reports:read'],
      last_used_at: null,
      revoked_at: null,
    });
    validApiKey = fullValidKey;

    // No Scope API Key
    const fullNoScopeKey = 'qirsh_live_noscope1234567890abcdef12';
    const noScopePrefix = fullNoScopeKey.substring(0, 19);
    const noScopeHash = crypto.createHash('sha256').update(fullNoScopeKey).digest('hex');
    await db.createApiKey({
      workspace_id: workspaceId,
      name: 'No Scope Key',
      prefix: noScopePrefix,
      key_hash: noScopeHash,
      scopes: ['reports:read'], // Lacks transactions:write
      last_used_at: null,
      revoked_at: null,
    });
    noScopeApiKey = fullNoScopeKey;
  });

  interface TestCase {
    name: string;
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
    getPath: () => string;
    getBody?: () => any;
    expected: {
      owner: number;
      member: number;
      viewer: number;
      stranger: number; // Must be 404 for tenant isolation!
      validApiKey?: number;
      noScopeApiKey?: number;
    };
  }

  const testMatrix: TestCase[] = [
    {
      name: 'Read Workspace details',
      method: 'GET',
      getPath: () => `/v1/workspaces/${workspaceId}`,
      expected: { owner: 200, member: 200, viewer: 200, stranger: 404 },
    },
    {
      name: 'Create Workspace Invite (Owner only)',
      method: 'POST',
      getPath: () => `/v1/workspaces/${workspaceId}/invites`,
      getBody: () => ({ role: 'member' }),
      expected: { owner: 201, member: 403, viewer: 403, stranger: 404 },
    },
    {
      name: 'List Categories',
      method: 'GET',
      getPath: () => `/v1/workspaces/${workspaceId}/categories`,
      expected: { owner: 200, member: 200, viewer: 200, stranger: 404 },
    },
    {
      name: 'Create Category',
      method: 'POST',
      getPath: () => `/v1/workspaces/${workspaceId}/categories`,
      getBody: () => ({ name: `Cat_${Math.random()}`, kind: 'EXPENSE' }),
      expected: { owner: 201, member: 201, viewer: 403, stranger: 404 },
    },
    {
      name: 'List Transactions',
      method: 'GET',
      getPath: () => `/v1/workspaces/${workspaceId}/transactions`,
      expected: {
        owner: 200,
        member: 200,
        viewer: 200,
        stranger: 404,
        validApiKey: 200,
        noScopeApiKey: 403,
      },
    },
    {
      name: 'Create Transaction',
      method: 'POST',
      getPath: () => `/v1/workspaces/${workspaceId}/transactions`,
      getBody: () => ({
        amountMinor: 25000,
        currency: 'JOD',
        categoryId,
        occurredOn: '2026-10-18',
      }),
      expected: {
        owner: 201,
        member: 201,
        viewer: 403,
        stranger: 404,
        validApiKey: 201,
        noScopeApiKey: 403,
      },
    },
    {
      name: 'Read Single Transaction',
      method: 'GET',
      getPath: () => `/v1/workspaces/${workspaceId}/transactions/${transactionId}`,
      expected: { owner: 200, member: 200, viewer: 200, stranger: 404 },
    },
    {
      name: 'Update Transaction (PATCH)',
      method: 'PATCH',
      getPath: () => `/v1/workspaces/${workspaceId}/transactions/${transactionId}`,
      getBody: () => ({ note: 'Updated note' }),
      expected: { owner: 200, member: 200, viewer: 403, stranger: 404 },
    },
    {
      name: 'Get Monthly Budget',
      method: 'GET',
      getPath: () => `/v1/workspaces/${workspaceId}/budgets/2026-10`,
      expected: { owner: 200, member: 200, viewer: 200, stranger: 404 },
    },
    {
      name: 'Set Monthly Budget',
      method: 'PUT',
      getPath: () => `/v1/workspaces/${workspaceId}/budgets/2026-10`,
      getBody: () => ({ budgets: [{ categoryId, limitMinor: 100000 }] }),
      expected: { owner: 200, member: 200, viewer: 403, stranger: 404 },
    },
    {
      name: 'View Budget vs Actual Report',
      method: 'GET',
      getPath: () => `/v1/workspaces/${workspaceId}/reports/budget-vs-actual?month=2026-10`,
      expected: {
        owner: 200,
        member: 200,
        viewer: 200,
        stranger: 404,
        validApiKey: 200,
        noScopeApiKey: 200,
      },
    },
    {
      name: 'Manage API Keys (Owner only)',
      method: 'GET',
      getPath: () => `/v1/workspaces/${workspaceId}/api-keys`,
      expected: { owner: 200, member: 403, viewer: 403, stranger: 404 },
    },
  ];

  for (const tc of testMatrix) {
    it(`Matrix Route: ${tc.method} ${tc.name}`, async () => {
      // 1. Test Owner
      const resOwner = await app.inject({
        method: tc.method,
        url: tc.getPath(),
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: tc.getBody?.(),
      });
      expect(resOwner.statusCode, `Owner failed for ${tc.name}`).toBe(tc.expected.owner);

      // 2. Test Member
      const resMember = await app.inject({
        method: tc.method,
        url: tc.getPath(),
        headers: { authorization: `Bearer ${memberToken}` },
        payload: tc.getBody?.(),
      });
      expect(resMember.statusCode, `Member failed for ${tc.name}`).toBe(tc.expected.member);

      // 3. Test Viewer
      const resViewer = await app.inject({
        method: tc.method,
        url: tc.getPath(),
        headers: { authorization: `Bearer ${viewerToken}` },
        payload: tc.getBody?.(),
      });
      expect(resViewer.statusCode, `Viewer failed for ${tc.name}`).toBe(tc.expected.viewer);

      // 4. Test Stranger (Must receive 404 for tenant isolation, never 403 or 200!)
      const resStranger = await app.inject({
        method: tc.method,
        url: tc.getPath(),
        headers: { authorization: `Bearer ${strangerToken}` },
        payload: tc.getBody?.(),
      });
      expect(resStranger.statusCode, `Stranger failed for ${tc.name}`).toBe(tc.expected.stranger);

      // 5. Test Scoped API Key (if defined)
      if (tc.expected.validApiKey !== undefined) {
        const resKey = await app.inject({
          method: tc.method,
          url: tc.getPath(),
          headers: { authorization: `Bearer ${validApiKey}` },
          payload: tc.getBody?.(),
        });
        expect(resKey.statusCode, `Valid API Key failed for ${tc.name}`).toBe(tc.expected.validApiKey);
      }

      // 6. Test Unscoped API Key (if defined)
      if (tc.expected.noScopeApiKey !== undefined) {
        const resNoScope = await app.inject({
          method: tc.method,
          url: tc.getPath(),
          headers: { authorization: `Bearer ${noScopeApiKey}` },
          payload: tc.getBody?.(),
        });
        expect(resNoScope.statusCode, `No-scope API Key failed for ${tc.name}`).toBe(tc.expected.noScopeApiKey);
      }
    });
  }
});
