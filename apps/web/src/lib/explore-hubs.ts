import { LANDING_CITIES, type LandingCity } from "@/constants/cities";
import type { EventListFilters, PublicEventCard } from "@/lib/events";
import { GENRE_CHIPS } from "@/lib/explore-filters";
import { placeLine } from "@/lib/landing";

export type ExploreHub =
  | { kind: "genre"; slug: string; label: string }
  | { kind: "city"; slug: string; label: string; city: LandingCity };

export function resolveExploreHub(hub: string): ExploreHub | null {
  const slug = hub.trim().toLowerCase();
  if (!slug) return null;

  const genre = GENRE_CHIPS.find((item) => item === slug);
  if (genre) {
    return {
      kind: "genre",
      slug: genre,
      label: genre.charAt(0).toUpperCase() + genre.slice(1),
    };
  }

  const city = LANDING_CITIES.find((item) => item.slug === slug);
  if (city) {
    return {
      kind: "city",
      slug: city.slug,
      label: city.name,
      city,
    };
  }

  return null;
}

export function exploreHubPath(hub: ExploreHub | string): string {
  const slug = typeof hub === "string" ? hub : hub.slug;
  return `/explorar/${slug}`;
}

export function filtersForHub(hub: ExploreHub): EventListFilters {
  if (hub.kind === "genre") return { genre: hub.slug };
  return {};
}

export function filterEventsForHub(
  events: readonly PublicEventCard[],
  hub: ExploreHub,
): PublicEventCard[] {
  if (hub.kind === "genre") {
    return events.filter((event) =>
      event.genres.some((g) => g.toLowerCase() === hub.slug),
    );
  }
  return events.filter((event) => hub.city.pattern.test(placeLine(event)));
}

export function listExploreHubs(): ExploreHub[] {
  return [
    ...GENRE_CHIPS.map(
      (genre): ExploreHub => ({
        kind: "genre",
        slug: genre,
        label: genre.charAt(0).toUpperCase() + genre.slice(1),
      }),
    ),
    ...LANDING_CITIES.map(
      (city): ExploreHub => ({
        kind: "city",
        slug: city.slug,
        label: city.name,
        city,
      }),
    ),
  ];
}
