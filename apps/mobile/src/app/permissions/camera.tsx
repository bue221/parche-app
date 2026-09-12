import { router } from 'expo-router';
import { View } from 'react-native';

import { BackBar } from '@/components/back-bar';
import { PageHeader } from '@/components/page-header';
import { Screen } from '@/components/screen';
import { StickyCta } from '@/components/sticky-cta';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';

export default function CameraPermissionScreen() {
  return (
    <Screen
      footer={
        <StickyCta>
          <View className="gap-ds-8">
            <Button onPress={() => void api.device.setPermission('camera', 'granted').then(() => router.back())}>
              <Text>Permitir</Text>
            </Button>
            <Button
              variant="outline"
              onPress={() => void api.device.setPermission('camera', 'denied').then(() => router.back())}>
              <Text>Ahora no</Text>
            </Button>
          </View>
        </StickyCta>
      }>
      <BackBar />
      <PageHeader title="Cámara" lead="La puerta lee el código de tu tiquete. Si niegas, no hay scan." />
    </Screen>
  );
}
