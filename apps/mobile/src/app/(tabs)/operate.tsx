import { useQueries } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { View } from 'react-native';

import { EventCard, EventFeed } from '@/components/event-card';
import { EventStaffPrimary, buildEventStaffActions } from '@/components/event-staff-actions';
import { EmptyState, ListingSkeleton } from '@/components/feedback';
import { FadeSlideIn } from '@/components/motion';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Tag } from '@/components/ui/tag';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { useAuthSnapshot, usePrimaryProfile } from '@/data/session';
import type { EventWithExtras, Membership, ParcheEvent } from '@/data/types';
import { statusLabel } from '@/lib/format';
import { membershipRoleLabel } from '@/lib/profiles';

export default function OperateHubScreen() {
  const { user, memberships, isPromoter, isAdmin } = useAuthSnapshot();
  const { density } = usePrimaryProfile();
  const details = useQueries({
    queries: memberships.map((m) => ({
      queryKey: ['event', m.eventId],
      queryFn: () => api.events.get(m.eventId),
      enabled: Boolean(user),
    })),
  });

  if (!user) {
    return (
      <Screen title="Operar" lead="Entra para ver tus fechas." />
    );
  }

  const rows = memberships.map((membership, index) => ({
    membership,
    event: details[index]?.data as EventWithExtras | undefined,
    loading: details[index]?.isLoading,
  }));
  const tonight = density === 'door' ? pickTonight(rows) : null;
  const rest = tonight ? rows.filter((row) => row.membership.id !== tonight.membership.id) : rows;
  const ordered = tonight ? [tonight, ...rest] : rest;

  const lead =
    density === 'door'
      ? 'La próxima puerta.'
      : density === 'metrics'
        ? 'Números de tus fechas.'
        : 'Tus fechas. Flyer primero, luego boleta.';

  return (
    <Screen
      title="Operar"
      lead={lead}
      actions={
        <>
          {isPromoter ? (
            <Button onPress={() => router.push('/event/create' as Href)}>
              <Text>Crear fecha</Text>
            </Button>
          ) : null}
          {isAdmin ? (
            <Button variant="outline" onPress={() => router.push('/admin/queue' as Href)}>
              <Text>Cola admin</Text>
            </Button>
          ) : null}
        </>
      }>
      <View className="mt-ds-24 gap-ds-24">
        {memberships.length === 0 && isPromoter ? (
          <EmptyState
            title="Crea tu primera fecha"
            lead="Flyer, pin y boleta en un solo flujo."
            actionLabel="Crear fecha"
            onAction={() => router.push('/event/create' as Href)}
          />
        ) : null}
        {memberships.length === 0 && !isPromoter ? (
          <EmptyState
            title={density === 'metrics' ? 'Sin fechas con números todavía' : 'Cuando te inviten, escaneas aquí'}
            lead={density === 'metrics' ? 'Las métricas aparecen cuando te sumen a una fecha.' : 'Cada quien entra con su cuenta. Nada de login compartido.'}
          />
        ) : null}
        {ordered.length > 0 ? (
          <EventFeed>
            {ordered.map((row, index) => (
              <FadeSlideIn key={row.membership.id} index={index} className="w-full">
                <OperateEventBlock
                  userId={user.id}
                  membership={row.membership}
                  event={row.event}
                  loading={row.loading}
                />
              </FadeSlideIn>
            ))}
          </EventFeed>
        ) : null}
      </View>
    </Screen>
  );
}

function OperateEventBlock({
  userId,
  membership,
  event,
  loading,
}: {
  userId: string;
  membership: Membership;
  event?: EventWithExtras;
  loading?: boolean;
}) {
  if (loading && !event) {
    return <ListingSkeleton />;
  }
  const cardEvent = event ?? placeholderEvent(membership.eventId);
  const { primary, overflow } = buildEventStaffActions({
    userId,
    eventId: membership.eventId,
    role: membership.role,
    event,
  });

  return (
    <View className="w-full gap-ds-12">
      <EventCard
        event={cardEvent}
        onPress={() => router.push(`/event/${membership.eventId}` as Href)}
      />
      <View className="flex-row flex-wrap gap-ds-8">
        <Tag tone="muted">{membershipRoleLabel(membership.role)}</Tag>
        {event ? <Tag tone="muted">{statusLabel(event.status)}</Tag> : null}
      </View>
      <EventStaffPrimary action={primary} overflow={overflow} />
    </View>
  );
}

function pickTonight(rows: { membership: Membership; event?: EventWithExtras; loading?: boolean }[]) {
  const now = Date.now() - 12 * 60 * 60 * 1000;
  const ranked = rows
    .filter((row) => row.membership.role === 'door' && row.event)
    .map((row) => ({ ...row, at: Date.parse(row.event!.startsAt) }))
    .sort((a, b) => a.at - b.at);
  return ranked.find((row) => row.at >= now) ?? ranked[0] ?? null;
}

function placeholderEvent(id: string): ParcheEvent {
  return {
    id,
    tenantId: '',
    ownerUserId: '',
    name: 'Fecha',
    startsAt: new Date().toISOString(),
    venueName: '',
    addressText: '',
    description: '',
    status: 'draft',
    genre: 'techno',
    updatedAt: new Date().toISOString(),
  };
}
