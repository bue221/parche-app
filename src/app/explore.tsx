import { Screen } from '@/components/screen';
import { Text } from '@/components/ui/text';

export default function ExplorePlaceholderScreen() {
  return (
    <Screen>
      <Text variant="heading">Explorar</Text>
      <Text variant="lead" className="mt-ds-16">
        Pines de fechas publicadas sobre un mapa OSM. Sin Google.
      </Text>
    </Screen>
  );
}
