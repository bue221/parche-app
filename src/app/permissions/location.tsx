import { router } from 'expo-router';

import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';

export default function LocationPermissionScreen() {
  return (
    <Screen>
      <Text variant="heading">Ubicación</Text>
      <Text className="mt-ds-16">
        La usamos solo para centrar el mapa o soltar el pin más rápido. Agenda funciona sin GPS.
      </Text>
      <Button className="mt-ds-24" onPress={() => void api.device.setPermission('location', 'granted').then(() => router.back())}>
        <Text>Permitir</Text>
      </Button>
      <Button
        variant="outline"
        className="mt-ds-8"
        onPress={() => void api.device.setPermission('location', 'denied').then(() => router.back())}>
        <Text>Ahora no</Text>
      </Button>
    </Screen>
  );
}
