import { router, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus, Modal, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useAuthStore } from '@/data/auth-store';
import { api } from '@/data/client';
import { ApiError } from '@/data/errors';
import { refreshSession, revokeLocalSession } from '@/data/http';
import { debugLog } from '@/data/log';
import { hydratePrintSeen } from '@/data/ticket-cache';
import { getAccessExpiresAt, hasPersistedSession, hydrateRefresh } from '@/data/token-store';

const REFRESH_SKEW_MS = 90 * 1000;

function isUnauthorized(err: unknown): boolean {
  return err instanceof ApiError && err.code === 'UNAUTHORIZED';
}

async function refreshAccess(reason: string): Promise<'ok' | 'unauthorized' | 'unavailable'> {
  try {
    await api.auth.refresh();
    debugLog('auth', `access refreshed (${reason})`);
    return 'ok';
  } catch (err) {
    if (isUnauthorized(err)) {
      return 'unauthorized';
    }
    debugLog('auth', 'refresh failed, one retry');
    try {
      await api.auth.refresh();
      debugLog('auth', `access refreshed after retry (${reason})`);
      return 'ok';
    } catch (err2) {
      if (isUnauthorized(err2)) {
        return 'unauthorized';
      }
      return 'unavailable';
    }
  }
}

export function SessionLifecycle() {
  const accessExpiresAt = useAuthStore((s) => s.accessExpiresAt);
  const [revoked, setRevoked] = useState(false);
  const retrying = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await hydratePrintSeen();
        const refresh = await hydrateRefresh();
        if (!refresh) {
          return;
        }
        const ok = await refreshSession();
        if (!ok) {
          return;
        }
        try {
          await api.auth.me();
          useAuthStore.getState().setAccessExpiresAt(getAccessExpiresAt());
        } catch (err) {
          if (isUnauthorized(err)) {
            await revokeLocalSession();
          }
        }
      } catch (err) {
        debugLog('auth', isUnauthorized(err) ? 'boot session revoked' : 'boot refresh unavailable');
      } finally {
        if (!cancelled) {
          useAuthStore.getState().setHydrated(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
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
    const onChange = (state: AppStateStatus) => {
      if (state !== 'active') {
        return;
      }
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
          const result = await refreshAccess('foreground');
          if (result === 'unauthorized') {
            setRevoked(true);
          }
        } finally {
          retrying.current = false;
        }
      })();
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, []);

  return (
    <Modal visible={revoked} transparent animationType="fade">
      <View className="flex-1 items-center justify-center bg-pitch-black/80 px-ds-24">
        <View className="w-full max-w-sm gap-ds-16 rounded-cards bg-background p-ds-24">
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
