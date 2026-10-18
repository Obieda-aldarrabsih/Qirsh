import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { AppProblemError, formatProblem, ValidationErrorItem } from '../lib/problem.js';
import { MoneyError } from '../lib/money.js';
import { MonthError } from '../lib/months.js';
import { ZodError } from 'zod';

export function registerErrorHandler(app: FastifyInstance): void {
  // 404 Not Found handler
  app.setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) => {
    const problem = formatProblem(
      404,
      'NOT_FOUND',
      `Route ${request.method} ${request.url} not found.`,
      request.id
    );
    reply
      .code(404)
      .header('Content-Type', 'application/problem+json')
      .send(problem);
  });

  // Global Error Handler
  app.setErrorHandler((error: any, request: FastifyRequest, reply: FastifyReply) => {
    request.log.error(error);

    // AppProblemError
    if (error instanceof AppProblemError) {
      const problem = formatProblem(
        error.status,
        error.code,
        error.detail,
        request.id,
        error.title,
        error.errors
      );
      return reply
        .code(error.status)
        .header('Content-Type', 'application/problem+json')
        .send(problem);
    }

    // MoneyError
    if (error instanceof MoneyError) {
      const problem = formatProblem(
        error.statusCode,
        error.code,
        error.message,
        request.id,
        'Money Validation Error'
      );
      return reply
        .code(error.statusCode)
        .header('Content-Type', 'application/problem+json')
        .send(problem);
    }

    // MonthError
    if (error instanceof MonthError) {
      const problem = formatProblem(
        error.statusCode,
        error.code,
        error.message,
        request.id,
        'Month Validation Error'
      );
      return reply
        .code(error.statusCode)
        .header('Content-Type', 'application/problem+json')
        .send(problem);
    }

    // Zod validation error
    if (error instanceof ZodError || error.name === 'ZodError') {
      const validationErrors: ValidationErrorItem[] = (error.issues || []).map((issue: any) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));

      const problem = formatProblem(
        400,
        'VALIDATION_ERROR',
        'Request validation failed.',
        request.id,
        'Bad Request',
        validationErrors
      );
      return reply
        .code(400)
        .header('Content-Type', 'application/problem+json')
        .send(problem);
    }

    // Fastify schema validation error
    if (error.validation) {
      const validationErrors: ValidationErrorItem[] = error.validation.map((v: any) => ({
        path: v.instancePath || v.params?.missingProperty || 'body',
        message: v.message || 'Invalid value',
      }));

      const problem = formatProblem(
        400,
        'VALIDATION_ERROR',
        'Request validation failed.',
        request.id,
        'Bad Request',
        validationErrors
      );
      return reply
        .code(400)
        .header('Content-Type', 'application/problem+json')
        .send(problem);
    }

    // Rate Limit 429
    if (error.statusCode === 429) {
      const problem = formatProblem(
        429,
        'RATE_LIMIT_EXCEEDED',
        'Rate limit exceeded. Please back off before retrying.',
        request.id,
        'Too Many Requests'
      );
      return reply
        .code(429)
        .header('Content-Type', 'application/problem+json')
        .send(problem);
    }

    // HTTP 401 Unauthorized
    if (error.statusCode === 401 || error.name === 'UnauthorizedError') {
      const problem = formatProblem(
        401,
        'UNAUTHORIZED',
        error.message || 'Authentication required.',
        request.id,
        'Unauthorized'
      );
      return reply
        .code(401)
        .header('Content-Type', 'application/problem+json')
        .send(problem);
    }

    // Precondition Failed 412
    if (error.statusCode === 412) {
      const problem = formatProblem(
        412,
        'PRECONDITION_FAILED',
        error.message || 'Resource version does not match If-Match header.',
        request.id,
        'Precondition Failed'
      );
      return reply
        .code(412)
        .header('Content-Type', 'application/problem+json')
        .send(problem);
    }

    // General fallback 500
    const statusCode = typeof error.statusCode === 'number' && error.statusCode >= 400 && error.statusCode < 600
      ? error.statusCode
      : 500;

    const problem = formatProblem(
      statusCode,
      error.code || 'INTERNAL_ERROR',
      statusCode === 500 ? 'An unexpected internal error occurred.' : error.message,
      request.id
    );
    return reply
      .code(statusCode)
      .header('Content-Type', 'application/problem+json')
      .send(problem);
  });
}
