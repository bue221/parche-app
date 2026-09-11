import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { Field } from '@/components/field';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { userMessage } from '@/data/errors';
import { useAuthSnapshot } from '@/data/session';
import { useRequireAuth } from '@/hooks/use-require-auth';
import type { CheckInCode } from '@/data/types';

const COPY: Record<CheckInCode, string> = {
  approved: 'PASA',
  duplicate: 'YA USADO',
  invalid: 'INVÁLIDO',
  wrong_event: 'OTRO EVENTO',
  expired: 'VENCIDO',
  forbidden: 'SIN PERMISO',
};

export default function DoorScannerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ok = useRequireAuth(`/event/${id}/door`);
  const { user } = useAuthSnapshot();
  const camera = api.device.getPermissions().camera;
  const [token, setToken] = useState('');
  const [result, setResult] = useState<CheckInCode | null>(null);
  const [occupancy, setOccupancy] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const scanning = useRef(false);

  useEffect(() => {
    if (!result) {
      return;
    }
    const t = setTimeout(() => setResult(null), 1500);
    return () => clearTimeout(t);
  }, [result]);

  if (!ok) {
    return null;
  }
  if (user && !api.helpers.can(user.id, id, 'event.door.scan')) {
    return (
      <Screen>
        <Text>Métricas no abre el scanner.</Text>
      </Screen>
    );
  }
  if (camera !== 'granted') {
    return (
      <Screen>
        <Text variant="heading">Cámara</Text>
        <Text className="mt-ds-16">Necesitamos la cámara para leer el QR en la puerta.</Text>
        <Button className="mt-ds-16" onPress={() => router.push('/permissions/camera' as Href)}>
          <Text>Continuar</Text>
        </Button>
      </Screen>
    );
  }

  return (
    <Screen>
      <View className="min-h-[240px] items-center justify-center rounded-cards bg-pitch-black">
        <Text className="text-paper-white">Cámara mock</Text>
        <Text variant="caption" className="mt-ds-8 text-paper-white">
          Aforo {occupancy}
        </Text>
      </View>
      {result ? (
        <View className={`mt-ds-16 items-center py-ds-32 ${result === 'approved' ? 'bg-confirm' : 'bg-muted'}`}>
          <Text variant="heading">{COPY[result]}</Text>
        </View>
      ) : null}
      <Field label="Token (web / demo)" value={token} onChangeText={setToken} />
      {error ? <Text>{error}</Text> : null}
      <Button
        className="mt-ds-16"
        onPress={() => {
          if (scanning.current) {
            return;
          }
          scanning.current = true;
          void api.door
            .checkIn(id, token)
            .then((res) => {
              if (res.code === 'forbidden') {
                router.replace('/operate' as Href);
                return;
              }
              setResult(res.code);
              setOccupancy(res.occupancy);
            })
            .catch((err) => setError(userMessage(err)))
            .finally(() => {
              scanning.current = false;
            });
        }}>
        <Text>Escanear</Text>
      </Button>
      <Button variant="outline" className="mt-ds-8" onPress={() => router.push(`/event/${id}/live` as Href)}>
        <Text>Aforo en vivo</Text>
      </Button>
    </Screen>
  );
}
