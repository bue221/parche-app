import { Link } from 'expo-router';

import { Screen } from '@/components/screen';
import { Text } from '@/components/ui/text';

export default function NotFoundScreen() {
  return (
    <Screen center contentClassName="gap-ds-16">
      <Text variant="caption" className="uppercase text-muted-foreground">
        404
      </Text>
      <Text variant="heading" className="text-center">
        Esta página no está
      </Text>
      <Link href="/" className="rounded-buttons bg-primary px-[22px] py-3">
        <Text className="text-caption font-bold uppercase tracking-favorit text-primary-foreground">
          Volver a Parche
        </Text>
      </Link>
    </Screen>
  );
}
