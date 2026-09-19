import { router } from 'expo-router';
import { View } from 'react-native';

import { PendingAuth } from '@/components/feedback';
import { ProfileEditor } from '@/components/profile-editor';
import { Screen } from '@/components/screen';
import { useRequireAuth } from '@/hooks/use-require-auth';

export default function EditProfileScreen() {
  const ok = useRequireAuth('/parche/editar');
  if (!ok) {
    return <PendingAuth />;
  }

  return (
    <Screen back title="Editar perfil" lead="Nombre, teléfono y foto. El email se ve, no se cambia.">
      <View className="mt-ds-24">
        <ProfileEditor onSaved={() => router.back()} />
      </View>
    </Screen>
  );
}
