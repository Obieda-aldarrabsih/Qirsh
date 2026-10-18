import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { db } from '../../db/index.js';
import { parseAmount } from '../../lib/money.js';
import { getTodayInTimezone } from '../../lib/months.js';
import { AppProblemError } from '../../lib/problem.js';

export const recurringRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // Create recurring rule
  app.post(
    '/',
    {
      preHandler: [app.requireWorkspaceRole(['owner', 'member'], 'recurring:write')],
      schema: {
        tags: ['Recurring'],
        summary: 'Create a recurring expense rule',
        body: {
          type: 'object',
          required: ['frequency', 'day', 'template'],
          properties: {
            frequency: { type: 'string', enum: ['MONTHLY', 'WEEKLY'] },
            day: { type: 'integer', minimum: 1, maximum: 31 },
            template: {
              type: 'object',
              required: ['categoryId', 'amountMinor'],
              properties: {
                categoryId: { type: 'string' },
                kind: { type: 'string', enum: ['EXPENSE', 'INCOME'], default: 'EXPENSE' },
                amountMinor: { type: ['integer', 'string'] },
                note: { type: 'string' },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { wid } = request.params as any;
      const body = request.body as any;

      const ws = await db.findWorkspaceById(wid);
      if (!ws) throw new AppProblemError(404, 'WORKSPACE_NOT_FOUND', 'Workspace not found.');

      const cat = await db.findCategoryById(body.template.categoryId, wid);
      if (!cat) throw new AppProblemError(422, 'INVALID_CATEGORY', 'Category not found in workspace.');

      const minor = parseAmount(body.template.amountMinor, ws.currency);

      const rule = await db.createRecurringRule({
        workspace_id: wid,
        frequency: body.frequency,
        day: body.day,
        template: {
          category_id: body.template.categoryId,
          kind: body.template.kind || 'EXPENSE',
          amount_minor: minor.toString(),
          currency: ws.currency,
          note: body.template.note,
        },
        next_run_on: getTodayInTimezone(ws.timezone),
        active: true,
      });

      return reply.code(201).send(rule);
    }
  );

  // List recurring rules
  app.get(
    '/',
    {
      preHandler: [app.requireWorkspaceRole(['owner', 'member', 'viewer'], 'recurring:read')],
      schema: {
        tags: ['Recurring'],
        summary: 'List recurring rules in a workspace',
      },
    },
    async (request, reply) => {
      const { wid } = request.params as any;
      const list = await db.listRecurringRules(wid);
      return reply.send({ data: list });
    }
  );

  // Trigger recurring execution (idempotent run)
  app.post(
    '/run',
    {
      preHandler: [app.requireWorkspaceRole(['owner', 'member'], 'recurring:write')],
      schema: {
        tags: ['Recurring'],
        summary: 'Run recurring rules for a given date (guaranteed duplicate-free)',
        body: {
          type: 'object',
          properties: {
            targetDate: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          },
        },
      },
    },
    async (request, reply) => {
      const { wid } = request.params as any;
      const body = request.body as any;

      const ws = await db.findWorkspaceById(wid);
      if (!ws) throw new AppProblemError(404, 'WORKSPACE_NOT_FOUND', 'Workspace not found.');

      const targetDate = body?.targetDate || getTodayInTimezone(ws.timezone);
      const targetDay = parseInt(targetDate.split('-')[2], 10);

      const rules = await db.listRecurringRules(wid);
      const generatedTransactions = [];

      for (const rule of rules) {
        if (!rule.active) continue;

        // Check if day matches
        const matchesDay = rule.frequency === 'MONTHLY' ? rule.day === targetDay : true;
        if (!matchesDay) continue;

        // Deduplication key: check if a transaction for this rule & date was already created
        const noteWithTag = `${rule.template.note || 'Recurring'} [rule:${rule.id}:${targetDate}]`;
        let alreadyCreated = false;
        for (const tx of db.transactions.values()) {
          if (tx.workspace_id === wid && tx.note?.includes(`[rule:${rule.id}:${targetDate}]`)) {
            alreadyCreated = true;
            break;
          }
        }

        if (alreadyCreated) {
          // Harmless duplicate prevention
          continue;
        }

        const newTx = await db.createTransaction({
          workspace_id: wid,
          category_id: rule.template.category_id,
          kind: rule.template.kind,
          amount_minor: BigInt(rule.template.amount_minor),
          currency: ws.currency,
          occurred_on: targetDate,
          note: noteWithTag,
          created_by: request.user.userId,
        });

        generatedTransactions.push(newTx);
      }

      return reply.send({
        targetDate,
        rulesEvaluated: rules.length,
        createdCount: generatedTransactions.length,
        transactions: generatedTransactions,
      });
    }
  );
};
