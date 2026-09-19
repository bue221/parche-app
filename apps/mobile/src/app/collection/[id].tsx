import { router, useLocalSearchParams, type Href } from 'expo-router';
import { View } from 'react-native';

import { ArtistRow } from '@/components/artist-row';
import { EventCard, EventFeed } from '@/components/event-card';
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback';
import { Screen } from '@/components/screen';
import { userMessage } from '@/data/errors';
import { useFavoriteItems } from '@/hooks/use-favorite-items';
import { buildFavoriteCollections } from '@/lib/favorite-collections';

export default function CollectionScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { hydrated, savedEvents, savedArtists, recentEvents, lastViewedAt, isLoading, error, refetch } =
    useFavoriteItems();

  const collections = buildFavoriteCollections({
    recentEvents,
    lastViewedAt,
    savedEvents,
    artists: savedArtists,
  });
  const collection = collections.find((row) => row.id === id);
  const events = collection
    ? collection.eventIds
        .map((eventId) => [...recentEvents, ...savedEvents].find((event) => event.id === eventId))
        .filter((event): event is NonNullable<typeof event> => event != null)
    : [];
  const artists = collection
    ? collection.artistIds
        .map((artistId) => savedArtists.find((artist) => artist.id === artistId))
        .filter((artist): artist is NonNullable<typeof artist> => artist != null)
    : [];

  if (!hydrated || (isLoading && !collection)) {
    return (
      <Screen back title="Colección">
        <View className="mt-ds-24">
          <EventFeed>
            <Skeleton className="aspect-square w-full rounded-images" />
            <Skeleton className="aspect-square w-full rounded-images" />
          </EventFeed>
        </View>
      </Screen>
    );
  }

  if (error && !collection) {
    return (
      <Screen back title="Colección">
        <View className="mt-ds-24">
          <ErrorState message={userMessage(error) || 'No pudimos abrir la colección'} onRetry={refetch} />
        </View>
      </Screen>
    );
  }

  if (!collection) {
    return (
      <Screen back title="Colección">
        <View className="mt-ds-24">
          <EmptyState
            title="Esta colección ya no está"
            lead="Puede que la hayas vaciado o que el evento ya no exista."
            actionLabel="Volver a favoritos"
            onAction={() => (router.canGoBack() ? router.back() : router.replace('/favorites' as Href))}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen back title={collection.title} lead={collection.subtitle}>
      <View className="mt-ds-24 gap-ds-16">
        {events.length > 0 ? (
          <EventFeed>
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                saveable
                onPress={() => router.push(`/event/${event.id}` as Href)}
              />
            ))}
          </EventFeed>
        ) : null}
        {artists.length > 0 ? (
          <View className="gap-ds-8">
            {artists.map((artist) => (
              <ArtistRow
                key={artist.id}
                artist={artist}
                onPress={() => router.push(`/artist/${artist.id}` as Href)}
              />
            ))}
          </View>
        ) : null}
        {events.length === 0 && artists.length === 0 ? (
          <EmptyState
            title="Colección vacía"
            lead="Guarda un evento o sigue un artista para llenarla."
            actionLabel="Explorar"
            onAction={() => router.push('/' as Href)}
          />
        ) : null}
      </View>
    </Screen>
  );
}
