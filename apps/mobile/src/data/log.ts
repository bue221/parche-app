const SENSITIVE = /access|refresh|authorization|token|password|jws|jti/i;

export function debugLog(scope: string, message: string, extra?: Record<string, unknown>) {
  if (!__DEV__) {
    return;
  }
  if (extra) {
    const safe: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(extra)) {
      safe[key] = SENSITIVE.test(key) ? '[redacted]' : value;
    }
    console.info(`[parche:${scope}] ${message}`, safe);
    return;
  }
  console.info(`[parche:${scope}] ${message}`);
}
