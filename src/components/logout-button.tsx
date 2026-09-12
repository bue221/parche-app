import { router, type Href } from 'expo-router';
import { Pressable } from 'react-native';

import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { useAuthSnapshot } from '@/data/session';
import { cn } from '@/lib/utils';

export function LogoutButton({ className }: { className?: string }) {
  const { isLoggedIn } = useAuthSnapshot();
  if (!isLoggedIn) {
    return null;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Cerrar sesión"
      hitSlop={8}
      onPress={() => {
        void api.auth.logout().then(() => router.replace('/' as Href));
      }}
      className={cn('min-h-11 items-center justify-center px-ds-8', className)}>
      <Text variant="caption" className="font-bold uppercase">
        Cerrar sesión
      </Text>
    </Pressable>
  );
}
