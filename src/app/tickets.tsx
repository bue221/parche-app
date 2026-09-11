import { Screen } from '@/components/screen';
import { Text } from '@/components/ui/text';
import { useTabVisibility } from '@/data/session';

export default function TicketsPlaceholderScreen() {
  const { auth } = useTabVisibility();

  return (
    <Screen>
      <Text variant="heading">Tiquetes</Text>
      <Text variant="lead" className="mt-ds-16">
        {auth.isLoggedIn
          ? 'Tu wallet aparece aquí cuando haya compras.'
          : 'Entra a tu cuenta para ver tiquetes.'}
      </Text>
    </Screen>
  );
}
