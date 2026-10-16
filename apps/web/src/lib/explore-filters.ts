import type { EventListFilters, PublicEventCard } from "@/lib/events";
import {
  endOfDayISO,
  isSameLocalDay,
  monthRange,
  startOfDayISO,
  toDateInput,
  weekendRange,
} from "@/lib/format";

export const GENRE_CHIPS = [
  "techno",
  "industrial",
  "house",
  "trance",
  "ambient",
  "club",
  "concierto",
] as const;

export const DATE_CHIPS = [
  { id: "hoy", label: "Hoy" },
  { id: "finde", label: "Fin de semana" },
  { id: "mes", label: "Este mes" },
] as const;

export type DateChipId = (typeof DATE_CHIPS)[number]["id"];
export type ExploreViewMode = "list" | "map";

export type ExploreSearchParams = Record<
  string,
  string | string[] | undefined
>;

export function datePreset(id: DateChipId) {
  if (id === "hoy") return { from: startOfDayISO(), to: endOfDayISO() };
  if (id === "finde") return weekendRange();
  return monthRange();
}

export function activeDateChip(
  from?: string,
  to?: string,
): DateChipId | undefined {
  return DATE_CHIPS.find((chip) => {
    const range = datePreset(chip.id);
    return (
      toDateInput(from) === toDateInput(range.from) &&
      toDateInput(to) === toDateInput(range.to)
    );
  })?.id;
}

export function hasActiveFilters(filters: EventListFilters): boolean {
  return Boolean(
    filters.q?.trim() ||
      filters.genre ||
      filters.artistId ||
      filters.from ||
      filters.to,
  );
}

function paramValue(
  params: ExploreSearchParams,
  key: string,
): string | undefined {
  const raw = params[key];
  if (Array.isArray(raw)) return raw[0]?.trim() || undefined;
  return raw?.trim() || undefined;
}

export function parseExploreSearchParams(params: ExploreSearchParams): {
  filters: EventListFilters;
  viewMode: ExploreViewMode;
} {
  const view = paramValue(params, "v");
  return {
    filters: {
      q: paramValue(params, "q"),
      genre: paramValue(params, "genre"),
      from: paramValue(params, "from"),
      to: paramValue(params, "to"),
      artistId: paramValue(params, "artist_id"),
    },
    viewMode: view === "map" ? "map" : "list",
  };
}

export function serializeExploreQuery(
  filters: EventListFilters,
  viewMode: ExploreViewMode,
): string {
  const params = new URLSearchParams();
  if (filters.q?.trim()) params.set("q", filters.q.trim());
  if (filters.genre) params.set("genre", filters.genre);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.artistId) params.set("artist_id", filters.artistId);
  if (viewMode === "map") params.set("v", "map");
  return params.toString();
}

export function tonightEvents(
  events: readonly PublicEventCard[],
): PublicEventCard[] {
  return events.filter((event) => isSameLocalDay(event.startsAt));
}

export function genreRails(
  events: readonly PublicEventCard[],
  genreFilter?: string,
): { genre: string; events: PublicEventCard[] }[] {
  if (genreFilter) return [];
  const grouped = new Map<string, PublicEventCard[]>();
  for (const event of events) {
    const key = (event.genres[0] ?? "").trim();
    if (!key) continue;
    const list = grouped.get(key);
    if (list) list.push(event);
    else grouped.set(key, [event]);
  }
  const ordered: { genre: string; events: PublicEventCard[] }[] = [];
  const seen = new Set<string>();
  for (const genre of GENRE_CHIPS) {
    const list = grouped.get(genre);
    if (!list?.length) continue;
    ordered.push({ genre, events: list });
    seen.add(genre);
  }
  for (const [genre, list] of grouped) {
    if (seen.has(genre) || list.length === 0) continue;
    ordered.push({ genre, events: list });
  }
  return ordered;
}
