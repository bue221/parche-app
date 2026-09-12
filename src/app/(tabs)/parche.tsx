import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { ArtistPreview } from '@/components/artist-preview';
import { ArtistRow } from '@/components/artist-row';
import { EventCard } from '@/components/event-card';
import { EmptyState, ErrorState } from '@/components/feedback';
import { Field } from '@/components/field';
import { MediaPicker } from '@/components/media-picker';
import { PageHeader } from '@/components/page-header';
import { Screen } from '@/components/screen';
import { SettingsRow } from '@/components/settings-row';
import { Surface } from '@/components/surface';
import { Button } from '@/components/ui/button';
import { Tag } from '@/components/ui/tag';
import { Text } from '@/components/ui/text';
import { LogoutButton } from '@/components/logout-button';
import { ThemeToggle } from '@/components/theme-toggle';
import { api } from '@/data/client';
import { userMessage } from '@/data/errors';
import { debugLog } from '@/data/log';
import { toast } from '@/data/toast-store';
import { useAuthSnapshot, usePrimaryProfile } from '@/data/session';
import type { Artist, Membership, ParcheEvent, User } from '@/data/types';
import { membershipRoleLabel, profileLabel } from '@/lib/profiles';

export default function ParcheScreen() {
  const { isLoggedIn, user, memberships, isAdmin, isPromoter } = useAuthSnapshot();
  const { primary, density } = usePrimaryProfile();
  const [name, setName] = useState(user?.displayName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [activating, setActivating] = useState(false);
  const followingQuery = useQuery({
    queryKey: ['following'],
    queryFn: () => api.artists.following(),
    enabled: isLoggedIn,
  });
  const artistQuery = useQuery({
    queryKey: ['artist', 'mine'],
    queryFn: () => api.artists.mine(),
    enabled: isLoggedIn && Boolean(user?.profiles.includes('artist')),
  });
  const following: Artist[] = followingQuery.data ?? [];
  const membershipEvents = useQueries({
    queries: memberships.map((m) => ({
      queryKey: ['event', m.eventId],
      queryFn: () => api.events.get(m.eventId),
      enabled: isLoggedIn,
    })),
  });

  useEffect(() => {
    setName(user?.displayName ?? '');
    setPhone(user?.phone ?? '');
  }, [user?.displayName, user?.phone]);

  if (!isLoggedIn || !user) {
    return (
      <Screen center>
        <View className="max-w-xl gap-ds-24">
          <PageHeader title="Parche" lead="Entra para wallet, follows y tus fechas." />
          <View className="flex-row flex-wrap gap-ds-8">
            <ThemeToggle />
            <Button onPress={() => router.push('/auth/login' as Href)}>
              <Text>Entrar</Text>
            </Button>
            <Button variant="outline" onPress={() => router.push('/auth/register' as Href)}>
              <Text>Crear cuenta</Text>
            </Button>
          </View>
        </View>
      </Screen>
    );
  }

  const lead =
    primary === 'promoter'
      ? 'Tus fechas y tu cuenta.'
      : primary === 'artist'
        ? 'Así te ven en la escena.'
        : 'Tus tiquetes y a quién sigues.';
  const tonight = density === 'door' ? pickTonight(memberships, membershipEvents.map((q) => q.data)) : null;

  async function activateArtist() {
    if (activating) return;
    setActivating(true);
    try {
      await api.auth.activateArtist();
      toast('Ficha de artista activa', 'success');
      router.push('/artist/edit' as Href);
    } catch (err) {
      const message = userMessage(err);
      toast(message);
      debugLog('profile', 'activate artist failed');
    } finally {
      setActivating(false);
    }
  }

  return (
    <Screen>
      <PageHeader title="Parche" lead={lead} />
      <IdentityHeader user={user} />
      <View className="mt-ds-16 flex-row items-center gap-ds-8">
        <ThemeToggle />
        <Button size="sm" variant="outline" onPress={() => setEditing((value) => !value)}>
          <Text>{editing ? 'Cerrar' : 'Editar perfil'}</Text>
        </Button>
      </View>

      {editing ? (
        <AccountEditor
          name={name}
          phone={phone}
          error={error}
          saved={saved}
          saving={saving}
          onName={setName}
          onPhone={setPhone}
          onSave={() => {
            setSaving(true);
            setSaved(false);
            void api.auth
              .updateMe({ displayName: name, phone })
              .then(() => {
                setError(null);
                setSaved(true);
                toast('Perfil guardado', 'success');
              })
              .catch((err) => {
                const message = userMessage(err);
                setError(message);
                toast(message);
              })
              .finally(() => setSaving(false));
          }}
        />
      ) : null}

      <View className="mt-ds-32 gap-ds-24">
        {primary === 'promoter' ? (
          <PromoterDates
            memberships={memberships}
            events={membershipEvents.map((q) => q.data)}
          />
        ) : null}
        {primary === 'artist' ? (
          <ArtistHome artist={artistQuery.data ?? null} loading={artistQuery.isLoading} />
        ) : null}
        {primary === 'attendee' ? (
          <SettingsRow label="Mis tiquetes" detail="Wallet" onPress={() => router.push('/tickets' as Href)} />
        ) : null}
        {tonight ? (
          <View className="gap-ds-12">
            <Text variant="headingSm">Esta noche</Text>
            <EventCard
              event={tonight}
              layout="row"
              onPress={() => router.push(`/event/${tonight.id}/door` as Href)}
            />
          </View>
        ) : null}
        <FollowingBlock query={followingQuery} following={following} />
        {!user.profiles.includes('artist') ? (
          <EmptyState
            title="Activar ficha de artista"
            lead="Bio y nombre de escena. No abre caja ni puerta."
            actionLabel={activating ? 'Activando…' : 'Activar ficha de artista'}
            onAction={() => void activateArtist()}
          />
        ) : primary !== 'artist' ? (
          <SettingsRow label="Tu vitrina" onPress={() => router.push('/artist/edit' as Href)} />
        ) : null}
        {primary !== 'promoter' && memberships.length > 0 ? (
          <SettingsRow
            label="Operar"
            detail={`${memberships.length}`}
            onPress={() => router.push('/operate' as Href)}
          />
        ) : null}
        {isAdmin ? (
          <SettingsRow label="Cola de aprobación" onPress={() => router.push('/admin/queue' as Href)} />
        ) : null}
        {isPromoter && primary !== 'promoter' ? (
          <SettingsRow label="Crear fecha" onPress={() => router.push('/event/create' as Href)} />
        ) : null}
      </View>
      <View className="mt-ds-32">
        <LogoutButton className="self-start rounded-buttons border border-foreground px-ds-16" />
      </View>
    </Screen>
  );
}

function IdentityHeader({ user }: { user: Omit<User, 'password'> }) {
  const initials = user.displayName.slice(0, 2).toUpperCase();
  return (
    <View className="mt-ds-16 items-center gap-ds-12">
      {user.avatarUrl ? (
        <Image source={{ uri: user.avatarUrl }} className="size-28 rounded-full bg-muted" />
      ) : (
        <View className="size-28 items-center justify-center rounded-full bg-muted">
          <Text variant="heading">{initials}</Text>
        </View>
      )}
      <Text variant="heading" className="text-center">
        {user.displayName}
      </Text>
      <Text variant="muted">{user.email}</Text>
      <View className="flex-row flex-wrap justify-center gap-ds-8">
        {user.profiles.map((profile) => (
          <Tag key={profile} tone="muted">
            {profileLabel(profile)}
          </Tag>
        ))}
      </View>
    </View>
  );
}

function AccountEditor({
  name,
  phone,
  error,
  saved,
  saving,
  onName,
  onPhone,
  onSave,
}: {
  name: string;
  phone: string;
  error: string | null;
  saved: boolean;
  saving: boolean;
  onName: (value: string) => void;
  onPhone: (value: string) => void;
  onSave: () => void;
}) {
  return (
    <Surface muted className="mt-ds-24 gap-ds-16">
      <MediaPicker kind="avatar" onUploaded={() => void api.auth.me()} />
      <Field label="Nombre" value={name} onChangeText={onName} />
      <Field
        label="Teléfono"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={onPhone}
        placeholder="+57 300 000 0000"
      />
      {error ? (
        <Text variant="helper" className="text-foreground">
          {error}
        </Text>
      ) : saved ? (
        <Text variant="helper" className="text-foreground">
          Guardado
        </Text>
      ) : null}
      <Button disabled={saving} onPress={onSave}>
        <Text>{saving ? 'Guardando…' : 'Guardar'}</Text>
      </Button>
    </Surface>
  );
}

function PromoterDates({
  memberships,
  events,
}: {
  memberships: Membership[];
  events: Array<ParcheEvent | undefined>;
}) {
  const owned = memberships.filter((m) => m.role === 'owner' || m.role === 'manager');
  return (
    <View className="gap-ds-16">
      <View className="flex-row items-center justify-between gap-ds-8">
        <Text variant="headingSm">Tus fechas</Text>
        <Button size="sm" onPress={() => router.push('/event/create' as Href)}>
          <Text>Crear</Text>
        </Button>
      </View>
      {owned.length === 0 ? (
        <EmptyState
          title="Crea tu primera fecha"
          lead="Flyer primero, luego datos y pin."
          actionLabel="Crear fecha"
          onAction={() => router.push('/event/create' as Href)}
        />
      ) : (
        owned.map((membership) => {
          const event = events[memberships.indexOf(membership)];
          if (!event) return null;
          return (
            <View key={membership.id} className="gap-ds-8">
              <EventCard event={event} layout="listing" onPress={() => router.push(`/event/${event.id}` as Href)} />
              <Text variant="helper">{membershipRoleLabel(membership.role)}</Text>
            </View>
          );
        })
      )}
    </View>
  );
}

function ArtistHome({ artist, loading }: { artist: Artist | null; loading: boolean }) {
  if (loading && !artist) {
    return <Text variant="muted">Cargando vitrina…</Text>;
  }
  return (
    <View className="gap-ds-12">
      <Text variant="headingSm">Tu vitrina</Text>
      <ArtistPreview stageName={artist?.stageName ?? ''} bio={artist?.bio ?? ''} avatarUrl={artist?.avatarUrl} />
      <Button variant="outline" onPress={() => router.push('/artist/edit' as Href)}>
        <Text>{artist ? 'Editar ficha' : 'Completar ficha'}</Text>
      </Button>
    </View>
  );
}

function FollowingBlock({
  query,
  following,
}: {
  query: { error: unknown; refetch: () => unknown };
  following: Artist[];
}) {
  return (
    <View>
      <Text variant="headingSm" className="py-ds-8">
        Siguiendo
      </Text>
      {query.error ? (
        <ErrorState message={userMessage(query.error)} onRetry={() => void query.refetch()} />
      ) : following.length === 0 ? (
        <EmptyState title="Todavía no sigues a nadie" lead="Entra a un lineup y toca Seguir." />
      ) : (
        following.map((artist) => (
          <ArtistRow key={artist.id} artist={artist} onPress={() => router.push(`/artist/${artist.id}` as Href)} />
        ))
      )}
    </View>
  );
}

function pickTonight(memberships: Membership[], events: Array<ParcheEvent | undefined>) {
  const now = Date.now() - 12 * 60 * 60 * 1000;
  const ranked = memberships
    .map((membership, index) => ({ membership, event: events[index] }))
    .filter((row): row is { membership: Membership; event: ParcheEvent } => Boolean(row.event) && row.membership.role === 'door')
    .map((row) => ({ ...row, at: Date.parse(row.event.startsAt) }))
    .sort((a, b) => a.at - b.at);
  return ranked.find((row) => row.at >= now)?.event ?? ranked[0]?.event ?? null;
}
