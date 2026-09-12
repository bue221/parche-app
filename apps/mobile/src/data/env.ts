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

/** MinIO inside Compose is minio:9000; the host publishes 9000. */
export function rewriteMediaUrl(url: string): string {
  if (!url) {
    return url;
  }
  return url.replace('http://minio:9000', 'http://localhost:9000').replace('https://minio:9000', 'http://localhost:9000');
}
