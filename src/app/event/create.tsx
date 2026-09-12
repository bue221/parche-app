import { EventWizard } from '@/components/event-wizard';
import { PendingAuth } from '@/components/feedback';
import { Screen } from '@/components/screen';
import { Text } from '@/components/ui/text';
import { useAuthSnapshot } from '@/data/session';
import { useRequireAuth } from '@/hooks/use-require-auth';

export default function EventCreateScreen() {
  const ok = useRequireAuth('/event/create');
  const { isPromoter } = useAuthSnapshot();

  if (!ok) {
    return <PendingAuth />;
  }
  if (!isPromoter) {
    return (
      <Screen back>
        <Text>Solo organizadores pueden crear fechas.</Text>
      </Screen>
    );
  }

  return <EventWizard mode="create" />;
}
