import { useQueries, useQuery } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { View } from 'react-native';

import { ArtistRow } from '@/components/artist-row';
import { EmptyState, ErrorState, PendingAuth } from '@/components/feedback';
import { FadeSlideIn } from '@/components/motion';
import { Screen } from '@/components/screen';
import { api } from '@/data/client';
import { userMessage } from '@/data/errors';
import { useInterestStore } from '@/data/interest-store';
import { useAuthSnapshot } from '@/data/session';
import { useRequireAuth } from '@/hooks/use-require-auth';

export default function FollowingScreen() {
  const ok = useRequireAuth('/parche/siguiendo');
  const { user } = useAuthSnapshot();
  const artistIds = useInterestStore((s) => s.artistIds);
  const followingQuery = useQuery({
    queryKey: ['following', user?.id],
    queryFn: () => api.artists.following(),
    enabled: ok && Boolean(user?.id),
  });
  const localArtists = useQueries({
    queries: artistIds.map((artistId) => ({
      queryKey: ['artist', artistId],
      queryFn: () => api.artists.get(artistId),
      enabled: ok && artistIds.length > 0,
    })),
  });

  if (!ok) {
    return <PendingAuth />;
  }

  const following = [
    ...(followingQuery.data ?? []),
    ...localArtists.map((q) => q.data).filter((artist): artist is NonNullable<typeof artist> => Boolean(artist)),
  ].filter((artist, index, list) => list.findIndex((row) => row.id === artist.id) === index);

  return (
    <Screen back title="Siguiendo" lead="Artistas que te avisan de eventos.">
      <View className="mt-ds-24 max-w-xl gap-ds-8">
        {followingQuery.error ? (
          <ErrorState message={userMessage(followingQuery.error)} onRetry={() => void followingQuery.refetch()} />
        ) : following.length === 0 ? (
          <EmptyState
            title="Todavía no sigues a nadie"
            lead="Entra a un evento y toca Seguir."
            actionLabel="Explorar"
            onAction={() => router.push('/' as Href)}
          />
        ) : (
          following.map((artist, index) => (
            <FadeSlideIn key={artist.id} index={index}>
              <ArtistRow artist={artist} onPress={() => router.push(`/artist/${artist.id}` as Href)} />
            </FadeSlideIn>
          ))
        )}
      </View>
    </Screen>
  );
}
