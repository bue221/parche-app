import { router } from 'expo-router';

import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';

export default function CameraPermissionScreen() {
  return (
    <Screen>
      <Text variant="heading">Cámara</Text>
      <Text className="mt-ds-16">
        La puerta lee el QR del tiquete. Si niegas, no hay scan. No pedimos cámara al instalar.
      </Text>
      <Button className="mt-ds-24" onPress={() => void api.device.setPermission('camera', 'granted').then(() => router.back())}>
        <Text>Permitir</Text>
      </Button>
      <Button
        variant="outline"
        className="mt-ds-8"
        onPress={() => void api.device.setPermission('camera', 'denied').then(() => router.back())}>
        <Text>Ahora no</Text>
      </Button>
    </Screen>
  );
}
