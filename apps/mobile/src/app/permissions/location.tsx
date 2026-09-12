import { router } from 'expo-router';
import { View } from 'react-native';

import { BackBar } from '@/components/back-bar';
import { PageHeader } from '@/components/page-header';
import { Screen } from '@/components/screen';
import { StickyCta } from '@/components/sticky-cta';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';

export default function LocationPermissionScreen() {
  return (
    <Screen
      footer={
        <StickyCta>
          <View className="gap-ds-8">
            <Button onPress={() => void api.device.setPermission('location', 'granted').then(() => router.back())}>
              <Text>Permitir</Text>
            </Button>
            <Button
              variant="outline"
              onPress={() => void api.device.setPermission('location', 'denied').then(() => router.back())}>
              <Text>Ahora no</Text>
            </Button>
          </View>
        </StickyCta>
      }>
      <BackBar />
      <PageHeader title="Ubicación" lead="Solo para centrar el mapa. La agenda funciona sin GPS." />
    </Screen>
  );
}
