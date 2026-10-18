/**
 * RFC 7807 / RFC 9457 Problem Details for HTTP APIs
 * Content-Type: application/problem+json
 */

export interface ValidationErrorItem {
  path: string;
  message: string;
}

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  code: string;
  detail: string;
  instance?: string;
  errors?: ValidationErrorItem[];
  [key: string]: unknown;
}

export class AppProblemError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly detail: string;
  public readonly title: string;
  public readonly errors?: ValidationErrorItem[];

  constructor(status: number, code: string, detail: string, title?: string, errors?: ValidationErrorItem[]) {
    super(detail);
    this.name = 'AppProblemError';
    this.status = status;
    this.code = code;
    this.detail = detail;
    this.title = title || defaultTitles[status] || 'An error occurred';
    this.errors = errors;
  }
}

const defaultTitles: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Resource Not Found',
  409: 'Conflict',
  412: 'Precondition Failed',
  422: 'Unprocessable Content',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  503: 'Service Unavailable',
};

export function toKebabCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function formatProblem(
  status: number,
  code: string,
  detail: string,
  instance?: string,
  title?: string,
  errors?: ValidationErrorItem[]
): ProblemDetails {
  const errorSlug = toKebabCase(code || 'error');
  const problem: ProblemDetails = {
    type: `https://qirsh.dev/docs/errors/${errorSlug}`,
    title: title || defaultTitles[status] || 'Error',
    status,
    code,
    detail,
    instance: instance || `req_${Date.now().toString(36)}`,
  };

  if (errors && errors.length > 0) {
    problem.errors = errors;
  }

  return problem;
}
