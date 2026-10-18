import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { parse as parseCsv } from 'csv-parse/sync';
import crypto from 'crypto';
import { db } from '../../db/index.js';
import { parseAmount } from '../../lib/money.js';
import { AppProblemError } from '../../lib/problem.js';

export const importRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // POST /v1/workspaces/:wid/imports
  app.post(
    '/',
    {
      preHandler: [app.requireWorkspaceRole(['owner', 'member'], 'imports:write')],
      schema: {
        tags: ['Imports & Exports'],
        summary: 'Import transactions in bulk from CSV (supports Idempotency-Key)',
        body: {
          type: 'object',
          required: ['csvData'],
          properties: {
            csvData: { type: 'string', description: 'Raw CSV text with header: occurredOn,category,amount,kind,note' },
          },
        },
      },
    },
    async (request, reply) => {
      const { wid } = request.params as any;
      const { csvData } = request.body as { csvData: string };

      const ws = await db.findWorkspaceById(wid);
      if (!ws) throw new AppProblemError(404, 'WORKSPACE_NOT_FOUND', 'Workspace not found.');

      // Idempotency Key Handling
      const idempotencyKey = request.headers['idempotency-key'] as string | undefined;
      const principalId = request.user.userId;

      if (idempotencyKey) {
        const reqHash = crypto.createHash('sha256').update(csvData).digest('hex');
        const existing = await db.getIdempotency(principalId, idempotencyKey);
        if (existing) {
          if (existing.request_hash !== reqHash) {
            throw new AppProblemError(
              422,
              'IDEMPOTENCY_KEY_REUSED',
              'Idempotency key was previously used with a different CSV payload.'
            );
          }
          return reply.code(existing.status).send(existing.response);
        }
      }

      // Create import job record
      const job = await db.createImportJob(wid);
      job.status = 'RUNNING';

      let records: any[] = [];
      try {
        records = parseCsv(csvData, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        });
      } catch (err: any) {
        job.status = 'FAILED';
        job.errors.push({ line: 1, error: `Malformed CSV syntax: ${err.message}` });
        const res = { id: job.id, status: job.status, totalRows: 0, inserted: 0, failed: 0, errors: job.errors };
        if (idempotencyKey) {
          await db.saveIdempotency({
            principal_id: principalId,
            key: idempotencyKey,
            request_hash: crypto.createHash('sha256').update(csvData).digest('hex'),
            status: 400,
            response: res,
            created_at: new Date().toISOString(),
          });
        }
        return reply.code(400).send(res);
      }

      job.total_rows = records.length;
      const categories = await db.listCategories(wid, true);
      const catMap = new Map(categories.map((c) => [c.name.toLowerCase().trim(), c]));

      let lineNumber = 1; // 1 was header
      for (const row of records) {
        lineNumber++;
        try {
          const occurredOn = row.occurredOn || row.occurred_on || row.date;
          const categoryName = (row.category || row.categoryName || '').toLowerCase().trim();
          const amountStr = row.amount || row.amountMinor;
          const kind = (row.kind || 'EXPENSE').toUpperCase();
          const note = row.note || null;

          if (!occurredOn || !/^\d{4}-\d{2}-\d{2}$/.test(occurredOn)) {
            throw new Error(`Invalid or missing occurredOn date '${occurredOn}'. Expected YYYY-MM-DD.`);
          }

          let category = catMap.get(categoryName);
          if (!category) {
            // Auto-create category if doesn't exist
            category = await db.createCategory({
              workspace_id: wid,
              name: row.category ? row.category.trim() : 'Uncategorized',
              kind: kind === 'INCOME' ? 'INCOME' : 'EXPENSE',
              color: '#12715A',
              archived_at: null,
            });
            catMap.set(category.name.toLowerCase().trim(), category);
          }

          const minor = parseAmount(amountStr, ws.currency);

          await db.createTransaction({
            workspace_id: wid,
            category_id: category.id,
            kind: kind === 'INCOME' ? 'INCOME' : 'EXPENSE',
            amount_minor: minor,
            currency: ws.currency,
            occurred_on: occurredOn,
            note,
            created_by: request.user.userId,
          });

          job.inserted++;
        } catch (err: any) {
          job.failed++;
          job.errors.push({
            line: lineNumber,
            error: err.message,
            raw: JSON.stringify(row),
          });
        }
      }

      job.status = job.failed === records.length && records.length > 0 ? 'FAILED' : 'DONE';

      const responsePayload = {
        id: job.id,
        status: job.status,
        totalRows: job.total_rows,
        inserted: job.inserted,
        failed: job.failed,
        errors: job.errors,
      };

      if (idempotencyKey) {
        await db.saveIdempotency({
          principal_id: principalId,
          key: idempotencyKey,
          request_hash: crypto.createHash('sha256').update(csvData).digest('hex'),
          status: 202,
          response: responsePayload,
          created_at: new Date().toISOString(),
        });
      }

      return reply.code(202).send(responsePayload);
    }
  );

  // GET /v1/workspaces/:wid/imports/:id
  app.get(
    '/:id',
    {
      preHandler: [app.requireWorkspaceRole(['owner', 'member', 'viewer'], 'imports:read')],
      schema: {
        tags: ['Imports & Exports'],
        summary: 'Get status and row errors of an import job',
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
      const job = await db.getImportJob(id, wid);
      if (!job) {
        throw new AppProblemError(404, 'IMPORT_NOT_FOUND', 'Import job not found.');
      }
      return reply.send({
        id: job.id,
        status: job.status,
        totalRows: job.total_rows,
        inserted: job.inserted,
        failed: job.failed,
        errors: job.errors,
        createdAt: job.created_at,
      });
    }
  );
};
