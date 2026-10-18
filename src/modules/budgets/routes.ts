import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { db } from '../../db/index.js';
import { parseMonth, getMonthDateRange } from '../../lib/months.js';
import { AppProblemError } from '../../lib/problem.js';
import { parseAmount } from '../../lib/money.js';

export const budgetRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // Get all budgets for a given month
  app.get(
    '/:month',
    {
      preHandler: [app.requireWorkspaceRole(['owner', 'member', 'viewer'], 'budgets:read')],
      schema: {
        tags: ['Budgets'],
        summary: 'List category budgets for a specific month',
        params: {
          type: 'object',
          required: ['month'],
          properties: {
            month: { type: 'string', pattern: '^\\d{4}-\\d{2}$' },
          },
        },
      },
    },
    async (request, reply) => {
      const { wid, month } = request.params as any;
      parseMonth(month); // validates format
      const { startDate } = getMonthDateRange(month);

      const list = await db.listBudgetsForMonth(wid, startDate);
      const categories = await db.listCategories(wid, true);
      const catMap = new Map(categories.map((c) => [c.id, c]));

      const enriched = list.map((b) => ({
        categoryId: b.category_id,
        categoryName: catMap.get(b.category_id)?.name || 'Unknown',
        month,
        limitMinor: b.limit_minor.toString(),
      }));

      return reply.send({ data: enriched });
    }
  );

  // Set / upsert budgets for a month
  app.put(
    '/:month',
    {
      preHandler: [app.requireWorkspaceRole(['owner', 'member'], 'budgets:write')],
      schema: {
        tags: ['Budgets'],
        summary: 'Set or update budgets for categories in a month',
        params: {
          type: 'object',
          required: ['month'],
          properties: {
            month: { type: 'string', pattern: '^\\d{4}-\\d{2}$' },
          },
        },
        body: {
          type: 'object',
          required: ['budgets'],
          properties: {
            budgets: {
              type: 'array',
              items: {
                type: 'object',
                required: ['categoryId', 'limitMinor'],
                properties: {
                  categoryId: { type: 'string' },
                  limitMinor: { type: ['string', 'integer'] },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { wid, month } = request.params as any;
      const { budgets } = request.body as any;
      parseMonth(month);
      const { startDate } = getMonthDateRange(month);

      const ws = await db.findWorkspaceById(wid);
      if (!ws) throw new AppProblemError(404, 'WORKSPACE_NOT_FOUND', 'Workspace not found.');

      const savedList = [];
      for (const item of budgets) {
        const cat = await db.findCategoryById(item.categoryId, wid);
        if (!cat) {
          throw new AppProblemError(422, 'INVALID_CATEGORY', `Category '${item.categoryId}' not found.`);
        }
        const limitMinor = parseAmount(item.limitMinor, ws.currency);
        const saved = await db.setBudget(wid, item.categoryId, startDate, limitMinor);
        savedList.push({
          categoryId: saved.category_id,
          month,
          limitMinor: saved.limit_minor.toString(),
        });
      }

      return reply.send({ data: savedList });
    }
  );

  // Copy budgets from previous month
  app.post(
    '/:month/copy-from/:prevMonth',
    {
      preHandler: [app.requireWorkspaceRole(['owner', 'member'], 'budgets:write')],
      schema: {
        tags: ['Budgets'],
        summary: 'Copy category budgets from a previous month',
        params: {
          type: 'object',
          required: ['month', 'prevMonth'],
          properties: {
            month: { type: 'string', pattern: '^\\d{4}-\\d{2}$' },
            prevMonth: { type: 'string', pattern: '^\\d{4}-\\d{2}$' },
          },
        },
      },
    },
    async (request, reply) => {
      const { wid, month, prevMonth } = request.params as any;
      parseMonth(month);
      parseMonth(prevMonth);

      const { startDate: targetDate } = getMonthDateRange(month);
      const { startDate: sourceDate } = getMonthDateRange(prevMonth);

      const copied = await db.copyBudgets(wid, sourceDate, targetDate);
      return reply.send({
        message: `Successfully copied ${copied.length} budgets from ${prevMonth} to ${month}.`,
        data: copied.map((b) => ({
          categoryId: b.category_id,
          month,
          limitMinor: b.limit_minor.toString(),
        })),
      });
    }
  );
};
