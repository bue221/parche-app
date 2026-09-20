"use client";

import { EventCard } from "@/components/events/event-card";
import { useExploreStore } from "@/data/explore-store";
import type { EventListFilters, PublicEventCard } from "@/lib/events";
import { cn } from "@/lib/utils";

function ExploreFeed({
  events,
  className,
}: {
  events: readonly PublicEventCard[];
  className?: string;
}) {
  const selectedId = useExploreStore((s) => s.selectedId);
  const setSelectedId = useExploreStore((s) => s.setSelectedId);
  const filters = useExploreStore((s) => s.filters);

  if (events.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-start gap-ds-8 py-ds-48",
          className,
        )}
      >
        <p className="font-favorit text-subheading font-bold text-foreground">
          No hay eventos
        </p>
        <p className="max-w-sm text-body-sm text-muted-foreground">
          {hasFilterCopy(filters)
            ? "Prueba quitar filtros o buscar otra cosa."
            : "Cuando publiquen la próxima fecha, aparece aquí."}
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid gap-x-ds-16 gap-y-ds-24",
        "grid-cols-1 sm:grid-cols-2 xl:grid-cols-[repeat(auto-fill,minmax(260px,1fr))]",
        className,
      )}
    >
      {events.map((event, index) => (
        <EventCard
          key={event.id}
          event={event}
          variant="listing"
          delayMs={Math.min(index, 10) * 30}
          selected={selectedId === event.id}
          sizes="(min-width: 1120px) 18vw, (min-width: 900px) 22vw, 45vw"
          onHover={setSelectedId}
        />
      ))}
    </div>
  );
}

function hasFilterCopy(filters: EventListFilters): boolean {
  return Boolean(
    filters.q?.trim() || filters.genre || filters.from || filters.to,
  );
}

export { ExploreFeed };
