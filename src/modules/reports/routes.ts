import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { db } from '../../db/index.js';
import { getMonthDateRange, parseMonth, getLastNMonths } from '../../lib/months.js';
import { formatAmount } from '../../lib/money.js';
import { AppProblemError } from '../../lib/problem.js';

export const reportRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // 1. Monthly Summary Report
  app.get(
    '/summary',
    {
      preHandler: [app.requireWorkspaceRole(['owner', 'member', 'viewer'], 'reports:read')],
      schema: {
        tags: ['Reports'],
        summary: 'Monthly financial summary (income, expenses, net)',
        querystring: {
          type: 'object',
          required: ['month'],
          properties: {
            month: { type: 'string', pattern: '^\\d{4}-\\d{2}$' },
          },
        },
      },
    },
    async (request, reply) => {
      const { wid } = request.params as any;
      const { month } = request.query as { month: string };
      parseMonth(month);

      const ws = await db.findWorkspaceById(wid);
      if (!ws) throw new AppProblemError(404, 'WORKSPACE_NOT_FOUND', 'Workspace not found.');

      const { startDate, endDate } = getMonthDateRange(month);

      let incomeMinor = 0n;
      let expensesMinor = 0n;

      for (const tx of db.transactions.values()) {
        if (tx.workspace_id !== wid || tx.deleted_at !== null) continue;
        if (tx.occurred_on >= startDate && tx.occurred_on < endDate) {
          if (tx.kind === 'INCOME') {
            incomeMinor += tx.amount_minor;
          } else {
            expensesMinor += tx.amount_minor;
          }
        }
      }

      const netMinor = incomeMinor - expensesMinor;

      return reply.send({
        month,
        currency: ws.currency,
        incomeMinor: incomeMinor.toString(),
        incomeFormatted: formatAmount(incomeMinor, ws.currency),
        expensesMinor: expensesMinor.toString(),
        expensesFormatted: formatAmount(expensesMinor, ws.currency),
        netMinor: netMinor.toString(),
        netFormatted: formatAmount(netMinor, ws.currency),
      });
    }
  );

  // 2. Spending by Category Report
  app.get(
    '/by-category',
    {
      preHandler: [app.requireWorkspaceRole(['owner', 'member', 'viewer'], 'reports:read')],
      schema: {
        tags: ['Reports'],
        summary: 'Spending totals and percentage share per category in a date range',
        querystring: {
          type: 'object',
          required: ['from', 'to'],
          properties: {
            from: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
            to: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          },
        },
      },
    },
    async (request, reply) => {
      const { wid } = request.params as any;
      const { from, to } = request.query as { from: string; to: string };

      const ws = await db.findWorkspaceById(wid);
      if (!ws) throw new AppProblemError(404, 'WORKSPACE_NOT_FOUND', 'Workspace not found.');

      const categories = await db.listCategories(wid, true);
      const catMap = new Map(categories.map((c) => [c.id, c]));

      const categoryTotals = new Map<string, bigint>();
      let grandTotal = 0n;

      for (const tx of db.transactions.values()) {
        if (tx.workspace_id !== wid || tx.deleted_at !== null || tx.kind !== 'EXPENSE') continue;
        if (tx.occurred_on >= from && tx.occurred_on <= to) {
          const current = categoryTotals.get(tx.category_id) || 0n;
          categoryTotals.set(tx.category_id, current + tx.amount_minor);
          grandTotal += tx.amount_minor;
        }
      }

      const items = Array.from(categoryTotals.entries()).map(([catId, spentMinor]) => {
        const cat = catMap.get(catId);
        const percent = grandTotal > 0n ? Number((spentMinor * 10000n) / grandTotal) / 100 : 0;
        return {
          categoryId: catId,
          categoryName: cat?.name || 'Unknown',
          color: cat?.color || '#12715A',
          spentMinor: spentMinor.toString(),
          spentFormatted: formatAmount(spentMinor, ws.currency),
          sharePercent: percent,
        };
      });

      // Sort by spentMinor DESC
      items.sort((a, b) => (BigInt(b.spentMinor) > BigInt(a.spentMinor) ? 1 : -1));

      return reply.send({
        from,
        to,
        currency: ws.currency,
        totalExpensesMinor: grandTotal.toString(),
        totalExpensesFormatted: formatAmount(grandTotal, ws.currency),
        items,
      });
    }
  );

  // 3. Budget vs Actual Report
  app.get(
    '/budget-vs-actual',
    {
      preHandler: [app.requireWorkspaceRole(['owner', 'member', 'viewer'], 'reports:read')],
      schema: {
        tags: ['Reports'],
        summary: 'Budget limits vs actual spending per category for a month',
        querystring: {
          type: 'object',
          required: ['month'],
          properties: {
            month: { type: 'string', pattern: '^\\d{4}-\\d{2}$' },
            categoryId: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { wid } = request.params as any;
      const { month, categoryId } = request.query as { month: string; categoryId?: string };
      parseMonth(month);

      const ws = await db.findWorkspaceById(wid);
      if (!ws) throw new AppProblemError(404, 'WORKSPACE_NOT_FOUND', 'Workspace not found.');

      const { startDate, endDate } = getMonthDateRange(month);

      const categories = await db.listCategories(wid, true);
      const filteredCategories = categoryId
        ? categories.filter((c) => c.id === categoryId)
        : categories.filter((c) => c.kind === 'EXPENSE');

      const budgets = await db.listBudgetsForMonth(wid, startDate);
      const budgetMap = new Map(budgets.map((b) => [b.category_id, b.limit_minor]));

      // Calculate spending per category
      const spentMap = new Map<string, bigint>();
      for (const tx of db.transactions.values()) {
        if (tx.workspace_id !== wid || tx.deleted_at !== null || tx.kind !== 'EXPENSE') continue;
        if (tx.occurred_on >= startDate && tx.occurred_on < endDate) {
          const current = spentMap.get(tx.category_id) || 0n;
          spentMap.set(tx.category_id, current + tx.amount_minor);
        }
      }

      const items = filteredCategories.map((cat) => {
        const budgetMinor = budgetMap.get(cat.id) || 0n;
        const spentMinor = spentMap.get(cat.id) || 0n;
        const remainingMinor = budgetMinor - spentMinor;
        const usedPercent =
          budgetMinor > 0n
            ? Math.round((Number(spentMinor) / Number(budgetMinor)) * 10000) / 100
            : spentMinor > 0n
            ? 100
            : 0;

        return {
          categoryId: cat.id,
          category: cat.name,
          color: cat.color,
          budgetMinor: budgetMinor.toString(),
          budgetFormatted: formatAmount(budgetMinor, ws.currency),
          spentMinor: spentMinor.toString(),
          spentFormatted: formatAmount(spentMinor, ws.currency),
          remainingMinor: remainingMinor.toString(),
          remainingFormatted: formatAmount(remainingMinor, ws.currency),
          usedPercent,
          overBudget: spentMinor > budgetMinor && budgetMinor > 0n,
        };
      });

      return reply.send({
        month,
        currency: ws.currency,
        items,
      });
    }
  );

  // 4. 12-Month Trend Report
  app.get(
    '/trend',
    {
      preHandler: [app.requireWorkspaceRole(['owner', 'member', 'viewer'], 'reports:read')],
      schema: {
        tags: ['Reports'],
        summary: 'Monthly financial trends for the past N months',
        querystring: {
          type: 'object',
          properties: {
            months: { type: 'integer', default: 12, minimum: 1, maximum: 36 },
            toMonth: { type: 'string', pattern: '^\\d{4}-\\d{2}$' },
          },
        },
      },
    },
    async (request, reply) => {
      const { wid } = request.params as any;
      const { months = 12, toMonth } = request.query as { months?: number; toMonth?: string };

      const ws = await db.findWorkspaceById(wid);
      if (!ws) throw new AppProblemError(404, 'WORKSPACE_NOT_FOUND', 'Workspace not found.');

      const monthList = getLastNMonths(months, toMonth);

      const series = monthList.map((m) => {
        const { startDate, endDate } = getMonthDateRange(m);
        let income = 0n;
        let expenses = 0n;

        for (const tx of db.transactions.values()) {
          if (tx.workspace_id !== wid || tx.deleted_at !== null) continue;
          if (tx.occurred_on >= startDate && tx.occurred_on < endDate) {
            if (tx.kind === 'INCOME') {
              income += tx.amount_minor;
            } else {
              expenses += tx.amount_minor;
            }
          }
        }

        const net = income - expenses;
        return {
          month: m,
          incomeMinor: income.toString(),
          incomeFormatted: formatAmount(income, ws.currency),
          expensesMinor: expenses.toString(),
          expensesFormatted: formatAmount(expenses, ws.currency),
          netMinor: net.toString(),
          netFormatted: formatAmount(net, ws.currency),
        };
      });

      return reply.send({
        currency: ws.currency,
        series,
      });
    }
  );
};
