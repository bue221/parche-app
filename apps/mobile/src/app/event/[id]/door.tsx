import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Field } from '@/components/field';
import { PendingAuth } from '@/components/feedback';
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

const SCAN_TYPES = ['qr', 'code128'] as const;
const CAMERA_BLOCKED =
  'El navegador bloqueó la cámara. Ábrela en el candado de la barra o pega el código.';

async function requestWebCamera(): Promise<boolean> {
  const media = globalThis.navigator?.mediaDevices;
  if (!media?.getUserMedia) {
    throw new Error('unsupported');
  }
  const stream = await media.getUserMedia({
    video: { facingMode: { ideal: 'environment' } },
  });
  stream.getTracks().forEach((track) => track.stop());
  return true;
}

export default function DoorScannerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ok = useRequireAuth(`/event/${id}/door`);
  const { user } = useAuthSnapshot();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [webGranted, setWebGranted] = useState(false);
  const [asking, setAsking] = useState(false);
  const [token, setToken] = useState('');
  const [manual, setManual] = useState(false);
  const [result, setResult] = useState<CheckInCode | null>(null);
  const [occupancy, setOccupancy] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const scanning = useRef(false);
  const lastScan = useRef(0);

  useEffect(() => {
    if (!ok || !id) return;
    let cancelled = false;
    void api.door
      .live(id)
      .then((live) => {
        if (!cancelled) setOccupancy(live.checkIns);
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn('door.live', err);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [ok, id]);

  async function scan(value: string) {
    const payload = value.trim();
    if (scanning.current || !payload) return;
    if (Date.now() - lastScan.current < 1600) return;
    lastScan.current = Date.now();
    scanning.current = true;
    setError(null);
    try {
      const res = await api.door.checkIn(id, payload);
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
      <View className="flex-1 items-center justify-center bg-background px-ds-24">
        <Text>Métricas no abre el scanner.</Text>
      </View>
    );
  }

  const cameraReady = Boolean(permission?.granted || webGranted);
  const scanningEnabled = cameraReady && !result && !manual;

  async function askCamera() {
    if (asking) return;
    setAsking(true);
    try {
      if (Platform.OS === 'web') {
        await requestWebCamera();
        setWebGranted(true);
      }
      const res = await requestPermission();
      if (!res?.granted && Platform.OS !== 'web') {
        toast(CAMERA_BLOCKED);
      }
    } catch (err) {
      const name = err instanceof Error ? err.name : '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        toast(CAMERA_BLOCKED);
      } else if (err instanceof Error && err.message === 'unsupported') {
        toast('Este navegador no puede abrir la cámara. Pega el código.');
      } else {
        toast('No pudimos abrir la cámara. Pega el código o prueba en otro navegador.');
        console.warn('camera.permission', err);
      }
    } finally {
      setAsking(false);
    }
  }

  function goBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/operate' as Href);
  }

  function resumeScan() {
    lastScan.current = 0;
    setResult(null);
  }

  return (
    <View className="flex-1 bg-pitch-black">
      {cameraReady && !manual ? (
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: [...SCAN_TYPES] }}
          onBarcodeScanned={
            scanningEnabled
              ? (scanResult) => {
                  void scan(scanResult.data);
                }
              : undefined
          }
        />
      ) : (
        <View className="flex-1 bg-pitch-black" />
      )}

      <View className="absolute inset-0" style={{ pointerEvents: 'box-none' }}>
        <View className="px-ds-16" style={{ paddingTop: Math.max(insets.top, 12) }}>
          <View className="flex-row items-center justify-between">
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={goBack}
              className="min-h-11 items-start justify-center py-ds-8 active:opacity-70">
              <Text className="font-favorit text-caption font-bold uppercase tracking-favorit text-paper-white">
                ← Volver
              </Text>
            </Pressable>
            <Text className="font-favorit text-caption font-bold uppercase tracking-favorit text-paper-white">
              Aforo {occupancy}
            </Text>
          </View>
        </View>

        {scanningEnabled ? (
          <View className="flex-1 items-center justify-center" style={{ pointerEvents: 'none' }}>
            <View className="h-52 w-52 rounded-cards border-2 border-paper-white" />
            <Text className="mt-ds-16 font-favorit text-caption font-bold uppercase tracking-favorit text-paper-white">
              QR o código de barras
            </Text>
          </View>
        ) : !cameraReady && !manual ? (
          <View className="flex-1 items-center justify-center px-ds-24">
            <Text className="text-center text-paper-white">
              {Platform.OS === 'web'
                ? 'Permite la cámara o pega el código abajo'
                : 'Necesitamos la cámara para leer el código'}
            </Text>
            <Button
              className="mt-ds-16 bg-paper-white"
              disabled={asking}
              onPress={() => void askCamera()}>
              <Text className="text-pitch-black">{asking ? 'Pidiendo permiso…' : 'Permitir cámara'}</Text>
            </Button>
          </View>
        ) : (
          <View className="flex-1" style={{ pointerEvents: 'none' }} />
        )}

        {result ? (
          <View
            className={`absolute inset-0 ${result === 'approved' ? 'bg-confirm' : result === 'duplicate' ? 'bg-amber' : 'bg-danger'}`}>
            <View className="px-ds-16" style={{ paddingTop: Math.max(insets.top, 12) }}>
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                onPress={goBack}
                className="min-h-11 self-start items-start justify-center py-ds-8 active:opacity-70">
                <Text className="font-favorit text-caption font-bold uppercase tracking-favorit text-pitch-black">
                  ← Volver
                </Text>
              </Pressable>
            </View>
            <View className="flex-1 items-center justify-center px-ds-24">
              <Text className="text-center font-foggy text-[64px] uppercase leading-none text-pitch-black">
                {COPY[result]}
              </Text>
              <Text className="mt-ds-16 font-favorit text-caption font-bold uppercase tracking-favorit text-pitch-black">
                Aforo {occupancy}
              </Text>
            </View>
            <View className="px-ds-24" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
              <Button onPress={resumeScan}>
                <Text>Continuar</Text>
              </Button>
            </View>
          </View>
        ) : null}

        {!result ? (
          <KeyboardStickyView enabled={Platform.OS !== 'web'}>
            <View className="px-ds-16" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
              {manual ? (
                <View className="mb-ds-12 rounded-cards bg-paper-white p-ds-16">
                  <Field label="Código" value={token} onChangeText={setToken} autoCapitalize="none" />
                  {error ? (
                    <Text variant="helper" className="mt-ds-8 text-pitch-black">
                      {error}
                    </Text>
                  ) : null}
                  <Button className="mt-ds-12" onPress={() => void scan(token)}>
                    <Text>Escanear</Text>
                  </Button>
                </View>
              ) : error ? (
                <Text className="mb-ds-8 text-center text-paper-white">{error}</Text>
              ) : null}
              <Button
                variant="outline"
                className="border-paper-white"
                onPress={() => {
                  setManual((open) => !open);
                  setError(null);
                }}>
                <Text className="text-paper-white">{manual ? 'Usar cámara' : 'Pegar código'}</Text>
              </Button>
              <Button
                variant="ghost"
                className="mt-ds-8 active:bg-white/10"
                onPress={() => router.push(`/event/${id}/live` as Href)}>
                <Text className="text-paper-white">Aforo en vivo</Text>
              </Button>
            </View>
          </KeyboardStickyView>
        ) : null}
      </View>
    </View>
  );
}
