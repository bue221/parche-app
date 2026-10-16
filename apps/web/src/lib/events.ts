import { ApiRequestError, apiGet } from "@/lib/api";

export { EVENT_REVALIDATE_SECONDS } from "@/lib/api";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const LIST_PAGE_SIZE = 50;
const LIST_MAX_PAGES = 20;

export type EventStatus =
  | "draft"
  | "pending_review"
  | "published"
  | "rejected"
  | "cancelled"
  | "archived";

export type EventImage = {
  id: string;
  kind: string;
  publicUrl: string;
  thumbUrl?: string;
};

export type EventLineupSlot = {
  artistId: string;
  name: string;
  billingOrder: number;
  startsAt?: string;
  avatar?: EventImage;
};

export type EventTrack = {
  id: string;
  title: string;
  position: number;
  durationMs?: number;
  previewUrl?: string;
  previewExpiresAt?: string;
};

export type PublicEventCard = {
  id: string;
  slug?: string;
  title: string;
  startsAt: string;
  endsAt?: string;
  addressText?: string;
  venueName?: string;
  lat?: number;
  lng?: number;
  genres: string[];
  agePolicy?: string;
  flyer?: EventImage;
  lineup: EventLineupSlot[];
  updatedAt?: string;
};

export type PublicTicketType = {
  id: string;
  name: string;
  priceCents: number;
  currency: string;
  capacity: number;
  soldCount: number;
  reservedCount: number;
  status: string;
};

export type PublicEvent = PublicEventCard & {
  slug: string;
  status: EventStatus;
  description?: string;
  venueName?: string;
  lat?: number;
  lng?: number;
  agePolicy?: string;
  lineup: EventLineupSlot[];
  tracks: EventTrack[];
  gallery: EventImage[];
  ticketTypes: PublicTicketType[];
};

export function isEventId(value: string): boolean {
  return UUID_RE.test(value);
}

export function eventPath(
  eventOrId: string | { id: string; slug?: string },
): string {
  if (typeof eventOrId === "string") return `/eventos/${eventOrId}`;
  const slug = eventOrId.slug?.trim();
  return `/eventos/${slug || eventOrId.id}`;
}

/**
 * Next may pass dynamic segments still percent-encoded (e.g. `r%C3%ADo`).
 * Normalize to NFC so API slugs and URL params compare equal.
 */
export function normalizeEventParam(param: string): string {
  let value = param.trim();
  try {
    value = decodeURIComponent(value);
  } catch {
    // Already decoded or malformed — keep trimmed input.
  }
  return value.normalize("NFC");
}

/** Resolve UUID or public slug to a full event (slug via published list scan). */
export async function resolveEvent(
  param: string,
): Promise<PublicEvent | null> {
  const key = normalizeEventParam(param);
  if (isEventId(key)) return getEvent(key);
  const published = await listPublishedEvents();
  const match = published.find(
    (event) =>
      Boolean(event.slug) && normalizeEventParam(event.slug!) === key,
  );
  if (!match) return null;
  return getEvent(match.id);
}

export function googleMapsHref(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
}

export function isPublicEvent(event: PublicEvent): boolean {
  return event.status === "published" || event.status === "cancelled";
}

export function isIndexableEvent(event: PublicEvent): boolean {
  return event.status === "published";
}

export type EventListFilters = {
  q?: string;
  from?: string;
  to?: string;
  genre?: string;
  artistId?: string;
  minLat?: number;
  minLng?: number;
  maxLat?: number;
  maxLng?: number;
  /** When true, stop after the first page (limit 50). Default: paginate all. */
  firstPageOnly?: boolean;
};

export function explorePath(filters?: EventListFilters, view?: "list" | "map"): string {
  const params = new URLSearchParams();
  if (filters?.q?.trim()) params.set("q", filters.q.trim());
  if (filters?.genre) params.set("genre", filters.genre);
  if (filters?.from) params.set("from", filters.from);
  if (filters?.to) params.set("to", filters.to);
  if (filters?.artistId) params.set("artist_id", filters.artistId);
  if (view === "map") params.set("v", "map");
  const qs = params.toString();
  return qs ? `/explorar?${qs}` : "/explorar";
}

export async function listEvents(
  filters: EventListFilters = {},
): Promise<PublicEventCard[]> {
  const items: PublicEventCard[] = [];
  let cursor: string | undefined;
  const maxPages = filters.firstPageOnly ? 1 : LIST_MAX_PAGES;

  try {
    for (let page = 0; page < maxPages; page += 1) {
      const query = new URLSearchParams({ limit: String(LIST_PAGE_SIZE) });
      if (cursor) query.set("cursor", cursor);
      if (filters.q?.trim()) query.set("q", filters.q.trim());
      if (filters.from) query.set("from", filters.from);
      if (filters.to) query.set("to", filters.to);
      if (filters.genre) query.set("genre", filters.genre);
      if (filters.artistId) query.set("artist_id", filters.artistId);
      if (filters.minLat != null) query.set("min_lat", String(filters.minLat));
      if (filters.minLng != null) query.set("min_lng", String(filters.minLng));
      if (filters.maxLat != null) query.set("max_lat", String(filters.maxLat));
      if (filters.maxLng != null) query.set("max_lng", String(filters.maxLng));

      const body = await apiGet<unknown>(`/v1/events?${query.toString()}`);
      const rec = asRecord(body);
      const rows = Array.isArray(rec.items) ? rec.items : [];
      for (const row of rows) {
        const card = mapEventCard(row);
        if (card) items.push(card);
      }

      const next = str(rec.next_cursor);
      if (!next || rows.length === 0) break;
      cursor = next;
    }
  } catch (error) {
    console.error("[events] list failed", error);
    return [];
  }

  return items;
}

export async function listPublishedEvents(): Promise<PublicEventCard[]> {
  return listEvents();
}

export async function getEvent(id: string): Promise<PublicEvent | null> {
  if (!isEventId(id)) return null;

  try {
    const [raw, tickets] = await Promise.all([
      apiGet<unknown>(`/v1/events/${id}`),
      listEventTicketTypes(id),
    ]);
    return { ...mapEvent(raw), ticketTypes: tickets };
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

export async function listEventTicketTypes(
  id: string,
): Promise<PublicTicketType[]> {
  if (!isEventId(id)) return [];

  try {
    const body = await apiGet<unknown>(`/v1/events/${id}/ticket-types`);
    const rec = asRecord(body);
    const rows = Array.isArray(rec.items) ? rec.items : [];
    const types: PublicTicketType[] = [];
    for (const row of rows) {
      const type = mapTicketType(row);
      if (type) types.push(type);
    }
    return types;
  } catch (error) {
    console.error("[events] ticket types failed", error);
    return [];
  }
}

export function ticketLeft(type: PublicTicketType): number {
  return Math.max(0, type.capacity - type.soldCount - type.reservedCount);
}

export function ticketOnSale(type: PublicTicketType): boolean {
  return type.status === "on_sale" && ticketLeft(type) > 0;
}

export function lowestOnSale(
  types: readonly PublicTicketType[],
): PublicTicketType | undefined {
  const onSale = types.filter(ticketOnSale);
  if (onSale.length === 0) return undefined;
  return onSale.reduce((min, type) =>
    type.priceCents < min.priceCents ? type : min,
  );
}

export async function getSimilarEvents(id: string): Promise<PublicEventCard[]> {
  if (!isEventId(id)) return [];

  try {
    const body = await apiGet<unknown>(`/v1/events/${id}/similar`);
    const rec = asRecord(body);
    const rows = Array.isArray(rec.events) ? rec.events : [];
    const cards: PublicEventCard[] = [];
    for (const row of rows) {
      const card = mapEventCard(row);
      if (card && card.id !== id) cards.push(card);
    }
    return cards;
  } catch (error) {
    console.error("[events] similar failed", error);
    return [];
  }
}

function mapEventCard(raw: unknown): PublicEventCard | null {
  const rec = asRecord(raw);
  const id = str(rec.id);
  const title = str(rec.title);
  const startsAt = str(rec.starts_at);
  if (!id || !title || !startsAt) return null;

  const lineupRaw = Array.isArray(rec.lineup) ? rec.lineup : [];
  const lineup = lineupRaw
    .map(mapLineupSlot)
    .filter((slot): slot is EventLineupSlot => Boolean(slot))
    .sort((a, b) => a.billingOrder - b.billingOrder);

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
    lineup,
    updatedAt: optionalStr(rec.updated_at),
  };
}

function mapEvent(raw: unknown): PublicEvent {
  const rec = asRecord(raw);
  const card = mapEventCard(raw);
  if (!card) {
    throw new ApiRequestError("Evento incompleto", 500, "/v1/events/{id}");
  }

  const tracksRaw = Array.isArray(rec.tracks) ? rec.tracks : [];
  const tracks = tracksRaw
    .map(mapTrack)
    .filter((track): track is EventTrack => Boolean(track))
    .sort((a, b) => a.position - b.position);

  const galleryRaw = Array.isArray(rec.gallery) ? rec.gallery : [];
  const gallery = galleryRaw
    .map(mapImage)
    .filter((image): image is EventImage => Boolean(image));

  return {
    ...card,
    slug: str(rec.slug),
    status: (optionalStr(rec.status) as EventStatus | undefined) ?? "published",
    description: optionalStr(rec.description),
    venueName: optionalStr(rec.venue_name),
    lat: num(rec.lat),
    lng: num(rec.lng),
    agePolicy: optionalStr(rec.age_policy),
    lineup: card.lineup,
    tracks,
    gallery,
    ticketTypes: [],
  };
}

function mapTicketType(raw: unknown): PublicTicketType | null {
  const rec = asRecord(raw);
  const id = str(rec.id);
  const name = str(rec.name);
  if (!id || !name) return null;
  return {
    id,
    name,
    priceCents: num(rec.price_cents) ?? 0,
    currency: optionalStr(rec.currency) ?? "COP",
    capacity: num(rec.capacity) ?? 0,
    soldCount: num(rec.sold_count) ?? 0,
    reservedCount: num(rec.reserved_count) ?? 0,
    status: optionalStr(rec.status) ?? "on_sale",
  };
}

function mapLineupSlot(raw: unknown): EventLineupSlot | null {
  const rec = asRecord(raw);
  const name = str(rec.name);
  if (!name) return null;
  return {
    artistId: str(rec.artist_id),
    name,
    billingOrder: num(rec.billing_order) ?? 0,
    startsAt: optionalStr(rec.starts_at),
    avatar: mapImage(rec.avatar),
  };
}

function mapTrack(raw: unknown): EventTrack | null {
  const rec = asRecord(raw);
  const id = str(rec.id);
  const title = str(rec.title);
  if (!id || !title) return null;
  return {
    id,
    title,
    position: num(rec.position) ?? 0,
    durationMs: num(rec.duration_ms),
    previewUrl: absolutePreview(str(rec.preview_url)),
    previewExpiresAt: optionalStr(rec.preview_expires_at),
  };
}

function mapImage(raw: unknown): EventImage | undefined {
  const rec = asRecord(raw);
  const publicUrl = absoluteMedia(str(rec.public_url));
  if (!publicUrl) return undefined;
  return {
    id: str(rec.id),
    kind: str(rec.kind) || "flyer",
    publicUrl,
    thumbUrl: absoluteMedia(str(rec.thumb_url)),
  };
}

function absoluteMedia(url: string): string | undefined {
  if (!url) return undefined;
  const base = (process.env.API_URL ?? "http://localhost:8080").replace(/\/$/, "");
  if (/^https?:\/\//i.test(url)) {
    try {
      const parsed = new URL(url.replace(/https?:\/\/minio:9000/gi, "http://localhost:9000"));
      if (isLoopbackHost(parsed.hostname)) {
        return `${base}${toApiMediaPath(parsed.pathname.replace(/^\/parche(?=\/|$)/, ""))}`;
      }
    } catch {
      return url;
    }
    return url;
  }
  return `${base}${toApiMediaPath(url.startsWith("/") ? url : `/${url}`)}`;
}

/** Signed audio previews must keep the query string on FS direct URLs. Loopback MinIO previews go through GET /v1/media (masters stay 404). */
function absolutePreview(url: string): string | undefined {
  if (!url) return undefined;
  const rewritten = url.replace(/https?:\/\/minio:9000/gi, "http://localhost:9000");
  if (/^https?:\/\//i.test(rewritten)) {
    try {
      const parsed = new URL(rewritten);
      if (isLoopbackHost(parsed.hostname) && isAudioPreviewPath(parsed.pathname)) {
        const path = parsed.pathname.replace(/^\/parche(?=\/|$)/, "");
        const base = (process.env.API_URL ?? "http://localhost:8080").replace(/\/$/, "");
        return `${base}${toApiMediaPath(path)}`;
      }
    } catch {
      return rewritten;
    }
    return rewritten;
  }
  const base = (process.env.API_URL ?? "http://localhost:8080").replace(/\/$/, "");
  return `${base}${rewritten.startsWith("/") ? rewritten : `/${rewritten}`}`;
}

function isAudioPreviewPath(path: string): boolean {
  return path.includes("/audio/") && (path.endsWith(".preview.mp3") || path.endsWith(".preview.m4a"));
}

function isLoopbackHost(host: string): boolean {
  return host === "localhost" || host === "127.0.0.1" || host === "minio" || host === "0.0.0.0";
}

function toApiMediaPath(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (normalized.startsWith("/v1/media/") || normalized === "/v1/media") {
    return normalized;
  }
  if (normalized.startsWith("/media/")) {
    return `/v1/media/${normalized.slice("/media/".length)}`;
  }
  if (normalized === "/media") {
    return "/v1/media";
  }
  return `/v1/media${normalized}`;
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
  return value
    .map((item) => str(item))
    .filter(Boolean);
}
