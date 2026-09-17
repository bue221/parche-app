import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { useQueries, useQuery } from '@tanstack/react-query';
import {
  CalendarPlus,
  CircleUser,
  ClipboardList,
  LogOut,
  ShieldCheck,
  UserRound,
  Users,
  Wrench,
} from 'lucide-react-native';
import { useEffect, useRef, useState, type ReactNode, type Ref } from 'react';
import { View } from 'react-native';

import { Field } from '@/components/field';
import { PhoneField, type PhoneFieldHandle } from '@/components/phone-field';
import { FlyerImage } from '@/components/flyer-image';
import { MediaPicker } from '@/components/media-picker';
import { FadeSlideIn } from '@/components/motion';
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
import type { Artist, Membership, ParcheEvent, User } from '@/data/types';
import { profileLabel, profileMascot, type PrimaryProfile } from '@/lib/profiles';

const THEME_ACTION = <ThemeToggle className="border border-border bg-surface" />;

export default function ParcheScreen() {
  const { isLoggedIn, user, memberships, isAdmin, isPromoter } = useAuthSnapshot();
  const { primary, density } = usePrimaryProfile();
  const openAuth = useAuthSheet((s) => s.open);
  const [name, setName] = useState(user?.displayName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const phoneFieldRef = useRef<PhoneFieldHandle>(null);
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
  const ticketsQuery = useQuery({
    queryKey: ['wallet'],
    queryFn: () => api.tickets.mine(),
    enabled: isLoggedIn,
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

  useEffect(() => {
    setName(user?.displayName ?? '');
    setPhone(user?.phone ?? '');
  }, [user?.displayName, user?.phone]);

  if (!isLoggedIn || !user) {
    return (
      <Screen title="Parche" lead="Guarda boletas y sigue artistas." headerAction={THEME_ACTION}>
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
          <SettingsRow icon={<MenuIcon icon={CircleUser} />} label="Apariencia" trailing={<ThemeToggle />} divided={false} />
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
    onCreate: () => router.push('/event/create' as Href),
  });

  return (
    <Screen
      eyebrow={profileMascot(primary).name}
      mark={<ProfileMascot profile={primary} size={32} />}
      title="Parche"
      headerAction={THEME_ACTION}>
      <View className="mt-ds-24 max-w-xl gap-ds-16">
        <FadeSlideIn>
          <IdentityCard
            user={user}
            role={profileLabel(primary)}
            tickets={tickets.length}
            following={following.length}
            dates={owned.length}
          />
        </FadeSlideIn>

        <View className="flex-row gap-ds-12">
          <FadeSlideIn index={1} className="min-w-0 flex-1">
            <ShortcutCard
              label={shortcutLabel(primary)}
              thumbs={primary === 'promoter' ? ownedFlyers : primary === 'artist' ? compactUris(artist?.avatarUrl) : ticketFlyers}
              fallback={primary === 'artist' ? artist?.stageName || user.displayName : user.displayName}
              onPress={() => router.push(shortcutHref(primary) as Href)}
            />
          </FadeSlideIn>
          <FadeSlideIn index={2} className="min-w-0 flex-1">
            <ShortcutCard
              label="Siguiendo"
              thumbs={following.map((row) => row.avatarUrl).filter((uri): uri is string => Boolean(uri))}
              fallback={following[0]?.stageName || user.displayName}
              onPress={() => router.push('/tickets' as Href)}
            />
          </FadeSlideIn>
        </View>

        {cta ? (
          <FadeSlideIn index={3}>
            <Surface elevated className="flex-row items-center gap-ds-16" onPress={cta.onPress}>
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

        {editing ? (
          <AccountEditor
            name={name}
            phone={phone}
            error={error}
            saved={saved}
            saving={saving}
            phoneRef={phoneFieldRef}
            onName={setName}
            onPhone={setPhone}
            onSave={() => {
              if (!phoneFieldRef.current?.validate()) return;
              setSaving(true);
              setSaved(false);
              void api.auth
                .updateMe({ displayName: name, phone })
                .then(() => {
                  setError(null);
                  setSaved(true);
                  setEditing(false);
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

        <View className="mt-ds-8">
          <SettingsRow
            icon={<MenuIcon icon={CircleUser} />}
            label="Editar perfil"
            onPress={() => setEditing((value) => !value)}
            divided={false}
          />
          <SettingsRow icon={<MenuIcon icon={UserRound} />} label="Apariencia" trailing={<ThemeToggle />} divided={false} />
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
                label="Crear fecha"
                onPress={() => router.push('/event/create' as Href)}
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
}: {
  user: Omit<User, 'password'>;
  role: string;
  tickets: number;
  following: number;
  dates: number;
}) {
  const initials = user.displayName.slice(0, 2).toUpperCase();
  return (
    <Surface elevated className="flex-row items-center gap-ds-16 p-ds-24">
      <View className="min-w-0 flex-1 items-center gap-ds-12">
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
      <View className="w-[42%] justify-center">
        <Stat value={tickets} label="Tiquetes" />
        <View className="my-ds-12 h-px bg-border" />
        <Stat value={following} label="Siguiendo" />
        <View className="my-ds-12 h-px bg-border" />
        <Stat value={dates} label="Fechas" />
      </View>
    </Surface>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View className="gap-ds-4">
      <Text variant="headingSm">{value}</Text>
      <Text variant="muted">{label}</Text>
    </View>
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
    <Surface elevated onPress={onPress} className="min-h-[176px] justify-between">
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

function AccountEditor({
  name,
  phone,
  error,
  saved,
  saving,
  phoneRef,
  onName,
  onPhone,
  onSave,
}: {
  name: string;
  phone: string;
  error: string | null;
  saved: boolean;
  saving: boolean;
  phoneRef: Ref<PhoneFieldHandle>;
  onName: (value: string) => void;
  onPhone: (value: string) => void;
  onSave: () => void;
}) {
  return (
    <Surface muted className="gap-ds-16">
      <MediaPicker kind="avatar" onUploaded={() => void api.auth.me()} />
      <Field label="Nombre" value={name} onChangeText={onName} />
      <PhoneField ref={phoneRef} label="Teléfono" value={phone} onChange={onPhone} />
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

function MenuIcon({ icon, danger = false }: { icon: typeof CircleUser; danger?: boolean }) {
  return <Icon as={icon} size={22} className={danger ? 'text-danger' : 'text-foreground'} />;
}

function shortcutLabel(primary: PrimaryProfile) {
  if (primary === 'promoter') return 'Tus fechas';
  if (primary === 'artist') return 'Tu vitrina';
  return 'Tiquetes';
}

function shortcutHref(primary: PrimaryProfile) {
  if (primary === 'promoter') return '/operate';
  if (primary === 'artist') return '/artist/edit';
  return '/tickets?tab=tickets';
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
      title: 'Crea tu primera fecha',
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
