import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import type { EventWithExtras, MembershipRole } from '@/data/types';
import { isDraftListingIncomplete } from '@/lib/listing-setup';

export type StaffAction = {
  key: string;
  label: string;
  href: Href;
};

export function buildEventStaffActions({
  userId,
  eventId,
  role,
  event,
}: {
  userId: string;
  eventId: string;
  role: MembershipRole;
  event?: EventWithExtras;
}): { primary: StaffAction; overflow: StaffAction[] } {
  const write = api.helpers.can(userId, eventId, 'event.write');
  const tickets = api.helpers.can(userId, eventId, 'event.tickets.manage');
  const members = api.helpers.can(userId, eventId, 'event.members.manage');
  const door = api.helpers.can(userId, eventId, 'event.door.scan');
  const live = api.helpers.can(userId, eventId, 'event.door.live');
  const metrics = api.helpers.can(userId, eventId, 'event.metrics.read');
  const setup = write && isDraftListingIncomplete(event);

  const all: StaffAction[] = [];
  all.push({ key: 'detail', label: 'Detalle', href: `/event/${eventId}` as Href });
  if (setup) {
    all.push({ key: 'setup', label: 'Continuar setup', href: `/event/${eventId}/setup` as Href });
  }
  if (write) {
    all.push({ key: 'edit', label: 'Editar', href: `/event/${eventId}/edit` as Href });
    all.push({ key: 'lineup', label: 'Lineup', href: `/event/${eventId}/lineup` as Href });
    all.push({ key: 'tracks', label: 'Tracks', href: `/event/${eventId}/tracks` as Href });
  }
  if (tickets) {
    all.push({ key: 'tickets', label: 'Tipos', href: `/event/${eventId}/tickets` as Href });
  }
  if (members) {
    all.push({ key: 'members', label: 'Equipo', href: `/event/${eventId}/members` as Href });
  }
  if (door) {
    all.push({ key: 'door', label: 'Puerta', href: `/event/${eventId}/door` as Href });
  }
  if (live) {
    all.push({ key: 'live', label: 'Aforo', href: `/event/${eventId}/live` as Href });
  }
  if (metrics) {
    all.push({ key: 'metrics', label: 'Métricas', href: `/event/${eventId}/metrics` as Href });
  }

  const primaryKey =
    role === 'door' ? 'door' : role === 'metrics' ? 'metrics' : setup ? 'setup' : write ? 'edit' : all[0]?.key;
  const primary = all.find((action) => action.key === primaryKey) ?? all[0];
  const overflow = all.filter((action) => action.key !== primary.key);
  return { primary, overflow };
}

export function EventStaffPrimary({
  action,
  overflow,
}: {
  action: StaffAction;
  overflow: StaffAction[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <View className="gap-ds-8">
      <View className="flex-row flex-wrap gap-ds-8">
        <Button onPress={() => router.push(action.href)}>
          <Text>{action.label}</Text>
        </Button>
        {overflow.length > 0 ? (
          <Button variant="outline" onPress={() => setOpen(true)}>
            <Text>Más</Text>
          </Button>
        ) : null}
      </View>
      <EventStaffSheet visible={open} onClose={() => setOpen(false)} actions={overflow} />
    </View>
  );
}

export function EventStaffSheet({
  visible,
  onClose,
  actions,
  title = 'Más acciones',
}: {
  visible: boolean;
  onClose: () => void;
  actions: StaffAction[];
  title?: string;
}) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      <View className="gap-ds-8 pb-ds-8">
        {actions.map((action) => (
          <Button
            key={action.key}
            variant="outline"
            onPress={() => {
              onClose();
              router.push(action.href);
            }}>
            <Text>{action.label}</Text>
          </Button>
        ))}
      </View>
    </BottomSheet>
  );
}
