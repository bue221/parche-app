import { Screen } from '@/components/screen';
import { Text } from '@/components/ui/text';
import { useAuthSnapshot } from '@/data/session';

export default function OperatePlaceholderScreen() {
  const { memberships, isPromoter } = useAuthSnapshot();

  return (
    <Screen>
      <Text variant="heading">Operar</Text>
      <Text variant="lead" className="mt-ds-16">
        {isPromoter
          ? 'Crea y opera tus fechas desde aquí.'
          : `Membresías activas: ${memberships.length}. Cada evento muestra solo lo que tu rol permite.`}
      </Text>
    </Screen>
  );
}
