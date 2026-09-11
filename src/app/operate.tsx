import { router, type Href } from 'expo-router';
import { View } from 'react-native';

import { EmptyState } from '@/components/feedback';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { getSnapshot } from '@/data/mock/store';
import { useAuthSnapshot } from '@/data/session';
import { statusLabel } from '@/lib/format';

export default function OperateHubScreen() {
  const { user, memberships, isPromoter, isAdmin } = useAuthSnapshot();
  const events = getSnapshot().events;

  if (!user) {
    return (
      <Screen>
        <Text>Entra para operar.</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text variant="heading">Operar</Text>
      {isPromoter ? (
        <Button className="mt-ds-16" onPress={() => router.push('/event/create' as Href)}>
          <Text>Crear fecha</Text>
        </Button>
      ) : null}
      {isAdmin ? (
        <Button variant="outline" className="mt-ds-8" onPress={() => router.push('/admin/queue' as Href)}>
          <Text>Cola admin</Text>
        </Button>
      ) : null}
      {memberships.length === 0 && isPromoter ? <EmptyState title="Crea tu primera fecha" /> : null}
      {memberships.map((m) => {
        const event = events.find((e) => e.id === m.eventId);
        const write = api.helpers.can(user.id, m.eventId, 'event.write');
        const tickets = api.helpers.can(user.id, m.eventId, 'event.tickets.manage');
        const members = api.helpers.can(user.id, m.eventId, 'event.members.manage');
        const door = api.helpers.can(user.id, m.eventId, 'event.door.scan');
        const metrics = api.helpers.can(user.id, m.eventId, 'event.metrics.read');
        return (
          <View key={m.id} className="mt-ds-24 gap-ds-8 border-t border-border pt-ds-16">
            <Text variant="subheading">{event?.name ?? m.eventId}</Text>
            <Text variant="muted">
              {m.role} · {event ? statusLabel(event.status) : ''}
            </Text>
            <Button variant="outline" onPress={() => router.push(`/event/${m.eventId}` as Href)}>
              <Text>Detalle</Text>
            </Button>
            {write ? (
              <Button variant="outline" onPress={() => router.push(`/event/${m.eventId}/edit` as Href)}>
                <Text>Editar</Text>
              </Button>
            ) : null}
            {tickets ? (
              <Button variant="outline" onPress={() => router.push(`/event/${m.eventId}/tickets` as Href)}>
                <Text>Tipos</Text>
              </Button>
            ) : null}
            {members ? (
              <Button variant="outline" onPress={() => router.push(`/event/${m.eventId}/members` as Href)}>
                <Text>Equipo</Text>
              </Button>
            ) : null}
            {door ? (
              <Button variant="outline" onPress={() => router.push(`/event/${m.eventId}/door` as Href)}>
                <Text>Puerta</Text>
              </Button>
            ) : null}
            {metrics ? (
              <Button variant="outline" onPress={() => router.push(`/event/${m.eventId}/metrics` as Href)}>
                <Text>Métricas</Text>
              </Button>
            ) : null}
          </View>
        );
      })}
    </Screen>
  );
}
