import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { db } from '../../db/index.js';
import { AppProblemError } from '../../lib/problem.js';

export const categoryRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // List categories
  app.get(
    '/',
    {
      preHandler: [app.requireWorkspaceRole(['owner', 'member', 'viewer'], 'categories:read')],
      schema: {
        tags: ['Categories'],
        summary: 'List categories in a workspace',
        querystring: {
          type: 'object',
          properties: {
            includeArchived: { type: 'boolean', default: false },
          },
        },
      },
    },
    async (request, reply) => {
      const { wid } = request.params as any;
      const { includeArchived } = request.query as { includeArchived?: boolean };
      const categories = await db.listCategories(wid, includeArchived);
      return reply.send({ data: categories });
    }
  );

  // Create category
  app.post(
    '/',
    {
      preHandler: [app.requireWorkspaceRole(['owner', 'member'], 'categories:write')],
      schema: {
        tags: ['Categories'],
        summary: 'Create a new category',
        body: {
          type: 'object',
          required: ['name', 'kind'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 100 },
            kind: { type: 'string', enum: ['EXPENSE', 'INCOME'] },
            color: { type: 'string', default: '#12715A' },
          },
        },
      },
    },
    async (request, reply) => {
      const { wid } = request.params as any;
      const { name, kind, color } = request.body as any;

      try {
        const category = await db.createCategory({
          workspace_id: wid,
          name: name.trim(),
          kind,
          color: color || '#12715A',
          archived_at: null,
        });
        return reply.code(201).send(category);
      } catch (err: any) {
        if (err.message === 'CATEGORY_ALREADY_EXISTS') {
          throw new AppProblemError(409, 'CATEGORY_ALREADY_EXISTS', `A category named '${name}' already exists.`);
        }
        throw err;
      }
    }
  );

  // Update or archive category
  app.patch(
    '/:id',
    {
      preHandler: [app.requireWorkspaceRole(['owner', 'member'], 'categories:write')],
      schema: {
        tags: ['Categories'],
        summary: 'Update or archive a category',
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
            name: { type: 'string', minLength: 1 },
            color: { type: 'string' },
            archived: { type: 'boolean' },
          },
        },
      },
    },
    async (request, reply) => {
      const { wid, id } = request.params as any;
      const { name, color, archived } = request.body as any;

      const updates: any = {};
      if (name !== undefined) updates.name = name.trim();
      if (color !== undefined) updates.color = color;
      if (archived === true) updates.archived_at = new Date().toISOString();
      if (archived === false) updates.archived_at = null;

      try {
        const updated = await db.updateCategory(id, wid, updates);
        if (!updated) {
          throw new AppProblemError(404, 'CATEGORY_NOT_FOUND', 'Category not found.');
        }
        return reply.send(updated);
      } catch (err: any) {
        if (err.message === 'CATEGORY_ALREADY_EXISTS') {
          throw new AppProblemError(409, 'CATEGORY_ALREADY_EXISTS', `A category named '${name}' already exists.`);
        }
        throw err;
      }
    }
  );
};
