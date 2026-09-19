import { useLocalSearchParams } from 'expo-router';

import { AuthSplit } from '@/components/auth-split';
import { PasswordResetConfirm, PasswordResetRequest } from '@/components/password-recovery';
import { Text } from '@/components/ui/text';

function first(value?: string | string[]) {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? '';
}

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const token = first(params.token);

  if (token) {
    return (
      <AuthSplit title={'Nueva\nclave'} lead="El enlace es de un solo uso y caduca en 30 minutos.">
        <Text variant="headingSm">Elige una clave</Text>
        <PasswordResetConfirm token={token} />
      </AuthSplit>
    );
  }

  return (
    <AuthSplit title={'Recupera\nel acceso'} lead="Si hay cuenta con ese correo, te llega un enlace. No decimos si existe.">
      <Text variant="headingSm">Restablecer contraseña</Text>
      <PasswordResetRequest />
    </AuthSplit>
  );
}
