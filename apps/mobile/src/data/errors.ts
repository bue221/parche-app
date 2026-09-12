export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'GONE'
  | 'CONFLICT'
  | 'RATE_LIMIT'
  | 'NETWORK';

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly fieldErrors?: Record<string, string>;

  constructor(code: ApiErrorCode, message: string, fieldErrors?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

export function userMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error && /network|fetch|failed/i.test(error.message)) {
    return 'No hay conexión con Parche. Revisa el servidor e intenta de nuevo.';
  }
  return 'Algo falló. Intenta de nuevo.';
}
