import { router, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Modal, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { debugLog } from '@/data/log';
import { useMockStore } from '@/data/mock/store';

const REFRESH_SKEW_MS = 90 * 1000;

export function SessionLifecycle() {
  const session = useMockStore((s) => s.session);
  const [revoked, setRevoked] = useState(false);
  const retrying = useRef(false);

  useEffect(() => {
    if (!session) {
      return;
    }
    const wait = Math.max(1_000, session.accessExpiresAt - Date.now() - REFRESH_SKEW_MS);
    const timer = setTimeout(() => {
      void (async () => {
        if (retrying.current) {
          return;
        }
        retrying.current = true;
        try {
          await api.auth.refresh();
          debugLog('auth', 'access refreshed');
        } catch {
          debugLog('auth', 'refresh failed, one retry');
          try {
            await api.auth.refresh();
          } catch {
            useMockStore.getState().setSession(null);
            setRevoked(true);
          }
        } finally {
          retrying.current = false;
        }
      })();
    }, wait);
    return () => clearTimeout(timer);
  }, [session]);

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
