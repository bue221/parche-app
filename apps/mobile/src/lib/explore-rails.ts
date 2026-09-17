import type { EventFilters, ParcheEvent } from '@/data/types';
import { endOfDayISO, monthRange, startOfDayISO, toDateInput, weekendRange } from '@/lib/format';
import { GENRE_CHIPS } from '@/lib/genres';

export const DATE_CHIPS = [
  { id: 'hoy', label: 'Hoy' },
  { id: 'finde', label: 'Fin de semana' },
  { id: 'mes', label: 'Este mes' },
] as const;

export type DateChipId = (typeof DATE_CHIPS)[number]['id'];

export function datePreset(id: DateChipId) {
  if (id === 'hoy') return { from: startOfDayISO(), to: endOfDayISO() };
  if (id === 'finde') return weekendRange();
  return monthRange();
}

export function activeDateChip(from?: string, to?: string): DateChipId | undefined {
  return DATE_CHIPS.find((chip) => {
    const range = datePreset(chip.id);
    return toDateInput(from) === toDateInput(range.from) && toDateInput(to) === toDateInput(range.to);
  })?.id;
}

export function matchesExploreFilters(event: ParcheEvent, filters: EventFilters): boolean {
  if (filters.genre) {
    const genres = event.genres?.length ? event.genres : event.genre ? [event.genre] : [];
    if (!genres.includes(filters.genre)) return false;
  }
  if (filters.from && new Date(event.startsAt).getTime() < new Date(filters.from).getTime()) return false;
  if (filters.to && new Date(event.startsAt).getTime() > new Date(filters.to).getTime()) return false;
  const q = filters.q?.trim().toLowerCase();
  if (q) {
    const hay = `${event.name} ${event.venueName} ${event.addressText} ${event.genre}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

export function genreRails(
  events: ParcheEvent[],
  genreFilter?: string,
): { genre: string; events: ParcheEvent[] }[] {
  if (genreFilter) return [];
  const grouped = new Map<string, ParcheEvent[]>();
  for (const event of events) {
    const key = event.genre?.trim();
    if (!key) continue;
    const list = grouped.get(key);
    if (list) list.push(event);
    else grouped.set(key, [event]);
  }
  const ordered: { genre: string; events: ParcheEvent[] }[] = [];
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
