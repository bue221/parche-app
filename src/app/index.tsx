import { Screen } from '@/components/screen';
import { Text } from '@/components/ui/text';

export default function AgendaPlaceholderScreen() {
  return (
    <Screen>
      <Text variant="heading">Agenda</Text>
      <Text variant="lead" className="mt-ds-16">
        Próximas fechas, flyers en lista. El listado llega con la agenda de producto.
      </Text>
    </Screen>
  );
}
