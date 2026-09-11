import { Image } from 'expo-image';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { EventCard } from '@/components/event-card';
import { EmptyState, ErrorState } from '@/components/feedback';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { userMessage } from '@/data/errors';
import { setPendingPath, useAuthSnapshot } from '@/data/session';
import { useMockStore } from '@/data/mock/store';
import type { Artist, ParcheEvent } from '@/data/types';

export default function ArtistPublicScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const revision = useMockStore((s) => s.revision);
  const { isLoggedIn, user } = useAuthSnapshot();
  const [artist, setArtist] = useState<(Artist & { upcoming: ParcheEvent[] }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const following = api.artists.isFollowing(id);

  const load = useCallback(async () => {
    try {
      setArtist(await api.artists.get(id));
      setError(null);
    } catch (err) {
      setError(userMessage(err));
    }
  }, [id, revision]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) {
    return (
      <Screen>
        <ErrorState message={error} onRetry={() => void load()} />
      </Screen>
    );
  }
  if (!artist) {
    return (
      <Screen>
        <Text variant="muted">Cargando…</Text>
      </Screen>
    );
  }

  const isOwner = artist.userId === user?.id;

  return (
    <Screen>
      <View className="gap-ds-16">
        {artist.avatarUrl ? (
          <Image source={{ uri: artist.avatarUrl }} className="size-32 rounded-cards" />
        ) : (
          <View className="size-32 items-center justify-center rounded-cards bg-muted">
            <Text variant="heading">{artist.stageName.slice(0, 2).toUpperCase()}</Text>
          </View>
        )}
        <Text variant="heading">{artist.stageName}</Text>
        <Text variant="muted">{artist.bio || 'Sin bio'}</Text>
        {isOwner ? (
          <Button variant="outline" onPress={() => router.push('/artist/edit' as Href)}>
            <Text>Editar</Text>
          </Button>
        ) : (
          <Button
            variant={following ? 'default' : 'outline'}
            onPress={() => {
              if (!isLoggedIn) {
                setPendingPath(`/artist/${id}`);
                router.push('/auth/login' as Href);
                return;
              }
              void (following ? api.artists.unfollow(id) : api.artists.follow(id));
            }}>
            <Text>{following ? 'Siguiendo' : 'Seguir'}</Text>
          </Button>
        )}
        <Text variant="headingSm">Próximas fechas</Text>
        {artist.upcoming.length === 0 ? (
          <EmptyState title="Sin fechas anunciadas" />
        ) : (
          artist.upcoming.map((event) => (
            <EventCard key={event.id} event={event} onPress={() => router.push(`/event/${event.id}` as Href)} />
          ))
        )}
      </View>
    </Screen>
  );
}
