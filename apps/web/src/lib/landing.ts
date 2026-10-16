import { LANDING_CITIES, type LandingCity } from "@/constants/cities";
import type { EventLineupSlot, PublicEventCard } from "@/lib/events";

export type CityExploreItem = LandingCity & { count: number };

export type TrendingArtist = {
  key: string;
  name: string;
  avatarUrl?: string;
  eventTitle: string;
};

function placeHaystack(event: PublicEventCard): string {
  return [event.venueName, event.addressText].filter(Boolean).join(" ");
}

export function cityExploreItems(
  events: readonly PublicEventCard[],
): CityExploreItem[] {
  return LANDING_CITIES.map((city) => ({
    ...city,
    count: events.filter((event) => city.pattern.test(placeHaystack(event)))
      .length,
  }));
}

export function trendingArtists(
  events: readonly PublicEventCard[],
  limit = 8,
): TrendingArtist[] {
  const seen = new Set<string>();
  const artists: TrendingArtist[] = [];

  for (const event of events) {
    for (const slot of event.lineup) {
      const key = (slot.artistId || slot.name).trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      artists.push({
        key,
        name: slot.name,
        avatarUrl: slot.avatar?.thumbUrl ?? slot.avatar?.publicUrl,
        eventTitle: event.title,
      });
      if (artists.length >= limit) return artists;
    }
  }

  return artists;
}

export function socialAvatars(events: readonly PublicEventCard[], limit = 4): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  for (const event of events) {
    const src = event.flyer?.thumbUrl ?? event.flyer?.publicUrl;
    if (!src || seen.has(src)) continue;
    seen.add(src);
    urls.push(src);
    if (urls.length >= limit) break;
  }
  return urls;
}

export function flyerSrc(event: PublicEventCard): string | undefined {
  return event.flyer?.publicUrl ?? event.flyer?.thumbUrl;
}

export function placeLine(event: PublicEventCard): string {
  return [event.venueName, event.addressText].filter(Boolean).join(" · ");
}

export function firstGenre(event: PublicEventCard): string | undefined {
  return event.genres[0];
}

export function lineupNames(slots: readonly EventLineupSlot[]): string {
  return slots.map((slot) => slot.name).filter(Boolean).join(" · ");
}
