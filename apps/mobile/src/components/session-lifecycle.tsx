import { router, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState, Platform, type AppStateStatus, Modal, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useAuthStore } from '@/data/auth-store';
import { api } from '@/data/client';
import { ApiError } from '@/data/errors';
import { refreshSession, revokeLocalSession } from '@/data/http';
import { debugLog } from '@/data/log';
import { hydratePrintSeen } from '@/data/ticket-cache';
import { useInterestStore } from '@/data/interest-store';
import { reconcileInterest } from '@/data/interest-sync';
import { useRecentStore } from '@/data/recent-store';
import { getAccessExpiresAt, hasPersistedSession, hydrateRefresh } from '@/data/token-store';

const REFRESH_SKEW_MS = 90 * 1000;

let bootPromise: Promise<void> | null = null;

function isUnauthorized(err: unknown): boolean {
  return err instanceof ApiError && err.code === 'UNAUTHORIZED';
}

async function loadMe(): Promise<void> {
  await api.auth.me();
  useAuthStore.getState().setAccessExpiresAt(getAccessExpiresAt());
  void reconcileInterest();
}

async function refreshAccess(reason: string): Promise<'ok' | 'unauthorized' | 'unavailable'> {
  try {
    await api.auth.refresh();
    debugLog('auth', `access refreshed (${reason})`);
    if (!useAuthStore.getState().me) {
      await loadMe();
    }
    return 'ok';
  } catch (err) {
    if (isUnauthorized(err)) {
      return 'unauthorized';
    }
    debugLog('auth', 'refresh failed, one retry');
    try {
      await api.auth.refresh();
      debugLog('auth', `access refreshed after retry (${reason})`);
      if (!useAuthStore.getState().me) {
        await loadMe();
      }
      return 'ok';
    } catch (err2) {
      if (isUnauthorized(err2)) {
        return 'unauthorized';
      }
      return 'unavailable';
    }
  }
}

async function bootSession(): Promise<void> {
  try {
    await hydratePrintSeen();
    await useInterestStore.getState().hydrate();
    await useRecentStore.getState().hydrate();
    const refresh = await hydrateRefresh();
    if (!refresh) {
      useInterestStore.getState().dropSynced();
      useRecentStore.getState().adoptOwner(null);
      return;
    }
    const ok = await refreshSession();
    if (!ok) {
      useInterestStore.getState().dropSynced();
      useRecentStore.getState().adoptOwner(null);
      return;
    }
    try {
      await loadMe();
    } catch (err) {
      if (isUnauthorized(err)) {
        await revokeLocalSession();
      }
    }
  } catch (err) {
    debugLog('auth', isUnauthorized(err) ? 'boot session revoked' : 'boot refresh unavailable');
  } finally {
    useAuthStore.getState().setHydrated(true);
  }
}

function ensureBootSession(): Promise<void> {
  if (!bootPromise) {
    bootPromise = bootSession();
  }
  return bootPromise;
}

/** Re-run boot when the store was wiped but a persisted session flag/cookie remains. */
function ensureSessionPresent(): Promise<void> {
  const { me, hydrated } = useAuthStore.getState();
  if (me || !hasPersistedSession()) {
    return ensureBootSession();
  }
  if (!hydrated && bootPromise) {
    return bootPromise;
  }
  // Soft restore after tab/visibility: keep in-memory refresh; do not treat as cold boot.
  bootPromise = (async () => {
    try {
      const refresh = await hydrateRefresh();
      if (!refresh) {
        return;
      }
      const ok = await refreshSession();
      if (!ok) {
        return;
      }
      if (!useAuthStore.getState().me) {
        await loadMe();
      }
    } catch (err) {
      if (isUnauthorized(err)) {
        await revokeLocalSession();
      } else {
        debugLog('auth', 'soft session restore unavailable');
      }
    } finally {
      useAuthStore.getState().setHydrated(true);
    }
  })();
  return bootPromise;
}

export function SessionLifecycle() {
  const accessExpiresAt = useAuthStore((s) => s.accessExpiresAt);
  const [revoked, setRevoked] = useState(false);
  const retrying = useRef(false);

  useEffect(() => {
    void ensureBootSession();
  }, []);

  useEffect(() => {
    if (!accessExpiresAt) {
      return;
    }
    const wait = Math.max(1_000, accessExpiresAt - Date.now() - REFRESH_SKEW_MS);
    const timer = setTimeout(() => {
      void (async () => {
        if (retrying.current) {
          return;
        }
        retrying.current = true;
        try {
          const result = await refreshAccess('timer');
          if (result === 'unauthorized') {
            setRevoked(true);
          }
        } finally {
          retrying.current = false;
        }
      })();
    }, wait);
    return () => clearTimeout(timer);
  }, [accessExpiresAt]);

  useEffect(() => {
    const resume = (reason: string) => {
      if (!hasPersistedSession()) {
        return;
      }
      const exp = getAccessExpiresAt();
      const me = useAuthStore.getState().me;
      const due = !exp || !me || exp - Date.now() <= REFRESH_SKEW_MS;
      if (!due) {
        return;
      }
      if (retrying.current) {
        return;
      }
      retrying.current = true;
      void (async () => {
        try {
          if (!me) {
            await ensureSessionPresent();
            if (!useAuthStore.getState().me && hasPersistedSession()) {
              const result = await refreshAccess(reason);
              if (result === 'unauthorized') {
                setRevoked(true);
              }
            }
            return;
          }
          const result = await refreshAccess(reason);
          if (result === 'unauthorized') {
            setRevoked(true);
          }
        } finally {
          retrying.current = false;
        }
      })();
    };

    const onChange = (state: AppStateStatus) => {
      if (state === 'active') {
        resume('foreground');
      }
    };
    const sub = AppState.addEventListener('change', onChange);

    const onVisible = () => {
      if (Platform.OS === 'web' && globalThis.document?.visibilityState === 'visible') {
        resume('visibility');
      }
    };
    if (Platform.OS === 'web' && typeof globalThis.document !== 'undefined') {
      globalThis.document.addEventListener('visibilitychange', onVisible);
    }

    return () => {
      sub.remove();
      if (Platform.OS === 'web' && typeof globalThis.document !== 'undefined') {
        globalThis.document.removeEventListener('visibilitychange', onVisible);
      }
    };
  }, []);

  return (
    <Modal visible={revoked} transparent animationType="fade">
      <View className="flex-1 items-center justify-center bg-pitch-black/80 px-ds-24">
        <View className="w-full max-w-sm gap-ds-16 rounded-cards bg-surface p-ds-24">
          <Text variant="headingSm">Sesión cerrada</Text>
          <Text variant="muted">Vuelve a entrar para seguir.</Text>
          <Button
            onPress={() => {
              setRevoked(false);
              router.replace('/auth/login' as Href);
            }}>
            <Text>Entrar</Text>
          </Button>
        </View>
      </View>
    </Modal>
  );
}
