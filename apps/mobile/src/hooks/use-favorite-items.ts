import { useQueries, useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import { api } from '@/data/client';
import { useInterestStore } from '@/data/interest-store';
import { useRecentStore } from '@/data/recent-store';
import { useAuthSnapshot } from '@/data/session';

function uniqueById<T extends { id: string }>(rows: T[]): T[] {
  return rows.filter((row, index, list) => list.findIndex((item) => item.id === row.id) === index);
}

function present<T>(value: T | null | undefined): value is T {
  return value != null;
}

export function useFavoriteItems() {
  const { isLoggedIn, hydrated } = useAuthSnapshot();
  const artistIds = useInterestStore((s) => s.artistIds);
  const eventIds = useInterestStore((s) => s.eventIds);
  const recentEntries = useRecentStore((s) => s.items);
  const recentHydrated = useRecentStore((s) => s.hydrated);

  useEffect(() => {
    if (!recentHydrated) {
      void useRecentStore.getState().hydrate();
    }
  }, [recentHydrated]);

  const savedQuery = useQuery({
    queryKey: ['saved-events'],
    queryFn: () => api.events.saved(),
    enabled: hydrated && isLoggedIn,
  });
  const followingQuery = useQuery({
    queryKey: ['following'],
    queryFn: () => api.artists.following(),
    enabled: hydrated && isLoggedIn,
  });
  const localEvents = useQueries({
    queries: eventIds.map((eventId) => ({
      queryKey: ['event', eventId],
      queryFn: () => api.events.get(eventId),
      enabled: hydrated && eventIds.length > 0,
    })),
  });
  const localArtists = useQueries({
    queries: artistIds.map((artistId) => ({
      queryKey: ['artist', artistId],
      queryFn: () => api.artists.get(artistId),
      enabled: hydrated && artistIds.length > 0,
    })),
  });
  const recentQueries = useQueries({
    queries: recentEntries.map((entry) => ({
      queryKey: ['event', entry.eventId],
      queryFn: () => api.events.get(entry.eventId),
      enabled: recentHydrated && recentEntries.length > 0,
    })),
  });

  const savedEvents = uniqueById([
    ...(savedQuery.data ?? []),
    ...localEvents.map((query) => query.data).filter(present),
  ]);
  const savedArtists = uniqueById([
    ...(followingQuery.data ?? []),
    ...localArtists.map((query) => query.data).filter(present),
  ]);
  const recentEvents = recentEntries.map((_, index) => recentQueries[index]?.data).filter(present);

  const queriesLoading =
    (isLoggedIn && (savedQuery.isLoading || followingQuery.isLoading)) ||
    localEvents.some((query) => query.isLoading) ||
    localArtists.some((query) => query.isLoading) ||
    recentQueries.some((query) => query.isLoading);

  const error = savedQuery.error ?? followingQuery.error ?? null;

  function refetch() {
    void savedQuery.refetch();
    void followingQuery.refetch();
    for (const query of localEvents) void query.refetch();
    for (const query of localArtists) void query.refetch();
    for (const query of recentQueries) void query.refetch();
  }

  return {
    hydrated,
    isLoggedIn,
    savedEvents,
    savedArtists,
    recentEvents,
    lastViewedAt: recentEntries[0]?.viewedAt,
    isLoading: queriesLoading,
    error,
    refetch,
  };
}
