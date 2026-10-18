import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { stringify } from 'csv-stringify/sync';
import { db } from '../../db/index.js';
import { formatAmount } from '../../lib/money.js';
import { AppProblemError } from '../../lib/problem.js';

/**
 * Escapes CSV cell value against formula injection attacks (DDE / CSV injection)
 * Cells starting with =, +, -, @, \t, or \r are prefixed with a single quote.
 */
function sanitizeCsvCell(value: string | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

export const exportRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get(
    '/transactions.csv',
    {
      preHandler: [app.requireWorkspaceRole(['owner', 'member', 'viewer'], 'exports:read')],
      schema: {
        tags: ['Imports & Exports'],
        summary: 'Stream transactions as CSV with formula injection sanitization',
      },
    },
    async (request, reply) => {
      const { wid } = request.params as any;
      const ws = await db.findWorkspaceById(wid);
      if (!ws) throw new AppProblemError(404, 'WORKSPACE_NOT_FOUND', 'Workspace not found.');

      const categories = await db.listCategories(wid, true);
      const catMap = new Map(categories.map((c) => [c.id, c.name]));

      const rows: any[] = [];
      for (const tx of db.transactions.values()) {
        if (tx.workspace_id !== wid || tx.deleted_at !== null) continue;
        rows.push([
          tx.id,
          tx.occurred_on,
          catMap.get(tx.category_id) || 'Uncategorized',
          tx.kind,
          formatAmount(tx.amount_minor, tx.currency),
          tx.currency,
          tx.amount_minor.toString(),
          sanitizeCsvCell(tx.note),
          tx.created_at,
        ]);
      }

      // Sort rows by date DESC
      rows.sort((a, b) => b[1].localeCompare(a[1]));

      const csvOutput = stringify(
        [
          ['TransactionId', 'Date', 'Category', 'Kind', 'Amount', 'Currency', 'AmountMinor', 'Note', 'CreatedAt'],
          ...rows,
        ]
      );

      return reply
        .header('Content-Type', 'text/csv; charset=utf-8')
        .header('Content-Disposition', `attachment; filename="qirsh_transactions_${wid.slice(0, 8)}.csv"`)
        .send(csvOutput);
    }
  );
};
