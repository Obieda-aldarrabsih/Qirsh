import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { db } from '../../db/index.js';
import { AppProblemError } from '../../lib/problem.js';
import { parseAmount, formatAmount } from '../../lib/money.js';
import { decodeCursor } from '../../lib/cursor.js';
import { getTodayInTimezone } from '../../lib/months.js';
import { Transaction } from '../../db/types.js';

function formatTxResponse(tx: Transaction) {
  const { amount_minor, ...rest } = tx;
  return {
    ...rest,
    amountMinor: tx.amount_minor.toString(),
    amountFormatted: formatAmount(tx.amount_minor, tx.currency),
  };
}

export const transactionRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // List transactions with cursor pagination & filters
  app.get(
    '/',
    {
      preHandler: [app.requireWorkspaceRole(['owner', 'member', 'viewer'], 'transactions:read')],
      schema: {
        tags: ['Transactions'],
        summary: 'List transactions with cursor pagination and filters',
        querystring: {
          type: 'object',
          properties: {
            cursor: { type: 'string' },
            limit: { type: 'integer', default: 50, minimum: 1, maximum: 100 },
            from: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
            to: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
            categoryId: { type: 'string' },
            kind: { type: 'string', enum: ['EXPENSE', 'INCOME'] },
            minAmount: { type: 'string' },
            maxAmount: { type: 'string' },
            q: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { wid } = request.params as any;
      const query = request.query as any;

      const cursorPayload = query.cursor ? decodeCursor(query.cursor) : null;
      const limit = query.limit ? parseInt(query.limit, 10) : 50;

      const result = await db.listTransactions({
        workspaceId: wid,
        from: query.from,
        to: query.to,
        categoryId: query.categoryId,
        kind: query.kind,
        minAmount: query.minAmount !== undefined ? BigInt(query.minAmount) : undefined,
        maxAmount: query.maxAmount !== undefined ? BigInt(query.maxAmount) : undefined,
        q: query.q,
        cursor: cursorPayload,
        limit,
      });

      const formattedData = result.data.map(formatTxResponse);

      return reply.send({
        data: formattedData,
        nextCursor: result.nextCursor,
      });
    }
  );

  // Create transaction
  app.post(
    '/',
    {
      preHandler: [app.requireWorkspaceRole(['owner', 'member'], 'transactions:write')],
      schema: {
        tags: ['Transactions'],
        summary: 'Record a new transaction',
        body: {
          type: 'object',
          required: ['amountMinor', 'currency', 'categoryId', 'occurredOn'],
          properties: {
            amountMinor: { type: ['integer', 'string'] },
            currency: { type: 'string', minLength: 3, maxLength: 3 },
            categoryId: { type: 'string' },
            occurredOn: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
            kind: { type: 'string', enum: ['EXPENSE', 'INCOME'], default: 'EXPENSE' },
            note: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { wid } = request.params as any;
      const body = request.body as any;

      const ws = await db.findWorkspaceById(wid);
      if (!ws) {
        throw new AppProblemError(404, 'WORKSPACE_NOT_FOUND', 'Workspace not found.');
      }

      // Business Rule 1: Currency must equal the workspace currency
      const currency = body.currency.toUpperCase();
      if (currency !== ws.currency) {
        throw new AppProblemError(
          422,
          'CURRENCY_MISMATCH',
          `Workspace uses ${ws.currency}; got ${currency}.`,
          'Currency does not match workspace'
        );
      }

      // Business Rule 2: Category must belong to the workspace
      const category = await db.findCategoryById(body.categoryId, wid);
      if (!category) {
        throw new AppProblemError(
          422,
          'INVALID_CATEGORY',
          `Category '${body.categoryId}' does not belong to this workspace.`
        );
      }

      // Business Rule 3: Date not more than 1 day in the future in workspace timezone
      const today = getTodayInTimezone(ws.timezone);
      const todayDate = new Date(`${today}T00:00:00Z`);
      const tomorrowDate = new Date(todayDate.getTime() + 24 * 3600 * 1000);
      const maxAllowedDate = tomorrowDate.toISOString().substring(0, 10);

      if (body.occurredOn > maxAllowedDate) {
        throw new AppProblemError(
          422,
          'DATE_TOO_FAR_IN_FUTURE',
          `Transaction date '${body.occurredOn}' cannot be more than 1 day in the future (max allowed: ${maxAllowedDate}).`
        );
      }

      // Validate & parse amount into minor units
      const minor = parseAmount(body.amountMinor, currency);

      const tx = await db.createTransaction({
        workspace_id: wid,
        category_id: body.categoryId,
        kind: body.kind || 'EXPENSE',
        amount_minor: minor,
        currency,
        occurred_on: body.occurredOn,
        note: body.note ? body.note.trim() : null,
        created_by: request.user.userId,
      });

      await db.logAudit({
        workspace_id: wid,
        actor: request.user.userId,
        action: 'CREATE',
        entity: 'transaction',
        entity_id: tx.id,
        diff: { amount_minor: minor.toString(), currency, occurred_on: tx.occurred_on },
      });

      const location = `/v1/workspaces/${wid}/transactions/${tx.id}`;
      return reply
        .code(201)
        .header('Location', location)
        .header('ETag', `"v${tx.version}"`)
        .send(formatTxResponse(tx));
    }
  );

  // Get transaction by ID
  app.get(
    '/:id',
    {
      preHandler: [app.requireWorkspaceRole(['owner', 'member', 'viewer'], 'transactions:read')],
      schema: {
        tags: ['Transactions'],
        summary: 'Get transaction details',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { wid, id } = request.params as any;
      const tx = await db.getTransactionById(id, wid);
      if (!tx) {
        throw new AppProblemError(404, 'TRANSACTION_NOT_FOUND', 'Transaction not found.');
      }

      return reply
        .header('ETag', `"v${tx.version}"`)
        .send(formatTxResponse(tx));
    }
  );

  // Update transaction (with ETag / If-Match concurrency check)
  app.patch(
    '/:id',
    {
      preHandler: [app.requireWorkspaceRole(['owner', 'member'], 'transactions:write')],
      schema: {
        tags: ['Transactions'],
        summary: 'Update a transaction with optimistic concurrency control (If-Match)',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            amountMinor: { type: ['integer', 'string'] },
            categoryId: { type: 'string' },
            note: { type: 'string' },
            occurredOn: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          },
        },
      },
    },
    async (request, reply) => {
      const { wid, id } = request.params as any;
      const body = request.body as any;

      // Extract expected version from If-Match header if present
      const ifMatchHeader = request.headers['if-match'];
      let expectedVersion: number | null = null;
      if (ifMatchHeader) {
        const cleaned = ifMatchHeader.replace(/["v]/g, '').trim();
        const ver = parseInt(cleaned, 10);
        if (!isNaN(ver)) {
          expectedVersion = ver;
        }
      }

      const updates: any = {};
      if (body.note !== undefined) updates.note = body.note ? body.note.trim() : null;
      if (body.occurredOn !== undefined) updates.occurred_on = body.occurredOn;
      if (body.categoryId !== undefined) {
        const cat = await db.findCategoryById(body.categoryId, wid);
        if (!cat) throw new AppProblemError(422, 'INVALID_CATEGORY', 'Category not found in workspace.');
        updates.category_id = body.categoryId;
      }
      if (body.amountMinor !== undefined) {
        const existingTx = await db.getTransactionById(id, wid);
        if (!existingTx) throw new AppProblemError(404, 'TRANSACTION_NOT_FOUND', 'Transaction not found.');
        updates.amount_minor = parseAmount(body.amountMinor, existingTx.currency);
      }

      const result = await db.updateTransaction(id, wid, expectedVersion, updates);

      if (result.versionMismatch) {
        throw new AppProblemError(
          412,
          'PRECONDITION_FAILED',
          'Resource version has changed since last fetched. Please refetch and reapply your update.',
          'Precondition Failed'
        );
      }

      if (!result.transaction) {
        throw new AppProblemError(404, 'TRANSACTION_NOT_FOUND', 'Transaction not found.');
      }

      const tx = result.transaction;
      return reply
        .header('ETag', `"v${tx.version}"`)
        .send(formatTxResponse(tx));
    }
  );

  // Soft delete transaction
  app.delete(
    '/:id',
    {
      preHandler: [app.requireWorkspaceRole(['owner', 'member'], 'transactions:write')],
      schema: {
        tags: ['Transactions'],
        summary: 'Soft-delete a transaction',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { wid, id } = request.params as any;
      const success = await db.softDeleteTransaction(id, wid);
      if (!success) {
        throw new AppProblemError(404, 'TRANSACTION_NOT_FOUND', 'Transaction not found.');
      }
      return reply.code(204).send();
    }
  );
};
