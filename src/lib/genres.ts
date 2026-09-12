export const GENRE_CHIPS = ['techno', 'industrial', 'house', 'trance', 'ambient', 'club', 'concierto'] as const;

export function hasActiveFilters(filters: {
  q?: string;
  genre?: string;
  artistId?: string;
  from?: string;
  to?: string;
}): boolean {
  return Boolean(filters.q || filters.genre || filters.artistId || filters.from || filters.to);
}
