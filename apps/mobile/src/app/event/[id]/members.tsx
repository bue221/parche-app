import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, SectionList, View } from 'react-native';

import { BackBar } from '@/components/back-bar';
import { Chip, ChipRow, ChipWrap } from '@/components/chip-row';
import { EndedEventNotice } from '@/components/ended-event-notice';
import { EmptyState, PendingAuth, Skeleton } from '@/components/feedback';
import { PageHeader } from '@/components/page-header';
import { PersonRow } from '@/components/person-row';
import { Screen } from '@/components/screen';
import { SearchBar } from '@/components/search-bar';
import { StickyCta } from '@/components/sticky-cta';
import { Surface } from '@/components/surface';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { ApiError, userMessage } from '@/data/errors';
import { useAuthSnapshot } from '@/data/session';
import { toast } from '@/data/toast-store';
import type { EventWithExtras, Membership, MembershipRole, MembershipStatus, UserHit } from '@/data/types';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { looksLikeEmail } from '@/lib/check-in';
import { eventHasEnded, statusLabel } from '@/lib/format';
import { membershipRoleHint, membershipRoleLabel } from '@/lib/profiles';

const INVITE_ROLES = ['manager', 'door', 'metrics'] as const;
type InviteRole = (typeof INVITE_ROLES)[number];
type StatusFilter = 'all' | MembershipStatus;

const ROLE_RANK: Record<MembershipRole, number> = {
  owner: 0,
  manager: 1,
  door: 2,
  metrics: 3,
};

const STATUS_SECTIONS: { key: MembershipStatus; title: string }[] = [
  { key: 'active', title: 'Activos' },
  { key: 'pending', title: 'Pendientes' },
  { key: 'revoked', title: 'Revocados' },
];

type MemberSection = { key: MembershipStatus; title: string; data: Membership[] };

function memberName(row: Membership) {
  return row.displayName?.trim() || row.email || 'Persona';
}

function memberMeta(row: Membership) {
  const bits = [membershipRoleLabel(row.role), statusLabel(row.status)];
  if (row.email && row.email !== memberName(row)) bits.unshift(row.email);
  return bits.join(' · ');
}

function sortMembers(rows: Membership[]) {
  return [...rows].sort((a, b) => {
    const byRole = ROLE_RANK[a.role] - ROLE_RANK[b.role];
    if (byRole !== 0) return byRole;
    return memberName(a).localeCompare(memberName(b), 'es');
  });
}

export default function EventMembersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ok = useRequireAuth(`/event/${id}/members`);
  const { user } = useAuthSnapshot();
  const [event, setEvent] = useState<EventWithExtras | null>(null);
  const [rows, setRows] = useState<Membership[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<InviteRole>('door');
  const [selected, setSelected] = useState<UserHit | null>(null);
  const [hits, setHits] = useState<UserHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRows(await api.members.list(id));
      setError(null);
    } catch (err) {
      setError(userMessage(err));
    }
  }, [id]);

  useEffect(() => {
    void api.events.get(id).then(setEvent).catch((err) => setError(userMessage(err)));
    void load();
  }, [id, load]);

  useEffect(() => {
    if (selected) {
      setHits([]);
      setSearching(false);
      return;
    }
    const needle = email.trim();
    if (needle.length < 2) {
      setHits([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(() => {
      void api.users
        .search(email)
        .then((found) => {
          if (cancelled) return;
          const taken = new Set(rows.map((row) => row.email.toLowerCase()));
          const takenIds = new Set(rows.map((row) => row.userId).filter(Boolean));
          setHits(
            found.filter((hit) => !taken.has(hit.email.toLowerCase()) && !takenIds.has(hit.id)).slice(0, 6)
          );
        })
        .catch((err) => {
          if (!cancelled) {
            console.warn('members.search', err);
            setHits([]);
          }
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [email, rows, selected]);

  const sections = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const visible = rows.filter((row) => {
      if (statusFilter !== 'all' && row.status !== statusFilter) return false;
      if (!needle) return true;
      const haystack = `${memberName(row)} ${row.email} ${membershipRoleLabel(row.role)} ${statusLabel(row.status)}`.toLowerCase();
      return haystack.includes(needle);
    });
    const wanted = statusFilter === 'all' ? STATUS_SECTIONS : STATUS_SECTIONS.filter((item) => item.key === statusFilter);
    return wanted
      .map((item) => ({
        key: item.key,
        title: item.title,
        data: sortMembers(visible.filter((row) => row.status === item.key)),
      }))
      .filter((section) => section.data.length > 0);
  }, [query, rows, statusFilter]);

  const counts = useMemo(
    () => ({
      all: rows.length,
      active: rows.filter((row) => row.status === 'active').length,
      pending: rows.filter((row) => row.status === 'pending').length,
      revoked: rows.filter((row) => row.status === 'revoked').length,
    }),
    [rows]
  );

  async function invite() {
    const chosenEmail = selected?.email || email.trim().toLowerCase();
    if (!selected && !looksLikeEmail(chosenEmail)) {
      setError('Elige a alguien o escribe un email válido.');
      return;
    }
    setInviting(true);
    setError(null);
    try {
      await api.members.invite(
        id,
        chosenEmail,
        role,
        selected && !selected.id.startsWith('email:') ? selected.id : undefined
      );
      toast(`Invitación enviada a ${selected?.displayName || chosenEmail}`, 'success');
      setEmail('');
      setSelected(null);
      setHits([]);
      await load();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'CONFLICT') {
        setError('Esa persona ya está en el equipo.');
      } else {
        setError(userMessage(err));
      }
    } finally {
      setInviting(false);
    }
  }

  async function revoke(row: Membership) {
    setRevokingId(row.id);
    try {
      await api.members.revoke(id, row.id);
      setConfirmId(null);
      await load();
    } catch (err) {
      setError(userMessage(err));
    } finally {
      setRevokingId(null);
    }
  }

  if (!ok) {
    return <PendingAuth />;
  }
  if (user && !api.helpers.can(user.id, id, 'event.members.manage')) {
    return (
      <Screen back>
        <Text>No puedes gestionar el equipo.</Text>
      </Screen>
    );
  }
  if (!event) {
    return (
      <Screen back title="Equipo">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-ds-16 h-24 w-full" />
      </Screen>
    );
  }

  const ended = eventHasEnded(event);
  const canInviteEmail = Boolean(selected) || looksLikeEmail(email);
  const suggestions = (() => {
    const taken = new Set(rows.map((row) => row.email.toLowerCase()));
    const list = hits.filter((hit) => hit.email && !taken.has(hit.email.toLowerCase()));
    const trimmed = email.trim().toLowerCase();
    if (
      looksLikeEmail(trimmed) &&
      !taken.has(trimmed) &&
      !list.some((hit) => hit.email.toLowerCase() === trimmed)
    ) {
      const local = trimmed.split('@')[0] || trimmed;
      list.push({ id: `email:${trimmed}`, email: trimmed, displayName: local });
    }
    return list.slice(0, 6);
  })();
  const searchingTeam = Boolean(query.trim()) || statusFilter !== 'all';

  return (
    <Screen
      scroll={false}
      headTitle="Equipo"
      stickyHeader={
        <View className="w-full max-w-xl gap-ds-12">
          <BackBar className="mb-0" />
          <PageHeader
            title="Equipo"
            lead={ended ? 'Consulta. El staff de esa noche se queda registrado.' : 'Invita a quien cubre la puerta.'}
          />
          {ended ? <EndedEventNotice /> : null}
          <SearchBar compact value={query} onChangeText={setQuery} placeholder="Buscar en el equipo" />
          <ChipRow>
            <Chip label={`Todos ${counts.all}`} selected={statusFilter === 'all'} onPress={() => setStatusFilter('all')} />
            <Chip
              label={`Activos ${counts.active}`}
              selected={statusFilter === 'active'}
              onPress={() => setStatusFilter('active')}
            />
            <Chip
              label={`Pendientes ${counts.pending}`}
              selected={statusFilter === 'pending'}
              onPress={() => setStatusFilter('pending')}
            />
            <Chip
              label={`Revocados ${counts.revoked}`}
              selected={statusFilter === 'revoked'}
              onPress={() => setStatusFilter('revoked')}
            />
          </ChipRow>
          {error ? (
            <Text variant="helper" className="text-danger">
              {error}
            </Text>
          ) : null}
        </View>
      }
      footer={
        ended ? undefined : (
          <StickyCta>
            <View className="w-full max-w-xl gap-ds-8">
              <InviteBar
                email={email}
                role={role}
                selected={selected}
                suggestions={suggestions}
                searching={searching}
                inviting={inviting}
                canInvite={canInviteEmail}
                onEmailChange={(value) => {
                  setEmail(value);
                  setError(null);
                }}
                onSelect={(hit) => {
                  setSelected(hit);
                  setEmail(hit.email);
                  setHits([]);
                  setError(null);
                }}
                onClear={() => {
                  setSelected(null);
                  setEmail('');
                }}
                onRole={setRole}
                onInvite={() => void invite()}
              />
            </View>
          </StickyCta>
        )
      }>
      <View className="min-h-0 w-full max-w-xl flex-1">
      <SectionList
        style={{ flex: 1, minHeight: 0 }}
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={16}
        maxToRenderPerBatch={12}
        windowSize={7}
        updateCellsBatchingPeriod={50}
        extraData={`${confirmId}:${revokingId}`}
        renderSectionHeader={({ section }) => (
          <View className="bg-background pb-ds-4 pt-ds-12">
            <Text variant="caption">
              {section.title} · {section.data.length}
            </Text>
          </View>
        )}
        renderItem={({ item, index, section }) => (
          <MemberRow
            row={item}
            divided={index < section.data.length - 1}
            ended={ended}
            confirming={confirmId === item.id}
            revoking={revokingId === item.id}
            onAskRevoke={() => setConfirmId(item.id)}
            onCancelRevoke={() => setConfirmId(null)}
            onRevoke={() => void revoke(item)}
          />
        )}
        ListEmptyComponent={
          rows.length === 0 ? (
            <EmptyState
              title="Invita a quien cubre la puerta"
              lead="Manager, puerta o métricas. Nadie comparte un login."
            />
          ) : (
            <EmptyState
              compact
              title="Nadie con eso"
              lead="Prueba el nombre, el email o el rol."
              actionLabel={searchingTeam ? 'Limpiar' : undefined}
              onAction={
                searchingTeam
                  ? () => {
                      setQuery('');
                      setStatusFilter('all');
                    }
                  : undefined
              }
            />
          )
        }
      />
      </View>
    </Screen>
  );
}

function MemberRow({
  row,
  divided,
  ended,
  confirming,
  revoking,
  onAskRevoke,
  onCancelRevoke,
  onRevoke,
}: {
  row: Membership;
  divided: boolean;
  ended: boolean;
  confirming: boolean;
  revoking: boolean;
  onAskRevoke: () => void;
  onCancelRevoke: () => void;
  onRevoke: () => void;
}) {
  const canRevoke = !ended && row.role !== 'owner' && row.status !== 'revoked';
  return (
    <View className={divided ? 'border-b border-border' : undefined}>
      <PersonRow
        compact
        name={memberName(row)}
        detail={memberMeta(row)}
        avatarUrl={row.avatarUrl}
        dimmed={row.status === 'revoked'}
        trailing={
          canRevoke ? (
            confirming ? (
              <View className="flex-row items-center">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Confirmar revocar"
                  disabled={revoking}
                  onPress={onRevoke}
                  className="min-h-11 items-center justify-center px-ds-8">
                  <Text variant="caption" className="font-bold uppercase text-danger">
                    {revoking ? 'Revocando…' : 'Sí, revocar'}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cancelar"
                  onPress={onCancelRevoke}
                  className="min-h-11 items-center justify-center px-ds-8">
                  <Text variant="caption" className="font-bold uppercase">
                    No
                  </Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Revocar a ${memberName(row)}`}
                onPress={onAskRevoke}
                className="min-h-11 items-center justify-center px-ds-8">
                <Text variant="caption" className="font-bold uppercase">
                  Revocar
                </Text>
              </Pressable>
            )
          ) : undefined
        }
      />
      {row.inviteToken && !ended ? (
        <Text variant="helper" selectable className="pb-ds-8" numberOfLines={1}>
          Link mock: parche://invites/{row.inviteToken}
        </Text>
      ) : null}
    </View>
  );
}

function InviteBar({
  email,
  role,
  selected,
  suggestions,
  searching,
  inviting,
  canInvite,
  onEmailChange,
  onSelect,
  onClear,
  onRole,
  onInvite,
}: {
  email: string;
  role: InviteRole;
  selected: UserHit | null;
  suggestions: UserHit[];
  searching: boolean;
  inviting: boolean;
  canInvite: boolean;
  onEmailChange: (value: string) => void;
  onSelect: (hit: UserHit) => void;
  onClear: () => void;
  onRole: (role: InviteRole) => void;
  onInvite: () => void;
}) {
  return (
    <View className="gap-ds-8">
      <Text variant="caption">Invitar</Text>
      {selected ? (
        <Surface muted className="px-ds-12 py-ds-4">
          <PersonRow
            compact
            name={selected.displayName}
            detail={selected.email}
            avatarUrl={selected.avatarUrl}
            trailing={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Quitar"
                onPress={onClear}
                className="min-h-11 items-center justify-center px-ds-8">
                <Text variant="caption" className="font-bold uppercase">
                  Quitar
                </Text>
              </Pressable>
            }
          />
        </Surface>
      ) : (
        <View className="gap-ds-8">
          {suggestions.length > 0 ? (
            <Surface elevated className="overflow-hidden p-ds-8">
              <ScrollView
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
                style={{ maxHeight: 168 }}
                showsVerticalScrollIndicator={false}>
                {suggestions.map((hit) => (
                  <PersonRow
                    key={hit.id}
                    compact
                    name={hit.displayName}
                    detail={hit.email}
                    avatarUrl={hit.avatarUrl}
                    onPress={() => onSelect(hit)}
                  />
                ))}
              </ScrollView>
            </Surface>
          ) : null}
          <SearchBar compact value={email} onChangeText={onEmailChange} placeholder="Nombre del colectivo o email" />
          {searching ? (
            <Text variant="helper">Buscando…</Text>
          ) : email.trim().length >= 2 && suggestions.length === 0 ? (
            <Text variant="helper">No está en el colectivo. Escribe el email para invitar.</Text>
          ) : (
            <Text variant="helper">{membershipRoleHint(role)}</Text>
          )}
        </View>
      )}
      <ChipWrap>
        {INVITE_ROLES.map((option) => (
          <Chip key={option} label={membershipRoleLabel(option)} selected={role === option} onPress={() => onRole(option)} />
        ))}
      </ChipWrap>
      <Button disabled={inviting || !canInvite} onPress={onInvite}>
        <Text>{inviting ? 'Invitando…' : 'Invitar'}</Text>
      </Button>
    </View>
  );
}
