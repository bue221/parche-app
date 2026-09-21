import { View } from 'react-native';

import { PendingAuth } from '@/components/feedback';
import { PasswordResetRequest } from '@/components/password-recovery';
import { Screen } from '@/components/screen';
import { useAuthSnapshot } from '@/data/session';
import { useRequireAuth } from '@/hooks/use-require-auth';

export default function ProfilePasswordScreen() {
  const ok = useRequireAuth('/parche/contrasena');
  const { user } = useAuthSnapshot();
  if (!ok || !user) {
    return <PendingAuth />;
  }

  return (
    <Screen back width="form" title="Restablecer contraseña" lead="Te enviamos un enlace al correo de la cuenta. No pedimos la clave actual.">
      <View className="mt-ds-24 max-w-xl">
        <PasswordResetRequest initialEmail={user.email} emailLocked />
      </View>
    </Screen>
  );
}
