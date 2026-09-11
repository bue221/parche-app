import { Link, type Href } from 'expo-router';
import { View } from 'react-native';

import { Screen } from '@/components/screen';
import { Text } from '@/components/ui/text';
import { useAuthSnapshot } from '@/data/session';

export default function ParchePlaceholderScreen() {
  const { isLoggedIn, user } = useAuthSnapshot();

  return (
    <Screen>
      <Text variant="heading">Parche</Text>
      {isLoggedIn ? (
        <Text variant="lead" className="mt-ds-16">
          Hola {user?.displayName}. El perfil completo vive en esta pestaña.
        </Text>
      ) : (
        <View className="mt-ds-16 gap-ds-16">
          <Text variant="lead">Entra o crea cuenta para wallet, follows y fechas propias.</Text>
          <Link href={'/auth/login' as Href}>
            <Text variant="small" className="font-bold uppercase">
              Entrar
            </Text>
          </Link>
          <Link href={'/auth/register' as Href}>
            <Text variant="small" className="font-bold uppercase">
              Crear cuenta
            </Text>
          </Link>
        </View>
      )}
    </Screen>
  );
}
