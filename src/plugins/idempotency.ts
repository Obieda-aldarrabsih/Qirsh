import { FastifyReply, FastifyRequest } from 'fastify';
import crypto from 'crypto';
import { db } from '../db/index.js';
import { AppProblemError } from '../lib/problem.js';

export async function handleIdempotencyPreHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const idempotencyKey = request.headers['idempotency-key'] as string | undefined;
  if (!idempotencyKey) return;

  const principalId = request.user?.userId || request.ip;
  const requestBodyStr = request.body ? JSON.stringify(request.body) : '';
  const requestHash = crypto.createHash('sha256').update(requestBodyStr).digest('hex');

  const existing = await db.getIdempotency(principalId, idempotencyKey);
  if (existing) {
    if (existing.request_hash !== requestHash) {
      throw new AppProblemError(
        422,
        'IDEMPOTENCY_KEY_REUSED',
        'Idempotency key was previously used with a different request payload.'
      );
    }
    // Replay previous response
    reply
      .code(existing.status)
      .header('X-Cache-Lookup', 'HIT-IDEMPOTENT')
      .send(existing.response);
  }
}

export async function saveIdempotencyResponse(
  principalId: string,
  key: string,
  body: any,
  status: number,
  response: any
): Promise<void> {
  const requestBodyStr = body ? JSON.stringify(body) : '';
  const requestHash = crypto.createHash('sha256').update(requestBodyStr).digest('hex');

  await db.saveIdempotency({
    principal_id: principalId,
    key,
    request_hash: requestHash,
    status,
    response,
    created_at: new Date().toISOString(),
  });
}
