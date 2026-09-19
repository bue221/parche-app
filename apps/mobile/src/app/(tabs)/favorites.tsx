import { useState } from 'react';
import { router, type Href } from 'expo-router';
import { Pressable, View } from 'react-native';

import { CollectionCard, CollectionGrid, CollectionGridItem } from '@/components/collection-card';
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback';
import { FadeSlideIn } from '@/components/motion';
import { Screen } from '@/components/screen';
import { Text } from '@/components/ui/text';
import { userMessage } from '@/data/errors';
import { toggleFollow, toggleSave } from '@/data/interest-sync';
import { debugLog } from '@/data/log';
import { useRecentStore } from '@/data/recent-store';
import { toast } from '@/data/toast-store';
import { useFavoriteItems } from '@/hooks/use-favorite-items';
import { buildFavoriteCollections, type FavoriteCollection } from '@/lib/favorite-collections';

function EditPill({ editing, onPress }: { editing: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={editing ? 'Terminar edición' : 'Editar colecciones'}
      hitSlop={8}
      onPress={onPress}
      className="h-9 min-w-11 items-center justify-center rounded-full bg-muted px-ds-16 active:opacity-70">
      <Text variant="bodySm" className="font-bold">
        {editing ? 'Listo' : 'Edita'}
      </Text>
    </Pressable>
  );
}

function CollectionSkeletons() {
  return (
    <CollectionGrid>
      {[0, 1, 2, 3].map((index) => (
        <CollectionGridItem key={index}>
          <View className="gap-ds-12">
            <Skeleton className="aspect-square w-full rounded-images" />
            <Skeleton className="h-4 w-[72%] rounded-full" />
            <Skeleton className="h-3 w-[44%] rounded-full" />
          </View>
        </CollectionGridItem>
      ))}
    </CollectionGrid>
  );
}

async function clearCollection(collection: FavoriteCollection, loggedIn: boolean): Promise<void> {
  try {
    if (collection.kind === 'recent') {
      useRecentStore.getState().clear();
      debugLog('favorites', 'cleared recents');
      return;
    }
    if (collection.kind === 'artists') {
      await Promise.all(collection.artistIds.map((artistId) => toggleFollow(artistId, loggedIn)));
      debugLog('favorites', 'cleared artists', { count: collection.artistIds.length });
      return;
    }
    await Promise.all(collection.eventIds.map((eventId) => toggleSave(eventId, loggedIn)));
    debugLog('favorites', 'cleared city collection', { id: collection.id, count: collection.eventIds.length });
  } catch (err) {
    debugLog('favorites', 'clear failed', { id: collection.id, message: String(err) });
    toast(userMessage(err) || 'No pudimos vaciar la colección');
  }
}

export default function FavoritesScreen() {
  const { hydrated, isLoggedIn, savedEvents, savedArtists, recentEvents, lastViewedAt, isLoading, error, refetch } =
    useFavoriteItems();
  const [editing, setEditing] = useState(false);

  const collections = buildFavoriteCollections({
    recentEvents,
    lastViewedAt,
    savedEvents,
    artists: savedArtists,
  });
  const hasContent = collections.length > 0;

  if (!hydrated) {
    return (
      <Screen title="Favoritos">
        <View className="mt-ds-24">
          <CollectionSkeletons />
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      title="Favoritos"
      headerAction={hasContent ? <EditPill editing={editing} onPress={() => setEditing((value) => !value)} /> : undefined}>
      <View className="mt-ds-24">
        {error && !hasContent ? (
          <ErrorState message={userMessage(error) || 'No pudimos cargar tus favoritos'} onRetry={refetch} />
        ) : null}
        {!hasContent && !isLoading ? (
          <EmptyState
            title="Nada guardado aún"
            lead="Guarda un evento o sigue un artista. También aparecen aquí los eventos que visitaste."
            actionLabel="Explorar"
            onAction={() => router.push('/' as Href)}
          />
        ) : null}
        {isLoading && !hasContent ? <CollectionSkeletons /> : null}
        {hasContent ? (
          <CollectionGrid>
            {collections.map((collection, index) => (
              <CollectionGridItem key={collection.id}>
                <FadeSlideIn index={index} className="w-full">
                  <CollectionCard
                    collection={collection}
                    editing={editing}
                    onPress={() => router.push(`/collection/${collection.id}` as Href)}
                    onRemove={() => {
                      void clearCollection(collection, isLoggedIn).then(() => {
                        if (collections.length <= 1) setEditing(false);
                      });
                    }}
                  />
                </FadeSlideIn>
              </CollectionGridItem>
            ))}
          </CollectionGrid>
        ) : null}
      </View>
    </Screen>
  );
}
