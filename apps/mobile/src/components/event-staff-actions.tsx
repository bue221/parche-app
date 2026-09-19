import { type Href } from 'expo-router';

import { api } from '@/data/client';
import type { EventWithExtras, MembershipRole } from '@/data/types';
import { eventHasEnded } from '@/lib/format';
import { isDraftListingIncomplete } from '@/lib/listing-setup';

export type StaffAction = {
  key: string;
  label: string;
  href: Href;
  detail?: string;
};

const STAFF_PERMS = [
  'event.write',
  'event.tickets.manage',
  'event.members.manage',
  'event.door.scan',
  'event.door.live',
  'event.metrics.read',
] as const;

export function canOperateEvent(userId: string, eventId: string): boolean {
  return STAFF_PERMS.some((permission) => api.helpers.can(userId, eventId, permission));
}

export function eventOperateHref(eventId: string): Href {
  return `/event/${eventId}/operate` as Href;
}

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
}): { primary: StaffAction; rest: StaffAction[] } {
  const write = api.helpers.can(userId, eventId, 'event.write');
  const tickets = api.helpers.can(userId, eventId, 'event.tickets.manage');
  const members = api.helpers.can(userId, eventId, 'event.members.manage');
  const door = api.helpers.can(userId, eventId, 'event.door.scan');
  const live = api.helpers.can(userId, eventId, 'event.door.live');
  const metrics = api.helpers.can(userId, eventId, 'event.metrics.read');
  const ended = event ? eventHasEnded(event) : false;
  const setup = write && !ended && isDraftListingIncomplete(event);

  const all: StaffAction[] = [];
  if (setup) {
    all.push({
      key: 'setup',
      label: 'Continuar setup',
      href: `/event/${eventId}/setup` as Href,
      detail: 'Flyer, pin, etapas y artistas',
    });
  }
  if (write && !ended) {
    all.push({
      key: 'edit',
      label: 'Editar',
      href: `/event/${eventId}/edit` as Href,
      detail: 'Flyer, datos y pin',
    });
  }
  if (write) {
    all.push({
      key: 'lineup',
      label: 'Artistas',
      href: `/event/${eventId}/lineup` as Href,
      detail: ended ? 'Quién tocó (consulta)' : 'Quién toca',
    });
    all.push({
      key: 'tracks',
      label: 'Tracks',
      href: `/event/${eventId}/tracks` as Href,
      detail: ended ? 'Audio de referencia (consulta)' : 'Audio de referencia',
    });
  }
  if (tickets) {
    all.push({
      key: 'tickets',
      label: 'Etapas',
      href: `/event/${eventId}/tickets` as Href,
      detail: ended ? 'Preventa, taquilla y cupos (consulta)' : 'Preventa, taquilla y cupos',
    });
  }
  if (members) {
    all.push({
      key: 'members',
      label: 'Equipo',
      href: `/event/${eventId}/members` as Href,
      detail: ended ? 'Staff del evento (consulta)' : 'Staff del evento',
    });
  }
  if (door && !ended) {
    all.push({
      key: 'door',
      label: 'Puerta',
      href: `/event/${eventId}/door` as Href,
      detail: 'Escanear ingresos',
    });
  }
  if (live) {
    all.push({
      key: 'live',
      label: 'Aforo',
      href: `/event/${eventId}/live` as Href,
      detail: 'Quién ya entró',
    });
  }
  if (metrics) {
    all.push({
      key: 'metrics',
      label: 'Métricas',
      href: `/event/${eventId}/metrics` as Href,
      detail: 'Ventas y puerta',
    });
  }

  const fallback: StaffAction = {
    key: 'preview',
    label: 'Ver ficha pública',
    href: `/event/${eventId}` as Href,
    detail: 'Como la ve el público',
  };
  const primaryKey = ended
    ? role === 'door' && live
      ? 'live'
      : metrics
        ? 'metrics'
        : live
          ? 'live'
          : all[0]?.key
    : role === 'door'
      ? 'door'
      : role === 'metrics'
        ? 'metrics'
        : setup
          ? 'setup'
          : write
            ? 'edit'
            : all[0]?.key;
  const primary = all.find((action) => action.key === primaryKey) ?? all[0] ?? fallback;
  const rest = all.filter((action) => action.key !== primary.key);
  return { primary, rest };
}
