import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

import { buildEventStaffActions, canOperateEvent } from '@/components/event-staff-actions';
import { EndedEventNotice } from '@/components/ended-event-notice';
import { ErrorState, PendingAuth, Skeleton } from '@/components/feedback';
import { FlyerImage } from '@/components/flyer-image';
import { Screen } from '@/components/screen';
import { SettingsRow } from '@/components/settings-row';
import { Button } from '@/components/ui/button';
import { Tag } from '@/components/ui/tag';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { userMessage } from '@/data/errors';
import { useAuthSnapshot } from '@/data/session';
import { formatWhenRange, eventHasEnded, statusLabel } from '@/lib/format';
import { membershipRoleLabel } from '@/lib/profiles';
import { useRequireAuth } from '@/hooks/use-require-auth';

export default function EventOperateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ok = useRequireAuth(`/event/${id}/operate`);
  const { user, memberships } = useAuthSnapshot();
  const canOperate = user ? canOperateEvent(user.id, id) : false;
  const query = useQuery({
    queryKey: ['event', id],
    queryFn: () => api.events.get(id),
    enabled: Boolean(id) && ok,
  });

  useEffect(() => {
    if (ok && user && !canOperate) {
      router.replace(`/event/${id}` as Href);
    }
  }, [ok, user, canOperate, id]);

  if (!ok || !user) {
    return <PendingAuth />;
  }
  if (!canOperate) {
    return <PendingAuth />;
  }
  if (query.error && !query.data) {
    return (
      <Screen back headTitle="Este evento ya no está">
        <ErrorState message={userMessage(query.error) || 'Este evento ya no está'} onRetry={() => void query.refetch()} />
      </Screen>
    );
  }
  if (!query.data) {
    return (
      <Screen back headTitle="Operar">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-ds-16 h-12 w-full" />
        <Skeleton className="mt-ds-12 h-24 w-full" />
      </Screen>
    );
  }

  const event = query.data;
  const membership = memberships.find((row) => row.eventId === event.id && row.status === 'active');
  const role =
    membership?.role ??
    (api.helpers.can(user.id, event.id, 'event.write')
      ? 'manager'
      : api.helpers.can(user.id, event.id, 'event.door.scan')
        ? 'door'
        : 'metrics');
  const { primary, rest } = buildEventStaffActions({
    userId: user.id,
    eventId: event.id,
    role,
    event,
  });
  const ended = eventHasEnded(event);
  const lead = [event.venueName, formatWhenRange(event.startsAt, event.endsAt)].filter(Boolean).join(' · ');

  return (
    <Screen
      back
      title={event.name}
      lead={lead}
      headImage={event.flyerUrl}
      mark={
        event.flyerUrl ? (
          <View className="size-10 overflow-hidden rounded-full bg-muted">
            <FlyerImage uri={event.flyerUrl} className="h-full w-full" aspectRatio={1} />
          </View>
        ) : undefined
      }
      actions={
        <Button onPress={() => router.push(primary.href)}>
          <Text>{primary.label}</Text>
        </Button>
      }>
      <View className="mt-ds-8 max-w-xl gap-ds-24">
        <View className="flex-row flex-wrap gap-ds-8">
          <Tag tone="muted">{membershipRoleLabel(role)}</Tag>
          <Tag tone={event.status === 'published' ? 'aurora' : event.status === 'rejected' ? 'danger' : 'muted'}>
            {statusLabel(event.status)}
          </Tag>
          {ended ? <Tag tone="muted">Finalizado</Tag> : null}
        </View>

        {ended ? <EndedEventNotice /> : null}

        {rest.length > 0 ? (
          <View>
            {rest.map((action, index) => (
              <SettingsRow
                key={action.key}
                label={action.label}
                detail={action.detail}
                onPress={() => router.push(action.href)}
                divided={index < rest.length - 1}
              />
            ))}
          </View>
        ) : null}

        <Button variant="outline" onPress={() => router.push(`/event/${event.id}` as Href)}>
          <Text>Ver ficha pública</Text>
        </Button>
      </View>
    </Screen>
  );
}
