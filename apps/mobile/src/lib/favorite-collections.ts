import type { Artist, ParcheEvent } from '@/data/types';
import { eventCity, eventYear, formatRelativePast } from '@/lib/format';

export type FavoriteCollectionKind = 'recent' | 'city' | 'artists';

export type FavoriteCollection = {
  id: string;
  kind: FavoriteCollectionKind;
  title: string;
  subtitle: string;
  coverUrls: string[];
  collage: boolean;
  eventIds: string[];
  artistIds: string[];
};

export function citySlug(city: string): string {
  const slug = city
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'ciudad';
}

export function cityCollectionId(city: string, year: number): string {
  return `c-${year}-${citySlug(city)}`;
}

export function savedCountLabel(count: number): string {
  return count === 1 ? '1 guardado' : `${count} guardados`;
}

export function followCountLabel(count: number): string {
  return count === 1 ? '1 seguido' : `${count} seguidos`;
}

export function coverUrlsFromEvents(events: ParcheEvent[], limit = 4): string[] {
  const urls: string[] = [];
  for (const event of events) {
    if (event.flyerUrl && !urls.includes(event.flyerUrl)) {
      urls.push(event.flyerUrl);
      if (urls.length >= limit) break;
    }
  }
  return urls;
}

export function coverUrlsFromArtists(artists: Artist[], limit = 4): string[] {
  const urls: string[] = [];
  for (const artist of artists) {
    if (artist.avatarUrl && !urls.includes(artist.avatarUrl)) {
      urls.push(artist.avatarUrl);
      if (urls.length >= limit) break;
    }
  }
  return urls;
}

export function buildFavoriteCollections(input: {
  recentEvents: ParcheEvent[];
  lastViewedAt?: number;
  savedEvents: ParcheEvent[];
  artists: Artist[];
  now?: number;
}): FavoriteCollection[] {
  const collections: FavoriteCollection[] = [];

  if (input.recentEvents.length > 0) {
    collections.push({
      id: 'recent',
      kind: 'recent',
      title: 'Vistos recientemente',
      subtitle:
        input.lastViewedAt != null ? formatRelativePast(input.lastViewedAt, input.now) : 'Tus últimas fechas',
      coverUrls: coverUrlsFromEvents(input.recentEvents),
      collage: true,
      eventIds: input.recentEvents.map((event) => event.id),
      artistIds: [],
    });
  }

  const groups = new Map<string, { city: string; year: number; events: ParcheEvent[] }>();
  for (const event of input.savedEvents) {
    const city = eventCity(event.addressText);
    const year = eventYear(event.startsAt);
    const id = cityCollectionId(city, year);
    const current = groups.get(id);
    if (current) {
      current.events.push(event);
    } else {
      groups.set(id, { city, year, events: [event] });
    }
  }

  const cityCollections = [...groups.entries()]
    .sort((a, b) => {
      const yearDelta = b[1].year - a[1].year;
      if (yearDelta !== 0) return yearDelta;
      const countDelta = b[1].events.length - a[1].events.length;
      if (countDelta !== 0) return countDelta;
      return a[1].city.localeCompare(b[1].city, 'es');
    })
    .map(([id, group]) => ({
      id,
      kind: 'city' as const,
      title: `${group.city} ${group.year}`,
      subtitle: savedCountLabel(group.events.length),
      coverUrls: coverUrlsFromEvents(group.events, 1),
      collage: false,
      eventIds: group.events.map((event) => event.id),
      artistIds: [],
    }));

  collections.push(...cityCollections);

  if (input.artists.length > 0) {
    collections.push({
      id: 'artists',
      kind: 'artists',
      title: 'Artistas',
      subtitle: followCountLabel(input.artists.length),
      coverUrls: coverUrlsFromArtists(input.artists, 1),
      collage: false,
      eventIds: [],
      artistIds: input.artists.map((artist) => artist.id),
    });
  }

  return collections;
}
