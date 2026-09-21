import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { useQueries, useQuery } from '@tanstack/react-query';
import {
  CalendarPlus,
  CircleUser,
  ClipboardList,
  KeyRound,
  Banknote,
  LogOut,
  ShieldCheck,
  UserRound,
  Users,
  Wrench,
} from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { FlyerImage } from '@/components/flyer-image';
import { FadeSlideIn, PressScale } from '@/components/motion';
import { ProfileMascot } from '@/components/profile-mascot';
import { Screen } from '@/components/screen';
import { SettingsRow } from '@/components/settings-row';
import { Surface } from '@/components/surface';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { ThemeToggle } from '@/components/theme-toggle';
import { api } from '@/data/client';
import { userMessage } from '@/data/errors';
import { debugLog } from '@/data/log';
import { toast } from '@/data/toast-store';
import { useAuthSnapshot, usePrimaryProfile } from '@/data/session';
import { useAuthSheet } from '@/data/auth-sheet-store';
import { THEME_PREF_LABEL, useThemePref } from '@/data/theme-store';
import type { Artist, Membership, ParcheEvent, User } from '@/data/types';
import { useCompactLayout } from '@/hooks/use-compact-layout';
import { useRequestCreateEvent } from '@/hooks/use-request-create-event';
import { profileLabel, profileMascot, type PrimaryProfile } from '@/lib/profiles';

const THEME_ACTION = <ThemeToggle className="border border-border bg-surface" />;

export default function ParcheScreen() {
  const { isLoggedIn, user, memberships, isAdmin, isPromoter } = useAuthSnapshot();
  const requestCreate = useRequestCreateEvent();
  const { primary, density } = usePrimaryProfile();
  const openAuth = useAuthSheet((s) => s.open);
  const compact = useCompactLayout();
  const themeAction = compact ? THEME_ACTION : undefined;
  const [activating, setActivating] = useState(false);
  const followingQuery = useQuery({
    queryKey: ['following', user?.id],
    queryFn: () => api.artists.following(),
    enabled: isLoggedIn && Boolean(user?.id),
  });
  const artistQuery = useQuery({
    queryKey: ['artist', 'mine', user?.id],
    queryFn: () => api.artists.mine(),
    enabled: isLoggedIn && Boolean(user?.profiles.includes('artist')),
  });
  const ticketsQuery = useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: () => api.tickets.mine(),
    enabled: isLoggedIn && Boolean(user?.id),
  });
  const following: Artist[] = followingQuery.data ?? [];
  const tickets = (ticketsQuery.data ?? []).filter((ticket) => ticket.status !== 'cancelled');
  const ticketEventIds = [...new Set(tickets.map((ticket) => ticket.eventId))].slice(0, 3);
  const ticketEvents = useQueries({
    queries: ticketEventIds.map((eventId) => ({
      queryKey: ['event', eventId],
      queryFn: () => api.events.get(eventId),
      enabled: isLoggedIn && ticketEventIds.length > 0,
    })),
  });
  const membershipEvents = useQueries({
    queries: memberships.map((m) => ({
      queryKey: ['event', m.eventId],
      queryFn: () => api.events.get(m.eventId),
      enabled: isLoggedIn,
    })),
  });

  if (!isLoggedIn || !user) {
    return (
      <Screen title="Parche" lead="Guarda boletas y sigue artistas." headerAction={themeAction}>
        <View className="mt-ds-24 max-w-xl gap-ds-16">
          <Surface elevated className="flex-row items-center gap-ds-16">
            <View className="size-16 items-center justify-center rounded-full bg-muted">
              <ProfileMascot profile="attendee" size={36} />
            </View>
            <View className="min-w-0 flex-1 gap-ds-4">
              <Text variant="subheading">Tu parche, cuando quieras</Text>
              <Text variant="muted">Explora y guarda sin cuenta. Entra al comprar o para ver tus QRs.</Text>
            </View>
          </Surface>
          <Button onPress={() => openAuth()}>
            <Text>Entrar</Text>
          </Button>
        </View>
        <View className="mt-ds-32 max-w-xl">
          <AppearanceRow icon={CircleUser} />
        </View>
      </Screen>
    );
  }

  const events = membershipEvents.map((q) => q.data);
  const tonight = density === 'door' ? pickTonight(memberships, events) : null;
  const owned = memberships.filter((m) => m.role === 'owner' || m.role === 'manager');
  const ownedFlyers = owned
    .map((membership) => events[memberships.indexOf(membership)]?.flyerUrl)
    .filter((uri): uri is string => Boolean(uri))
    .slice(0, 3);
  const ticketFlyers = ticketEvents
    .map((q) => q.data?.flyerUrl)
    .filter((uri): uri is string => Boolean(uri))
    .slice(0, 3);
  const hasArtist = user.profiles.includes('artist');
  const artist = artistQuery.data ?? null;

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

  async function logout() {
    try {
      await api.auth.logout();
      router.replace('/' as Href);
    } catch (err) {
      toast(userMessage(err));
    }
  }

  const cta = profileCta({
    tonight,
    hasArtist,
    activating,
    missingPhone: !user.phone,
    promoterEmpty: isPromoter && owned.length === 0,
    onTonight: tonight ? () => router.push(`/event/${tonight.id}/door` as Href) : undefined,
    onActivate: () => void activateArtist(),
    onComplete: () => router.push('/parche/completar-perfil' as Href),
    onCreate: () => void requestCreate(),
  });

  return (
    <Screen
      eyebrow={profileMascot(primary).name}
      mark={<ProfileMascot profile={primary} size={32} />}
      title="Parche"
      headerAction={themeAction}>
      <View className="mt-ds-24 max-w-xl gap-ds-16">
        <FadeSlideIn>
          <IdentityCard
            user={user}
            role={profileLabel(primary)}
            tickets={tickets.length}
            following={following.length}
            dates={owned.length}
            onPress={() => router.push('/parche/editar' as Href)}
            onTickets={() => router.push('/wallet' as Href)}
            onFollowing={() => router.push('/parche/siguiendo' as Href)}
            onDates={() => router.push('/operate' as Href)}
          />
        </FadeSlideIn>

        <View className="flex-row gap-ds-12">
          <View className="min-w-0 flex-1">
            <FadeSlideIn index={1} className="w-full">
              <ShortcutCard
                label={shortcutLabel(primary)}
                thumbs={primary === 'promoter' ? ownedFlyers : primary === 'artist' ? compactUris(artist?.avatarUrl) : ticketFlyers}
                fallback={primary === 'artist' ? artist?.stageName || user.displayName : user.displayName}
                onPress={() => router.push(shortcutHref(primary) as Href)}
              />
            </FadeSlideIn>
          </View>
          <View className="min-w-0 flex-1">
            <FadeSlideIn index={2} className="w-full">
              <ShortcutCard
                label="Siguiendo"
                thumbs={following.map((row) => row.avatarUrl).filter((uri): uri is string => Boolean(uri))}
                fallback={following[0]?.stageName || user.displayName}
                onPress={() => router.push('/parche/siguiendo' as Href)}
              />
            </FadeSlideIn>
          </View>
        </View>

        {cta ? (
          <FadeSlideIn index={3}>
            <Surface elevated className="flex-row items-center gap-ds-16" onPress={cta.onPress} accessibilityLabel={cta.title}>
              <View className="size-16 items-center justify-center rounded-full bg-muted">
                {cta.mascot}
              </View>
              <View className="min-w-0 flex-1 gap-ds-4">
                <Text variant="subheading">{cta.title}</Text>
                <Text variant="muted">{cta.lead}</Text>
              </View>
            </Surface>
          </FadeSlideIn>
        ) : null}

        <View className="mt-ds-8">
          <SettingsRow
            icon={<MenuIcon icon={CircleUser} />}
            label="Editar perfil"
            onPress={() => router.push('/parche/editar' as Href)}
            divided={false}
          />
          <SettingsRow
            icon={<MenuIcon icon={KeyRound} />}
            label="Restablecer contraseña"
            onPress={() => router.push('/parche/contrasena' as Href)}
            divided={false}
          />
          <AppearanceRow icon={UserRound} />
          <SettingsRow
            icon={<MenuIcon icon={Banknote} />}
            label={isPromoter ? 'Cobros Mercado Pago' : 'Organiza eventos'}
            onPress={() => router.push('/parche/cobros' as Href)}
            divided={false}
          />
          {hasArtist && artist?.id ? (
            <SettingsRow
              icon={<MenuIcon icon={Users} />}
              label="Ver perfil"
              onPress={() => router.push(`/artist/${artist.id}` as Href)}
              divided={false}
            />
          ) : null}
        </View>

        {memberships.length > 0 || isPromoter || isAdmin ? (
          <View className="mt-ds-8">
            {memberships.length > 0 ? (
              <SettingsRow
                icon={<MenuIcon icon={Wrench} />}
                label="Operar"
                detail={`${memberships.length}`}
                onPress={() => router.push('/operate' as Href)}
                divided={false}
              />
            ) : null}
            {isPromoter ? (
              <SettingsRow
                icon={<MenuIcon icon={CalendarPlus} />}
                label="Crear evento"
                onPress={() => void requestCreate()}
                divided={false}
              />
            ) : null}
            {isAdmin ? (
              <SettingsRow
                icon={<MenuIcon icon={ClipboardList} />}
                label="Cola de aprobación"
                onPress={() => router.push('/admin/queue' as Href)}
                divided={false}
              />
            ) : null}
          </View>
        ) : null}

        <View className="mt-ds-8">
          <SettingsRow
            icon={<MenuIcon icon={LogOut} danger />}
            label="Cerrar sesión"
            tone="danger"
            divided={false}
            onPress={() => void logout()}
          />
        </View>
      </View>
    </Screen>
  );
}

function IdentityCard({
  user,
  role,
  tickets,
  following,
  dates,
  onPress,
  onTickets,
  onFollowing,
  onDates,
}: {
  user: Omit<User, 'password'>;
  role: string;
  tickets: number;
  following: number;
  dates: number;
  onPress: () => void;
  onTickets: () => void;
  onFollowing: () => void;
  onDates: () => void;
}) {
  const initials = user.displayName.slice(0, 2).toUpperCase();
  return (
    <Surface elevated className="flex-row items-center gap-ds-16 p-ds-24">
      <PressScale className="min-w-0 flex-1" onPress={onPress} accessibilityLabel="Editar perfil">
        <View className="items-center gap-ds-12">
          <View className="relative">
            {user.avatarUrl ? (
              <Image
                source={{ uri: user.avatarUrl }}
                className="rounded-full bg-muted"
                style={{ width: 112, height: 112 }}
              />
            ) : (
              <View className="size-28 items-center justify-center rounded-full bg-muted">
                <Text variant="heading">{initials}</Text>
              </View>
            )}
            <View className="absolute bottom-0 right-1 size-8 items-center justify-center rounded-full border-2 border-surface bg-aurora">
              <Icon as={ShieldCheck} size={16} className="text-pitch-black" />
            </View>
          </View>
          <View className="items-center gap-ds-4">
            <Text variant="subheading" numberOfLines={1} className="text-center">
              {user.displayName}
            </Text>
            <Text variant="muted" numberOfLines={1} className="text-center">
              {role}
            </Text>
          </View>
        </View>
      </PressScale>
      <View className="w-[42%] justify-center">
        <Stat value={tickets} label="Tiquetes" onPress={onTickets} />
        <View className="my-ds-12 h-px bg-border" />
        <Stat value={following} label="Siguiendo" onPress={onFollowing} />
        <View className="my-ds-12 h-px bg-border" />
        <Stat value={dates} label="Eventos" onPress={onDates} />
      </View>
    </Surface>
  );
}

function Stat({ value, label, onPress }: { value: number; label: string; onPress: () => void }) {
  return (
    <PressScale onPress={onPress} accessibilityLabel={label}>
      <View className="min-h-11 justify-center gap-ds-4">
        <Text variant="heading">{value}</Text>
        <Text variant="muted">{label}</Text>
      </View>
    </PressScale>
  );
}

function ShortcutCard({
  label,
  thumbs,
  fallback,
  onPress,
}: {
  label: string;
  thumbs: string[];
  fallback: string;
  onPress: () => void;
}) {
  return (
    <Surface elevated onPress={onPress} accessibilityLabel={label} className="min-h-[212px] w-full justify-between">
      <View className="h-24 items-center justify-center">
        {thumbs.length > 0 ? <StackedThumbs uris={thumbs} /> : <LetterMark letter={fallback.slice(0, 1).toUpperCase()} />}
      </View>
      <Text variant="subheading">{label}</Text>
    </Surface>
  );
}

function StackedThumbs({ uris }: { uris: string[] }) {
  const shown = uris.slice(0, 3);
  return (
    <View className="h-24 w-full items-center justify-center">
      {shown.map((uri, index) => {
        const offset = (index - (shown.length - 1) / 2) * 18;
        const tilt = (index - 1) * 8;
        return (
          <View
            key={`${uri}-${index}`}
            className="absolute overflow-hidden rounded-images border border-surface bg-muted"
            style={{
              width: 72,
              height: 72,
              transform: [{ translateX: offset }, { rotate: `${tilt}deg` }],
            }}>
            <FlyerImage uri={uri} />
          </View>
        );
      })}
    </View>
  );
}

function LetterMark({ letter }: { letter: string }) {
  return (
    <View className="size-20 items-center justify-center rounded-full bg-aurora-soft">
      <Text variant="heading" className="text-aurora">
        {letter}
      </Text>
    </View>
  );
}

function AppearanceRow({ icon }: { icon: typeof CircleUser }) {
  const pref = useThemePref((s) => s.pref);
  return (
    <SettingsRow
      icon={<MenuIcon icon={icon} />}
      label="Apariencia"
      detail={THEME_PREF_LABEL[pref]}
      trailing={<ThemeToggle />}
      divided={false}
    />
  );
}

function MenuIcon({ icon, danger = false }: { icon: typeof CircleUser; danger?: boolean }) {
  return <Icon as={icon} size={22} className={danger ? 'text-danger' : 'text-foreground'} />;
}

function shortcutLabel(primary: PrimaryProfile) {
  if (primary === 'promoter') return 'Tus eventos';
  if (primary === 'artist') return 'Tu vitrina';
  return 'Tiquetes';
}

function shortcutHref(primary: PrimaryProfile) {
  if (primary === 'promoter') return '/operate';
  if (primary === 'artist') return '/artist/edit';
  return '/wallet';
}

function compactUris(uri?: string) {
  return uri ? [uri] : [];
}

function profileCta({
  tonight,
  hasArtist,
  activating,
  missingPhone,
  promoterEmpty,
  onTonight,
  onActivate,
  onComplete,
  onCreate,
}: {
  tonight: ParcheEvent | null;
  hasArtist: boolean;
  activating: boolean;
  missingPhone: boolean;
  promoterEmpty: boolean;
  onTonight?: () => void;
  onActivate: () => void;
  onComplete: () => void;
  onCreate: () => void;
}): { title: string; lead: string; onPress: () => void; mascot: ReactNode } | null {
  if (tonight && onTonight) {
    return {
      title: 'Esta noche',
      lead: tonight.name,
      onPress: onTonight,
      mascot: <ProfileMascot profile="attendee" size={36} />,
    };
  }
  if (!hasArtist) {
    return {
      title: activating ? 'Activando…' : 'Activa tu ficha de artista',
      lead: 'Bio y nombre de escena. No abre caja ni puerta.',
      onPress: onActivate,
      mascot: <ProfileMascot profile="artist" size={36} />,
    };
  }
  if (promoterEmpty) {
    return {
      title: 'Crea tu primer evento',
      lead: 'Flyer primero, luego datos y pin.',
      onPress: onCreate,
      mascot: <ProfileMascot profile="promoter" size={36} />,
    };
  }
  if (missingPhone) {
    return {
      title: 'Completa tu perfil',
      lead: 'Nombre y teléfono, cuando quieras.',
      onPress: onComplete,
      mascot: <ProfileMascot profile="attendee" size={36} />,
    };
  }
  return null;
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
