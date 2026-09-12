import { Platform } from 'react-native';

import { useAuthStore } from '@/data/auth-store';
import { ApiError, type ApiErrorCode } from '@/data/errors';
import { API_URL, rewriteMediaUrl } from '@/data/env';
import { getAccessToken, getRefreshToken, setTokens, clearTokens, usesCookieRefresh } from '@/data/token-store';

type Json = Record<string, unknown> | unknown[] | null;

let refreshInFlight: Promise<boolean> | null = null;

const networkError = () => new ApiError('NETWORK', 'No hay conexión con Parche. Revisa el servidor e intenta de nuevo.');

async function parseBody(res: Response): Promise<Json> {
  const text = await res.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text) as Json;
  } catch {
    return null;
  }
}

function toError(res: Response, body: Json): ApiError {
  const rec = body && !Array.isArray(body) ? body : {};
  const raw = typeof rec.code === 'string' ? rec.code : 'NETWORK';
  const code = (raw === 'RATE_LIMITED' ? 'RATE_LIMIT' : raw) as ApiErrorCode;
  const message = typeof rec.message === 'string' ? rec.message : 'Algo falló. Intenta de nuevo.';
  const details = Array.isArray(rec.details) ? rec.details : [];
  const fieldErrors: Record<string, string> = {};
  for (const d of details) {
    if (d && typeof d === 'object' && 'field' in d) {
      const row = d as { field?: string; issue?: string };
      if (row.field) {
        fieldErrors[row.field] = row.issue ?? 'invalid';
      }
    }
  }
  const safe: ApiErrorCode = [
    'VALIDATION_ERROR',
    'UNAUTHORIZED',
    'FORBIDDEN',
    'NOT_FOUND',
    'GONE',
    'CONFLICT',
    'RATE_LIMIT',
    'NETWORK',
  ].includes(code)
    ? code
    : 'NETWORK';
  return new ApiError(safe, message, Object.keys(fieldErrors).length ? fieldErrors : undefined);
}

export async function revokeLocalSession(): Promise<void> {
  await clearTokens();
  useAuthStore.getState().setMe(null);
  useAuthStore.getState().setAccessExpiresAt(0);
}

function fetchCredentials(): RequestCredentials | undefined {
  return Platform.OS === 'web' ? 'include' : undefined;
}

export async function refreshSession(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh && !usesCookieRefresh()) {
    return false;
  }
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      let res: Response;
      try {
        res = await fetch(`${API_URL}/v1/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: fetchCredentials(),
          body: JSON.stringify(refresh ? { refresh_token: refresh } : {}),
        });
      } catch {
        throw networkError();
      }
      const body = await parseBody(res);
      if (res.status === 401) {
        await revokeLocalSession();
        return false;
      }
      if (!res.ok) {
        throw toError(res, body);
      }
      const rec = body && !Array.isArray(body) ? body : {};
      await setTokens({
        accessToken: String(rec.access_token ?? ''),
        refreshToken: String(rec.refresh_token ?? refresh ?? ''),
        accessExpiresAt: rec.access_expires_at ? Date.parse(String(rec.access_expires_at)) : Date.now() + 12 * 60_000,
      });
      return true;
    })().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { auth?: boolean; idempotencyKey?: string } = {}
): Promise<T> {
  const { auth = false, idempotencyKey, ...rest } = init;
  const headers = new Headers(rest.headers);
  if (rest.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (idempotencyKey) {
    headers.set('Idempotency-Key', idempotencyKey);
  }
  if (auth) {
    const token = getAccessToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const run = () =>
    fetch(`${API_URL}${path}`, {
      ...rest,
      headers,
      credentials: rest.credentials ?? fetchCredentials(),
    });

  let res: Response;
  try {
    res = await run();
  } catch {
    throw networkError();
  }
  if (res.status === 401 && auth) {
    const ok = await refreshSession();
    if (ok) {
      const token = getAccessToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      try {
        res = await run();
      } catch {
        throw networkError();
      }
    }
  }
  const body = await parseBody(res);
  if (!res.ok) {
    throw toError(res, body);
  }
  return body as T;
}

export function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

export function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

export function num(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

export function mediaUrl(v: unknown): string | undefined {
  const u = str(v);
  return u ? rewriteMediaUrl(u) : undefined;
}
