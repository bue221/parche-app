import { Image } from 'expo-image';
import { Link, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { EmptyState } from '@/components/feedback';
import { Field } from '@/components/field';
import { MediaPicker } from '@/components/media-picker';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { userMessage } from '@/data/errors';
import { useAuthSnapshot } from '@/data/session';
import type { Artist } from '@/data/types';

export default function ParcheScreen() {
  const { isLoggedIn, user, memberships, isAdmin } = useAuthSnapshot();
  const [name, setName] = useState(user?.displayName ?? '');
  const [error, setError] = useState<string | null>(null);
  const [following, setFollowing] = useState<Artist[]>([]);

  useEffect(() => {
    setName(user?.displayName ?? '');
  }, [user?.displayName]);

  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }
    void api.artists.following().then(setFollowing);
  }, [isLoggedIn, user?.id]);

  if (!isLoggedIn || !user) {
    return (
      <Screen>
        <Text variant="heading">Parche</Text>
        <Text variant="lead" className="mt-ds-16">
          Entra o crea cuenta para wallet, follows y fechas propias.
        </Text>
        <Link href={'/auth/login' as Href} className="mt-ds-16">
          <Text className="font-bold uppercase">Entrar</Text>
        </Link>
        <Link href={'/auth/register' as Href} className="mt-ds-8">
          <Text className="font-bold uppercase">Crear cuenta</Text>
        </Link>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text variant="heading">Parche</Text>
      <View className="mt-ds-16 items-start gap-ds-16">
        {user.avatarUrl ? (
          <Image source={{ uri: user.avatarUrl }} className="size-24 rounded-cards" />
        ) : (
          <View className="size-24 items-center justify-center rounded-cards bg-muted">
            <Text variant="headingSm">{user.displayName.slice(0, 2).toUpperCase()}</Text>
          </View>
        )}
        <MediaPicker kind="avatar" onUploaded={(url) => void api.auth.updateMe({ avatarUrl: url })} />
        <Field label="Nombre" value={name} onChangeText={setName} />
        <Text variant="muted">{user.email}</Text>
        <View className="flex-row flex-wrap gap-ds-8">
          {user.profiles.map((p) => (
            <View key={p} className="rounded-tags border border-foreground px-ds-12 py-ds-4">
              <Text variant="caption" className="uppercase">
                {p}
              </Text>
            </View>
          ))}
        </View>
        {error ? <Text>{error}</Text> : null}
        <Button
          onPress={() => {
            void api.auth
              .updateMe({ displayName: name })
              .then(() => setError(null))
              .catch((err) => setError(userMessage(err)));
          }}>
          <Text>Guardar</Text>
        </Button>
        <Link href={'/artist/edit' as Href}>
          <Text className="font-bold uppercase">Perfil de artista</Text>
        </Link>
        {isAdmin ? (
          <Link href={'/admin/queue' as Href}>
            <Text className="font-bold uppercase">Cola de aprobación</Text>
          </Link>
        ) : null}
        <Link href={'/posts' as Href}>
          <Text className="font-bold uppercase">Notas</Text>
        </Link>
        <Text variant="headingSm">Following</Text>
        {following.length === 0 ? (
          <EmptyState title="Todavía no sigues a nadie" />
        ) : (
          following.map((a) => (
            <Link key={a.id} href={`/artist/${a.id}` as Href}>
              <Text>{a.stageName}</Text>
            </Link>
          ))
        )}
        <Text variant="headingSm">Membresías</Text>
        {memberships.map((m) => (
          <Link key={m.id} href={`/event/${m.eventId}` as Href}>
            <Text>
              {m.role} · {m.eventId}
            </Text>
          </Link>
        ))}
        <Button variant="outline" onPress={() => void api.auth.logout()}>
          <Text>Salir</Text>
        </Button>
      </View>
    </Screen>
  );
}
