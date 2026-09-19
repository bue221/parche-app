export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080').replace(/\/$/, '');

export const DEMO_PASSWORD = 'parche1234';

export const DEMO_ACCOUNTS = [
  { email: 'ata@parche.test', label: 'Asistente' },
  { email: 'promoter@parche.test', label: 'Organizador' },
  { email: 'door@parche.test', label: 'Puerta' },
  { email: 'metrics@parche.test', label: 'Métricas' },
  { email: 'admin@parche.test', label: 'Admin' },
  { email: 'luna@parche.test', label: 'Artista' },
] as const;

function isLoopbackHost(host: string): boolean {
  return host === 'localhost' || host === '127.0.0.1' || host === 'minio' || host === '0.0.0.0';
}

/**
 * PUT targets from POST /v1/uploads. Never rewrite through GET /v1/media — that
 * drops the signature and sends bytes to a read-only proxy.
 */
export function rewriteUploadUrl(url: string): string {
  if (!url) {
    return url;
  }
  const trimmed = url.trim();
  if (trimmed.startsWith('/')) {
    return `${API_URL}${trimmed}`;
  }
  try {
    const parsed = new URL(trimmed.replace(/https?:\/\/minio:9000/gi, 'http://localhost:9000'));
    if (parsed.pathname === '/v1/uploads/direct' || parsed.pathname.startsWith('/v1/uploads/direct/')) {
      return `${API_URL}${parsed.pathname}${parsed.search}`;
    }
    return parsed.toString();
  } catch {
    return trimmed;
  }
}

/** MinIO inside Compose is minio:9000. Phones cannot open that host, so loopback media goes through the API. */
export function rewriteMediaUrl(url: string): string {
  if (!url) {
    return url;
  }
  const trimmed = url.trim();
  if (trimmed.startsWith('/')) {
    return `${API_URL}${toApiMediaPath(trimmed)}`;
  }

  try {
    const parsed = new URL(trimmed.replace(/https?:\/\/minio:9000/gi, 'http://localhost:9000'));
    if (isLoopbackHost(parsed.hostname)) {
      const path = parsed.pathname.replace(/^\/parche(?=\/|$)/, '');
      return `${API_URL}${toApiMediaPath(path)}`;
    }
    return parsed.toString();
  } catch {
    return trimmed.replace(/https?:\/\/minio:9000/gi, 'http://localhost:9000');
  }
}

/**
 * Audio masters stay off GET /v1/media. 45s previews (`*.preview.mp3`) can use the media proxy
 * so browsers never need a MinIO host rewrite that invalidates the signature.
 */
export function rewritePreviewUrl(url: string): string {
  if (!url) {
    return url;
  }
  const trimmed = url.trim();
  if (trimmed.startsWith('/')) {
    return `${API_URL}${trimmed}`;
  }
  try {
    const parsed = new URL(trimmed.replace(/https?:\/\/minio:9000/gi, 'http://localhost:9000'));
    const preview =
      parsed.pathname.includes('/audio/') &&
      (parsed.pathname.endsWith('.preview.mp3') || parsed.pathname.endsWith('.preview.m4a'));
    if (isLoopbackHost(parsed.hostname) && preview) {
      return rewriteMediaUrl(trimmed);
    }
    return parsed.toString();
  } catch {
    return trimmed.replace(/https?:\/\/minio:9000/gi, 'http://localhost:9000');
  }
}

function toApiMediaPath(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (normalized.startsWith('/v1/media/')) {
    return normalized;
  }
  if (normalized === '/v1/media') {
    return normalized;
  }
  if (normalized.startsWith('/media/')) {
    return `/v1/media/${normalized.slice('/media/'.length)}`;
  }
  if (normalized === '/media') {
    return '/v1/media';
  }
  return `/v1/media${normalized}`;
}
