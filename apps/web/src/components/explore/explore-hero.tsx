"use client";

import {
  AudioWaveform,
  Building2,
  CalendarDays,
  Disc3,
  House,
  Music2,
  Radio,
  Search,
  Sparkles,
  Waves,
  X,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  ExploreDatePicker,
  formatDateRangeLabel,
} from "@/components/explore/explore-date-picker";
import { useExploreStore } from "@/data/explore-store";
import type { EventListFilters } from "@/lib/events";
import {
  GENRE_CHIPS,
  hasActiveFilters,
  serializeExploreQuery,
  type ExploreViewMode,
} from "@/lib/explore-filters";
import { cn } from "@/lib/utils";

const GENRE_ICONS: Record<string, LucideIcon> = {
  techno: Disc3,
  industrial: Building2,
  house: House,
  trance: Waves,
  ambient: Sparkles,
  club: Radio,
  concierto: Music2,
};

function ExploreHero({ resultCount }: { resultCount: number }) {
  const router = useRouter();
  const filters = useExploreStore((s) => s.filters);
  const viewMode = useExploreStore((s) => s.viewMode);
  const setFilters = useExploreStore((s) => s.setFilters);
  const storeQ = filters.q ?? "";
  const [draftQ, setDraftQ] = useState(storeQ);
  const [lastSyncedQ, setLastSyncedQ] = useState(storeQ);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);

  if (storeQ !== lastSyncedQ) {
    setLastSyncedQ(storeQ);
    setDraftQ(storeQ);
  }

  useEffect(() => {
    if (!calendarOpen) return;
    const onPointer = (event: MouseEvent) => {
      if (!calendarRef.current?.contains(event.target as Node)) {
        setCalendarOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCalendarOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [calendarOpen]);

  const pushState = useCallback(
    (nextFilters: EventListFilters, nextView: ExploreViewMode = viewMode) => {
      setFilters(nextFilters);
      const qs = serializeExploreQuery(nextFilters, nextView);
      router.replace(qs ? `/explorar?${qs}` : "/explorar", { scroll: false });
    },
    [router, setFilters, viewMode],
  );

  const filtered = hasActiveFilters(filters);
  const hasDates = Boolean(filters.from || filters.to);
  const dateLabel = formatDateRangeLabel(filters.from, filters.to);
  const allSelected = !filters.genre;

  const clearGenre = () => {
    pushState({ ...filters, genre: undefined });
  };

  const toggleGenre = (genre: string) => {
    pushState({
      ...filters,
      genre: filters.genre === genre ? undefined : genre,
    });
  };

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const q = draftQ.trim();
    pushState({ ...filters, q: q || undefined });
  };

  const countLabel =
    resultCount === 1 ? "1 evento" : `${resultCount} eventos`;

  return (
    <div className="flex flex-col gap-ds-12">
      {/* Airbnb-style search capsule */}
      <div className="flex flex-wrap items-center gap-ds-12">
        <div
          className={cn(
            "flex min-w-0 flex-1 items-stretch overflow-hidden rounded-full border border-border bg-background shadow-sm",
            "divide-x divide-border",
          )}
        >
          <form
            onSubmit={submitSearch}
            className="min-w-0 flex-[1.4]"
            role="search"
          >
            <label className="flex h-full min-w-0 items-center gap-ds-8 px-ds-16 py-ds-8">
              <Search size={15} className="shrink-0 text-foreground" aria-hidden />
              <div className="min-w-0 flex-1">
                <span className="block font-favorit text-[10px] font-bold tracking-favorit text-foreground uppercase">
                  Buscar
                </span>
                <input
                  type="search"
                  name="q"
                  value={draftQ}
                  onChange={(e) => setDraftQ(e.target.value)}
                  placeholder="Eventos, venues…"
                  className="w-full min-w-0 bg-transparent font-favorit text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
                  aria-label="Buscar eventos"
                />
              </div>
            </label>
          </form>

          <div className="relative flex shrink-0" ref={calendarRef}>
            <button
              type="button"
              onClick={() => setCalendarOpen((open) => !open)}
              className={cn(
                "flex h-full min-w-[9.5rem] items-center gap-ds-8 px-ds-16 py-ds-8 text-left outline-none",
                "hover:bg-muted focus-visible:bg-muted",
                hasDates && "bg-muted",
              )}
              aria-expanded={calendarOpen}
              aria-haspopup="dialog"
            >
              <CalendarDays size={15} className="shrink-0 text-foreground" aria-hidden />
              <div className="min-w-0">
                <span className="block font-favorit text-[10px] font-bold tracking-favorit text-foreground uppercase">
                  Fechas
                </span>
                <span
                  className={cn(
                    "block truncate font-favorit text-body-sm",
                    hasDates ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {hasDates ? dateLabel : "Cualquier fecha"}
                </span>
              </div>
            </button>
            {hasDates ? (
              <button
                type="button"
                aria-label="Limpiar fechas"
                className="absolute top-1/2 right-ds-8 z-10 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-full bg-muted outline-none hover:bg-secondary focus-visible:ring-2 focus-visible:ring-aurora"
                onClick={(e) => {
                  e.stopPropagation();
                  pushState({ ...filters, from: undefined, to: undefined });
                }}
              >
                <X size={12} />
              </button>
            ) : null}
            {calendarOpen ? (
              <div className="absolute top-[calc(100%+10px)] left-0 z-50 max-sm:fixed max-sm:inset-x-ds-16 max-sm:top-[28vh]">
                <ExploreDatePicker
                  from={filters.from}
                  to={filters.to}
                  onApply={(range) =>
                    pushState({
                      ...filters,
                      from: range.from,
                      to: range.to,
                    })
                  }
                  onClose={() => setCalendarOpen(false)}
                />
              </div>
            ) : null}
          </div>
        </div>

        <p className="shrink-0 font-favorit text-body-sm text-muted-foreground">
          {countLabel}
          {filtered ? " · filtrado" : " en Bogotá"}
        </p>
      </div>

      {/* Category strip with icons */}
      <div className="-mx-ds-16 overflow-x-auto px-ds-16 scrollbar-none sm:-mx-ds-24 sm:px-ds-24">
        <div className="flex w-max items-end gap-ds-4 sm:gap-ds-8">
          <CategoryChip
            label="Todo"
            icon={AudioWaveform}
            selected={allSelected}
            onClick={clearGenre}
          />
          {GENRE_CHIPS.map((genre) => {
            const Icon = GENRE_ICONS[genre] ?? Music2;
            return (
              <CategoryChip
                key={genre}
                label={genre}
                icon={Icon}
                selected={filters.genre === genre}
                onClick={() => toggleGenre(genre)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CategoryChip({
  label,
  icon: Icon,
  selected,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-[4.75rem] shrink-0 flex-col items-center gap-ds-8 border-b-2 pb-ds-8 outline-none transition-colors sm:w-[5.25rem]",
        "focus-visible:ring-2 focus-visible:ring-aurora focus-visible:ring-offset-2",
        selected
          ? "border-foreground text-foreground"
          : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
      )}
    >
      <Icon
        size={22}
        strokeWidth={selected ? 2.25 : 1.75}
        className="opacity-90"
        aria-hidden
      />
      <span className="font-favorit text-[11px] font-bold tracking-normal capitalize">
        {label}
      </span>
    </button>
  );
}

export { ExploreHero };
