import { Platform } from 'react-native';

const REFRESH_KEY = 'parche.refresh';
const SESSION_FLAG_KEY = 'parche.session';

let accessToken: string | null = null;
let accessExpiresAt = 0;
let refreshToken: string | null = null;

export function usesCookieRefresh(): boolean {
  return Platform.OS === 'web';
}

async function storageGet(key: string): Promise<string | null> {
  const SecureStore = await import('expo-secure-store');
  return SecureStore.getItemAsync(key);
}

async function storageSet(key: string, value: string | null): Promise<void> {
  const SecureStore = await import('expo-secure-store');
  if (value) {
    await SecureStore.setItemAsync(key, value);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}

function webFlag(): boolean {
  try {
    return globalThis.localStorage?.getItem(SESSION_FLAG_KEY) === '1';
  } catch {
    return false;
  }
}

function setWebFlag(on: boolean): void {
  try {
    if (on) {
      globalThis.localStorage?.setItem(SESSION_FLAG_KEY, '1');
    } else {
      globalThis.localStorage?.removeItem(SESSION_FLAG_KEY);
    }
    globalThis.localStorage?.removeItem(REFRESH_KEY);
  } catch {
    /* ignore quota / private mode */
  }
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function getRefreshToken(): string | null {
  return refreshToken;
}

export function getAccessExpiresAt(): number {
  return accessExpiresAt;
}

export function hasPersistedSession(): boolean {
  if (refreshToken) {
    return true;
  }
  return usesCookieRefresh() && webFlag();
}

export async function setTokens(next: {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: number;
}): Promise<void> {
  accessToken = next.accessToken;
  accessExpiresAt = next.accessExpiresAt;
  if (usesCookieRefresh()) {
    refreshToken = null;
    setWebFlag(true);
    return;
  }
  refreshToken = next.refreshToken || null;
  await storageSet(REFRESH_KEY, refreshToken);
}

export async function clearTokens(): Promise<void> {
  accessToken = null;
  refreshToken = null;
  accessExpiresAt = 0;
  if (usesCookieRefresh()) {
    setWebFlag(false);
    return;
  }
  await storageSet(REFRESH_KEY, null);
}

export async function hydrateRefresh(): Promise<string | null> {
  if (usesCookieRefresh()) {
    try {
      const legacy = globalThis.localStorage?.getItem(REFRESH_KEY);
      if (legacy) {
        refreshToken = legacy;
        setWebFlag(true);
        return legacy;
      }
    } catch {
      /* ignore */
    }
    refreshToken = null;
    return webFlag() ? 'cookie' : null;
  }
  const stored = await storageGet(REFRESH_KEY);
  refreshToken = stored;
  return stored;
}
