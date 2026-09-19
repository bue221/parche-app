import { router, type Href } from 'expo-router';
import { View } from 'react-native';

import { PendingAuth } from '@/components/feedback';
import { ProfileEditor } from '@/components/profile-editor';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useRequireAuth } from '@/hooks/use-require-auth';

export default function CompleteProfileScreen() {
  const ok = useRequireAuth('/parche/completar-perfil');
  if (!ok) {
    return <PendingAuth />;
  }

  return (
    <Screen back title="Completar perfil" lead="Opcional. Tu QR ya está listo.">
      <View className="mt-ds-24 gap-ds-16">
        <ProfileEditor onSaved={() => router.back()} />
        <Button variant="ghost" onPress={() => router.replace('/wallet' as Href)}>
          <Text>Más tarde</Text>
        </Button>
      </View>
    </Screen>
  );
}
