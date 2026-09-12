import { Image } from 'expo-image';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { View } from 'react-native';

import { BackBar } from '@/components/back-bar';
import { EventCard, EventGrid, EventGridItem } from '@/components/event-card';
import { EmptyState, ErrorState, ListingSkeleton, Skeleton } from '@/components/feedback';
import { FadeSlideIn } from '@/components/motion';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { userMessage } from '@/data/errors';
import { setPendingPath, useAuthSnapshot } from '@/data/session';

export default function ArtistPublicScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isLoggedIn, user } = useAuthSnapshot();
  const queryClient = useQueryClient();
  const { data: artist, error, refetch, isLoading } = useQuery({
    queryKey: ['artist', id],
    queryFn: () => api.artists.get(id),
  });
  const following = api.artists.isFollowing(id);

  if (error) {
    return (
      <Screen>
        <BackBar />
        <ErrorState message={userMessage(error)} onRetry={() => void refetch()} />
      </Screen>
    );
  }
  if (!artist || isLoading) {
    return (
      <Screen>
        <BackBar />
        <Skeleton className="size-24 rounded-full" />
        <Skeleton className="mt-ds-16 h-8 w-40" />
        <View className="mt-ds-24 flex-row justify-between">
          <View style={{ width: '48%' }}>
            <ListingSkeleton />
          </View>
          <View style={{ width: '48%' }}>
            <ListingSkeleton />
          </View>
        </View>
      </Screen>
    );
  }

  const isOwner = artist.userId === user?.id;

  return (
    <Screen>
      <BackBar />
      <View className="items-center gap-ds-12">
        {artist.avatarUrl ? (
          <Image source={{ uri: artist.avatarUrl }} className="size-28 rounded-full bg-muted" />
        ) : (
          <View className="size-28 items-center justify-center rounded-full bg-muted">
            <Text variant="heading">{artist.stageName.slice(0, 2).toUpperCase()}</Text>
          </View>
        )}
        <Text variant="heading" className="text-center">
          {artist.stageName}
        </Text>
        <Text variant="muted" className="text-center">
          {artist.bio || 'Sin bio'}
        </Text>
        {isOwner ? (
          <Button variant="outline" onPress={() => router.push('/artist/edit' as Href)}>
            <Text>Editar</Text>
          </Button>
        ) : (
          <Button
            variant={following ? 'outline' : 'default'}
            onPress={() => {
              if (!isLoggedIn) {
                setPendingPath(`/artist/${id}`);
                router.push('/auth/login' as Href);
                return;
              }
              void (following ? api.artists.unfollow(id) : api.artists.follow(id)).then(() =>
                queryClient.invalidateQueries({ queryKey: ['artist', id] })
              );
            }}>
            <Text>{following ? 'Siguiendo' : 'Seguir'}</Text>
          </Button>
        )}
      </View>
      <View className="mt-ds-32 gap-ds-16">
        <Text variant="headingSm">Próximas fechas</Text>
        {artist.upcoming.length === 0 ? (
          <EmptyState title="Sin fechas anunciadas" lead="Cuando publique, aparecen aquí." />
        ) : (
          <EventGrid>
            {artist.upcoming.map((event, index) => (
              <EventGridItem key={event.id}>
                <FadeSlideIn index={index}>
                  <EventCard event={event} onPress={() => router.push(`/event/${event.id}` as Href)} />
                </FadeSlideIn>
              </EventGridItem>
            ))}
          </EventGrid>
        )}
      </View>
    </Screen>
  );
}
