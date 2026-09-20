import type { Artist, ParcheEvent } from '@/data/types';
import {
  buildFavoriteCollections,
  cityCollectionId,
  citySlug,
  coverUrlsFromArtists,
  coverUrlsFromEvents,
  followCountLabel,
  savedCountLabel,
} from '@/lib/favorite-collections';

function event(id: string, overrides: Partial<ParcheEvent> = {}): ParcheEvent {
  return {
    id,
    tenantId: 'ten_1',
    ownerUserId: 'usr_1',
    name: `Evento ${id}`,
    startsAt: '2026-09-17T03:00:00.000Z',
    venueName: 'Video Club',
    addressText: 'Cra 13, Chapinero, Bogotá',
    description: '',
    flyerUrl: `https://cdn.test/${id}.jpg`,
    status: 'published',
    genre: 'techno',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  };
}

function artist(id: string, avatarUrl?: string): Artist {
  return { id, stageName: `Artista ${id}`, bio: '', avatarUrl };
}

describe('citySlug', () => {
  test.each([
    ['Bogotá', 'bogota'],
    ['Medellín', 'medellin'],
    ['San Andrés', 'san-andres'],
    ['  Santa   Marta  ', 'santa-marta'],
  ])('%s becomes %s', (city, expected) => {
    expect(citySlug(city)).toBe(expected);
  });

  test('a city with no usable characters still yields an id', () => {
    expect(citySlug('¡!¿?')).toBe('ciudad');
    expect(citySlug('')).toBe('ciudad');
  });

  test('cityCollectionId is stable and namespaced by year', () => {
    expect(cityCollectionId('Bogotá', 2026)).toBe('c-2026-bogota');
    expect(cityCollectionId('Bogotá', 2025)).not.toBe(cityCollectionId('Bogotá', 2026));
  });
});

describe('count labels', () => {
  test.each([
    [0, '0 guardados'],
    [1, '1 guardado'],
    [2, '2 guardados'],
  ])('savedCountLabel(%i)', (count, expected) => {
    expect(savedCountLabel(count)).toBe(expected);
  });

  test.each([
    [0, '0 seguidos'],
    [1, '1 seguido'],
    [2, '2 seguidos'],
  ])('followCountLabel(%i)', (count, expected) => {
    expect(followCountLabel(count)).toBe(expected);
  });
});

describe('cover urls', () => {
  test('skips events with no flyer and dedupes repeats', () => {
    const urls = coverUrlsFromEvents([
      event('a'),
      event('b', { flyerUrl: undefined }),
      event('c', { flyerUrl: 'https://cdn.test/a.jpg' }),
      event('d'),
    ]);
    expect(urls).toEqual(['https://cdn.test/a.jpg', 'https://cdn.test/d.jpg']);
  });

  test('respects the limit', () => {
    const events = ['a', 'b', 'c', 'd', 'e'].map((id) => event(id));
    expect(coverUrlsFromEvents(events)).toHaveLength(4);
    expect(coverUrlsFromEvents(events, 1)).toHaveLength(1);
  });

  test('artists without an avatar are skipped', () => {
    expect(coverUrlsFromArtists([artist('a'), artist('b', 'https://cdn.test/b.jpg')])).toEqual([
      'https://cdn.test/b.jpg',
    ]);
  });
});

describe('buildFavoriteCollections', () => {
  const now = Date.parse('2026-09-17T12:00:00.000Z');

  test('nothing saved yields no collections', () => {
    expect(buildFavoriteCollections({ recentEvents: [], savedEvents: [], artists: [], now })).toEqual([]);
  });

  test('recents lead and are timestamped when the last view is known', () => {
    const [recent] = buildFavoriteCollections({
      recentEvents: [event('a')],
      lastViewedAt: now - 3_600_000,
      savedEvents: [],
      artists: [],
      now,
    });
    expect(recent.id).toBe('recent');
    expect(recent.collage).toBe(true);
    expect(recent.subtitle).toBe('Hace 1 hora');
  });

  test('recents without a timestamp use a neutral subtitle', () => {
    const [recent] = buildFavoriteCollections({
      recentEvents: [event('a')],
      savedEvents: [],
      artists: [],
      now,
    });
    expect(recent.subtitle).toBe('Tus últimos eventos');
  });

  test('saved events group by city and year', () => {
    const collections = buildFavoriteCollections({
      recentEvents: [],
      savedEvents: [
        event('a', { addressText: 'Cra 13, Bogotá' }),
        event('b', { addressText: 'Calle 10, Medellín' }),
        event('c', { addressText: 'Cra 7, Bogotá' }),
      ],
      artists: [],
      now,
    });
    const bogota = collections.find((collection) => collection.title.startsWith('Bogotá'));
    expect(bogota?.eventIds).toEqual(['a', 'c']);
    expect(bogota?.subtitle).toBe('2 guardados');
    expect(bogota?.collage).toBe(false);
  });

  test('cities sort by year, then size, then name', () => {
    const collections = buildFavoriteCollections({
      recentEvents: [],
      savedEvents: [
        event('old', { addressText: 'Cra 13, Bogotá', startsAt: '2025-06-01T03:00:00.000Z' }),
        event('cali', { addressText: 'Calle 5, Cali' }),
        event('med1', { addressText: 'Calle 10, Medellín' }),
        event('med2', { addressText: 'Calle 11, Medellín' }),
      ],
      artists: [],
      now,
    });
    expect(collections.map((collection) => collection.title)).toEqual([
      'Medellín 2026',
      'Cali 2026',
      'Bogotá 2025',
    ]);
  });

  test('followed artists close the list', () => {
    const collections = buildFavoriteCollections({
      recentEvents: [event('a')],
      savedEvents: [event('b')],
      artists: [artist('ar_1', 'https://cdn.test/ar.jpg')],
      now,
    });
    const last = collections[collections.length - 1];
    expect(last.id).toBe('artists');
    expect(last.kind).toBe('artists');
    expect(last.artistIds).toEqual(['ar_1']);
    expect(last.eventIds).toEqual([]);
    expect(last.subtitle).toBe('1 seguido');
  });
});
