import { ApiRequestError, apiGet, EVENT_REVALIDATE_SECONDS } from "@/lib/api";
import {
  listPublishedEvents,
  type EventImage,
  type PublicEventCard,
} from "@/lib/events";

export { EVENT_REVALIDATE_SECONDS };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ArtistLinks = {
  instagram?: string;
  soundcloud?: string;
};

export type PublicArtist = {
  id: string;
  name: string;
  bio?: string;
  links: ArtistLinks;
  avatar?: EventImage;
  followersCount: number;
  upcoming: PublicEventCard[];
};

export function isArtistId(value: string): boolean {
  return UUID_RE.test(value);
}

export function artistPath(id: string): string {
  return `/artistas/${id}`;
}

export async function getArtist(id: string): Promise<PublicArtist | null> {
  if (!isArtistId(id)) return null;

  try {
    const [raw, eventsBody] = await Promise.all([
      apiGet<unknown>(`/v1/artists/${id}`),
      apiGet<unknown>(`/v1/artists/${id}/events?when=upcoming&limit=50`).catch(
        () => ({ items: [] }),
      ),
    ]);
    const artist = mapArtist(raw);
    if (!artist) return null;

    const rec = asRecord(eventsBody);
    const rows = Array.isArray(rec.items) ? rec.items : [];
    const upcoming: PublicEventCard[] = [];
    for (const row of rows) {
      const card = mapLooseEventCard(row);
      if (card) upcoming.push(card);
    }

    if (upcoming.length === 0 && artist.upcoming.length > 0) {
      return artist;
    }
    return { ...artist, upcoming };
  } catch (error) {
    if (
      error instanceof ApiRequestError &&
      (error.status === 404 || error.status === 410)
    ) {
      return null;
    }
    throw error;
  }
}

/** Build artist sitemap candidates from published event lineups (no public artist list API). */
export async function listIndexableArtistIds(): Promise<string[]> {
  const events = await listPublishedEvents();
  const ids = new Set<string>();
  for (const event of events) {
    for (const slot of event.lineup) {
      if (isArtistId(slot.artistId)) ids.add(slot.artistId);
    }
  }
  return [...ids];
}

function mapArtist(raw: unknown): PublicArtist | null {
  const rec = asRecord(raw);
  const id = str(rec.id);
  const name = str(rec.name);
  if (!id || !name) return null;

  const linksRec = asRecord(rec.links);
  const upcomingRaw = Array.isArray(rec.upcoming) ? rec.upcoming : [];
  const upcoming: PublicEventCard[] = [];
  for (const row of upcomingRaw) {
    const card = mapLooseEventCard(row);
    if (card) upcoming.push(card);
  }

  return {
    id,
    name,
    bio: optionalStr(rec.bio),
    links: {
      instagram: optionalStr(linksRec.instagram),
      soundcloud: optionalStr(linksRec.soundcloud),
    },
    avatar: mapImage(rec.avatar),
    followersCount: num(rec.followers_count) ?? 0,
    upcoming,
  };
}

function mapLooseEventCard(raw: unknown): PublicEventCard | null {
  const rec = asRecord(raw);
  const id = str(rec.id);
  const title = str(rec.title);
  const startsAt = str(rec.starts_at);
  if (!id || !title || !startsAt) return null;
  return {
    id,
    slug: optionalStr(rec.slug),
    title,
    startsAt,
    endsAt: optionalStr(rec.ends_at),
    addressText: optionalStr(rec.address_text),
    venueName: optionalStr(rec.venue_name),
    lat: num(rec.lat),
    lng: num(rec.lng),
    genres: stringList(rec.genres),
    agePolicy: optionalStr(rec.age_policy),
    flyer: mapImage(rec.flyer),
    lineup: [],
    updatedAt: optionalStr(rec.updated_at),
  };
}

function mapImage(raw: unknown): EventImage | undefined {
  const rec = asRecord(raw);
  const publicUrl = absoluteMedia(str(rec.public_url));
  if (!publicUrl) return undefined;
  return {
    id: str(rec.id),
    kind: str(rec.kind) || "avatar",
    publicUrl,
    thumbUrl: absoluteMedia(str(rec.thumb_url)),
  };
}

function absoluteMedia(url: string): string | undefined {
  if (!url) return undefined;
  const base = (process.env.API_URL ?? "http://localhost:8080").replace(
    /\/$/,
    "",
  );
  if (/^https?:\/\//i.test(url)) return url;
  return `${base}${url.startsWith("/") ? url : `/${url}`}`;
}

function asRecord(raw: unknown): Record<string, unknown> {
  return raw !== null && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function optionalStr(value: unknown): string | undefined {
  const next = str(value);
  return next || undefined;
}

function num(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => str(item)).filter(Boolean);
}
