import { useQueries } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { Archive, Calendar, CalendarDays, LayoutGrid, PenLine } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { Chip, ChipRow } from '@/components/chip-row';
import { CreateEventFab } from '@/components/create-event-fab';
import { EventCard, EventFeed } from '@/components/event-card';
import { eventOperateHref } from '@/components/event-staff-actions';
import { EmptyState, ListingSkeleton } from '@/components/feedback';
import { FadeSlideIn } from '@/components/motion';
import { PageHeader } from '@/components/page-header';
import { Screen } from '@/components/screen';
import { SearchBar } from '@/components/search-bar';
import { Button } from '@/components/ui/button';
import { Tag } from '@/components/ui/tag';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { useAuthSnapshot, usePrimaryProfile } from '@/data/session';
import type { EventStatus, EventWithExtras, Membership, ParcheEvent } from '@/data/types';
import { eventHasEnded, eventIsThisWeek, statusLabel } from '@/lib/format';
import { membershipRoleLabel } from '@/lib/profiles';

type OperateRow = {
  membership: Membership;
  event?: EventWithExtras;
  loading?: boolean;
};

type OperateBucket = 'week' | 'upcoming' | 'drafts' | 'ended';
type OperateFilter = 'all' | OperateBucket;

const BUCKETS: {
  key: OperateBucket;
  title: string;
  lead: string;
  empty: string;
  icon: typeof Calendar;
}[] = [
  { key: 'week', title: 'Esta semana', lead: 'Lo que opera ahora.', empty: 'Nada en los próximos 7 días.', icon: Calendar },
  { key: 'upcoming', title: 'Más adelante', lead: 'Publicados con fecha más lejana.', empty: 'No hay fechas más adelante.', icon: CalendarDays },
  { key: 'drafts', title: 'Borradores', lead: 'Aún no salen al público.', empty: 'No hay listings por publicar.', icon: PenLine },
  { key: 'ended', title: 'Finalizados', lead: 'Consulta. Ya no se editan.', empty: 'Todavía no hay noches cerradas.', icon: Archive },
];

export default function OperateHubScreen() {
  const { user, memberships, isPromoter, isAdmin } = useAuthSnapshot();
  const { density } = usePrimaryProfile();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<OperateFilter>('all');
  const details = useQueries({
    queries: memberships.map((m) => ({
      queryKey: ['event', m.eventId],
      queryFn: () => api.events.get(m.eventId),
      enabled: Boolean(user),
    })),
  });

  const rows = useMemo(
    () =>
      memberships.map((membership, index) => ({
        membership,
        event: details[index]?.data as EventWithExtras | undefined,
        loading: details[index]?.isLoading,
      })),
    [details, memberships]
  );

  const tonight = density === 'door' ? pickTonight(rows) : null;
  const filtered = useMemo(() => rows.filter((row) => matchesOperateQuery(row, query)), [query, rows]);
  const grouped = useMemo(() => groupOperateRows(filtered), [filtered]);
  const loadingRows = filtered.filter((row) => row.loading && !row.event);
  const visibleBuckets = BUCKETS.filter((bucket) => grouped[bucket.key].length > 0);
  const visibleCount =
    (filter === 'all' ? visibleBuckets : visibleBuckets.filter((bucket) => bucket.key === filter)).reduce(
      (sum, bucket) => sum + grouped[bucket.key].length,
      0
    ) + (filter === 'all' || filter === 'drafts' ? loadingRows.length : 0);

  if (!user) {
    return <Screen title="Operar" lead="Entra para ver tus eventos." />;
  }

  const lead =
    density === 'door' ? 'La próxima puerta.' : density === 'metrics' ? 'Números de tus eventos.' : 'Tus eventos.';

  const create = () => router.push('/event/create' as Href);
  const hasEvents = memberships.length > 0;
  const searching = Boolean(query.trim());

  return (
    <View className="flex-1">
      <Screen
        headTitle="Operar"
        stickyHeader={
          <View className="gap-ds-12">
            <PageHeader
              title="Operar"
              lead={lead}
              actions={
                isAdmin ? (
                  <Button variant="outline" onPress={() => router.push('/admin/queue' as Href)}>
                    <Text>Cola admin</Text>
                  </Button>
                ) : undefined
              }
            />
            {hasEvents ? (
              <>
                <SearchBar compact value={query} placeholder="Buscar un evento" onChangeText={setQuery} />
                <ChipRow>
                  <Chip
                    label={visibleBuckets.length ? `Todos · ${visibleBuckets.reduce((sum, bucket) => sum + grouped[bucket.key].length, 0)}` : 'Todos'}
                    icon={LayoutGrid}
                    selected={filter === 'all'}
                    onPress={() => setFilter('all')}
                  />
                  {BUCKETS.map((bucket) => {
                    const count = grouped[bucket.key].length;
                    if (count === 0) return null;
                    return (
                      <Chip
                        key={bucket.key}
                        label={`${bucket.title} · ${count}`}
                        icon={bucket.icon}
                        selected={filter === bucket.key}
                        onPress={() => setFilter(bucket.key)}
                      />
                    );
                  })}
                </ChipRow>
              </>
            ) : null}
          </View>
        }>
        <View className={isPromoter ? 'gap-ds-32 pb-20' : 'gap-ds-32'}>
          {memberships.length === 0 && isPromoter ? (
            <EmptyState title="Crea tu primer evento" lead="Flyer, pin y boleta en un solo flujo." />
          ) : null}
          {memberships.length === 0 && !isPromoter ? (
            <EmptyState
              title={density === 'metrics' ? 'Sin eventos con números todavía' : 'Cuando te inviten, escaneas aquí'}
              lead={
                density === 'metrics'
                  ? 'Las métricas aparecen cuando te sumen a un evento.'
                  : 'Cada quien entra con su cuenta. Nada de login compartido.'
              }
            />
          ) : null}
          {hasEvents && visibleCount === 0 ? (
            <EmptyState
              title={searching ? 'Ningún evento con eso' : emptyCopy(filter)}
              lead={searching ? 'Prueba el nombre, el venue o el barrio.' : undefined}
              actionLabel={searching ? 'Limpiar búsqueda' : filter !== 'all' ? 'Ver todos' : undefined}
              onAction={
                searching ? () => setQuery('') : filter !== 'all' ? () => setFilter('all') : undefined
              }
            />
          ) : null}
          {filter === 'all' && loadingRows.length > 0 ? (
            <EventFeed>
              {loadingRows.map((row) => (
                <ListingSkeleton key={row.membership.id} />
              ))}
            </EventFeed>
          ) : null}
          {BUCKETS.map((bucket) => {
            if (filter !== 'all' && filter !== bucket.key) return null;
            const items = grouped[bucket.key];
            if (items.length === 0) return null;
            return (
              <View key={bucket.key} className="gap-ds-16">
                {filter === 'all' ? (
                  <View className="gap-ds-4">
                    <Text variant="subheading">
                      {bucket.title} · {items.length}
                    </Text>
                    <Text variant="muted">{bucket.lead}</Text>
                  </View>
                ) : null}
                <EventFeed>
                  {items.map((row, index) => (
                    <FadeSlideIn key={row.membership.id} index={index} className="w-full">
                      <OperateEventBlock
                        membership={row.membership}
                        event={row.event}
                        loading={row.loading}
                        bucket={bucket.key}
                        tonight={tonight?.membership.id === row.membership.id}
                      />
                    </FadeSlideIn>
                  ))}
                </EventFeed>
              </View>
            );
          })}
        </View>
      </Screen>
      {isPromoter ? <CreateEventFab onPress={create} /> : null}
    </View>
  );
}

function OperateEventBlock({
  membership,
  event,
  loading,
  bucket,
  tonight,
}: {
  membership: Membership;
  event?: EventWithExtras;
  loading?: boolean;
  bucket: OperateBucket;
  tonight?: boolean;
}) {
  if (loading && !event) {
    return <ListingSkeleton />;
  }
  const cardEvent = event ?? placeholderEvent(membership.eventId);
  const status = event ? draftStatusTag(event.status, bucket) : null;

  return (
    <View className="w-full gap-ds-8">
      <EventCard
        event={cardEvent}
        badge={tonight ? 'Esta noche' : undefined}
        onPress={() => router.push(eventOperateHref(membership.eventId))}
      />
      <View className="flex-row flex-wrap gap-ds-8">
        <Tag tone="muted">{membershipRoleLabel(membership.role)}</Tag>
        {status}
      </View>
    </View>
  );
}

function draftStatusTag(status: EventStatus, bucket: OperateBucket) {
  if (bucket !== 'drafts') return null;
  const tone = status === 'rejected' ? 'danger' : status === 'in_review' ? 'amber' : 'muted';
  return <Tag tone={tone}>{statusLabel(status)}</Tag>;
}

function emptyCopy(filter: OperateFilter): string {
  if (filter === 'all') return 'Ningún evento con eso';
  return BUCKETS.find((bucket) => bucket.key === filter)?.empty ?? 'Ningún evento con eso';
}

function groupOperateRows(rows: OperateRow[]): Record<OperateBucket, OperateRow[]> {
  const grouped: Record<OperateBucket, OperateRow[]> = {
    week: [],
    upcoming: [],
    drafts: [],
    ended: [],
  };
  for (const row of rows) {
    const bucket = operateBucket(row);
    if (!bucket) continue;
    grouped[bucket].push(row);
  }
  grouped.week.sort(byStartsAtAsc);
  grouped.upcoming.sort(byStartsAtAsc);
  grouped.drafts.sort(byStartsAtAsc);
  grouped.ended.sort(byStartsAtDesc);
  return grouped;
}

function operateBucket(row: OperateRow): OperateBucket | null {
  if (!row.event) return null;
  if (eventHasEnded(row.event)) return 'ended';
  if (row.event.status !== 'published') return 'drafts';
  return eventIsThisWeek(row.event) ? 'week' : 'upcoming';
}

function matchesOperateQuery(row: OperateRow, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const event = row.event;
  const haystack = [
    event?.name,
    event?.venueName,
    event?.addressText,
    event?.genre,
    ...(event?.genres ?? []),
    event ? statusLabel(event.status) : '',
    membershipRoleLabel(row.membership.role),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(needle);
}

function byStartsAtAsc(a: OperateRow, b: OperateRow): number {
  return eventStartMs(a) - eventStartMs(b);
}

function byStartsAtDesc(a: OperateRow, b: OperateRow): number {
  return eventStartMs(b) - eventStartMs(a);
}

function eventStartMs(row: OperateRow): number {
  const at = row.event ? Date.parse(row.event.startsAt) : Number.POSITIVE_INFINITY;
  return Number.isFinite(at) ? at : Number.POSITIVE_INFINITY;
}

function pickTonight(rows: OperateRow[]) {
  const now = Date.now() - 12 * 60 * 60 * 1000;
  const ranked = rows
    .filter((row) => row.membership.role === 'door' && row.event && !eventHasEnded(row.event))
    .map((row) => ({ ...row, at: Date.parse(row.event!.startsAt) }))
    .sort((a, b) => a.at - b.at);
  return ranked.find((row) => row.at >= now) ?? ranked[0] ?? null;
}

function placeholderEvent(id: string): ParcheEvent {
  return {
    id,
    tenantId: '',
    ownerUserId: '',
    name: 'Evento',
    startsAt: new Date().toISOString(),
    venueName: '',
    addressText: '',
    description: '',
    status: 'draft',
    genre: 'techno',
    updatedAt: new Date().toISOString(),
  };
}
