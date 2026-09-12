import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';

import { BackBar } from '@/components/back-bar';
import { Field } from '@/components/field';
import { PendingAuth } from '@/components/feedback';
import { PageHeader } from '@/components/page-header';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { userMessage } from '@/data/errors';
import { toast } from '@/data/toast-store';
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
  const [permission, requestPermission] = useCameraPermissions();
  const [token, setToken] = useState('');
  const [result, setResult] = useState<CheckInCode | null>(null);
  const [occupancy, setOccupancy] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const scanning = useRef(false);

  useEffect(() => {
    if (!result) return;
    const t = setTimeout(() => setResult(null), 1500);
    return () => clearTimeout(t);
  }, [result]);

  const lastScan = useRef(0);

  async function scan(value: string) {
    if (scanning.current || !value) return;
    if (Date.now() - lastScan.current < 1600) return;
    lastScan.current = Date.now();
    scanning.current = true;
    try {
      const res = await api.door.checkIn(id, value);
      if (res.code === 'forbidden') {
        router.replace('/operate' as Href);
        return;
      }
      setResult(res.code);
      setOccupancy(res.occupancy);
    } catch (err) {
      const message = userMessage(err);
      setError(message);
      toast(message);
    } finally {
      scanning.current = false;
    }
  }

  if (!ok) {
    return <PendingAuth />;
  }
  if (user && !api.helpers.can(user.id, id, 'event.door.scan')) {
    return (
      <Screen back>
        <Text>Métricas no abre el scanner.</Text>
      </Screen>
    );
  }

  const cameraReady = permission?.granted;

  return (
    <Screen>
      <BackBar />
      <PageHeader title="Puerta" lead={`Aforo ${occupancy}`} />
      <View className="mt-ds-16 min-h-[320px] overflow-hidden rounded-images bg-pitch-black">
        {cameraReady ? (
          <CameraView
            style={{ height: 320 }}
            barcodeScannerSettings={{ barcodeTypes: ['code128'] }}
            onBarcodeScanned={(scanResult) => {
              void scan(scanResult.data);
            }}
          />
        ) : (
          <View className="h-[320px] items-center justify-center px-ds-16">
            <Text className="text-center text-paper-white">
              {Platform.OS === 'web' ? 'Cámara del browser, o pega el código abajo' : 'Necesitamos la cámara para leer el código'}
            </Text>
            <Button className="mt-ds-16" onPress={() => void requestPermission()}>
              <Text>Permitir cámara</Text>
            </Button>
          </View>
        )}
      </View>
      {result ? (
        <View className={`mt-ds-16 items-center rounded-cards py-ds-40 ${result === 'approved' ? 'bg-confirm' : 'bg-muted'}`}>
          <Text className="font-foggy text-[56px] uppercase leading-none text-pitch-black">{COPY[result]}</Text>
        </View>
      ) : null}
      <Field label="Código (web / demo)" value={token} onChangeText={setToken} />
      {error ? <Text className="mt-ds-8">{error}</Text> : null}
      <Button className="mt-ds-16" onPress={() => void scan(token)}>
        <Text>Escanear</Text>
      </Button>
      <Button variant="outline" className="mt-ds-8" onPress={() => router.push(`/event/${id}/live` as Href)}>
        <Text>Aforo en vivo</Text>
      </Button>
    </Screen>
  );
}
