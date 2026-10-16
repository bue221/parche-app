"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";

import { ExploreFeed } from "@/components/explore/explore-feed";
import { ExploreHero } from "@/components/explore/explore-hero";
import { MapToggleFab } from "@/components/explore/map-toggle-fab";
import { useExploreStore } from "@/data/explore-store";
import type { EventListFilters, PublicEventCard } from "@/lib/events";
import {
  serializeExploreQuery,
  type ExploreViewMode,
} from "@/lib/explore-filters";
import { cn } from "@/lib/utils";

const ExploreMap = dynamic(
  () =>
    import("@/components/explore/explore-map").then((mod) => mod.ExploreMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[320px] items-center justify-center bg-muted">
        <p className="font-favorit text-body-sm text-muted-foreground">
          Cargando mapa…
        </p>
      </div>
    ),
  },
);

/** Same card footprint in list-only and map split. */
const CARD_GRID =
  "grid-cols-1 gap-x-ds-16 gap-y-ds-24 sm:grid-cols-2 xl:grid-cols-[repeat(auto-fill,minmax(260px,1fr))]";

function ExploreShell({
  initialEvents,
  initialFilters,
  initialViewMode,
}: {
  initialEvents: PublicEventCard[];
  initialFilters: EventListFilters;
  initialViewMode: ExploreViewMode;
}) {
  const router = useRouter();
  const hydrate = useExploreStore((s) => s.hydrate);
  const filters = useExploreStore((s) => s.filters);
  const viewMode = useExploreStore((s) => s.viewMode);
  const setFilters = useExploreStore((s) => s.setFilters);
  const setViewMode = useExploreStore((s) => s.setViewMode);
  const hydrated = useExploreStore((s) => s.hydrated);

  useEffect(() => {
    hydrate({ filters: initialFilters, viewMode: initialViewMode });
  }, [hydrate, initialFilters, initialViewMode]);

  const activeView = hydrated ? viewMode : initialViewMode;
  const showMap = activeView === "map";

  // Lock document scroll while map mode fills the viewport (no page scrollbar).
  useEffect(() => {
    if (!showMap) return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    html.dataset.exploreMap = "1";
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
      delete html.dataset.exploreMap;
    };
  }, [showMap]);

  const pushState = useCallback(
    (nextFilters: EventListFilters, nextView: ExploreViewMode) => {
      setFilters(nextFilters);
      setViewMode(nextView);
      const qs = serializeExploreQuery(nextFilters, nextView);
      router.replace(qs ? `/explorar?${qs}` : "/explorar", { scroll: false });
    },
    [router, setFilters, setViewMode],
  );

  const toggleView = () => {
    const next: ExploreViewMode = viewMode === "list" ? "map" : "list";
    pushState(filters, next);
  };

  const count = initialEvents.length;

  return (
    <div
      className={cn(
        showMap
          ? "grid h-dvh grid-cols-1 grid-rows-[auto_minmax(0,1fr)] overflow-hidden lg:grid-cols-[minmax(36rem,1fr)_minmax(28rem,40%)]"
          : "flex min-h-dvh flex-1 flex-col",
      )}
    >
      {/* Opaque sticky chrome covers the floating glass nav so cards never show through */}
      <div
        className={cn(
          "sticky top-0 z-40 bg-background",
          showMap && "lg:col-span-2",
        )}
      >
        <div
          className="h-[4.75rem] sm:h-[5.25rem]"
          aria-hidden
        />
        <div className="border-b border-border px-ds-16 py-ds-12 sm:px-ds-24">
          <ExploreHero resultCount={count} />
        </div>
      </div>

      {showMap ? (
        <>
          <div className="hidden min-h-0 overflow-y-auto overscroll-contain px-ds-20 py-ds-20 scrollbar-none lg:block">
            <ExploreFeed events={initialEvents} className={CARD_GRID} />
          </div>
          <div className="relative min-h-0 overflow-hidden border-l border-border">
            <ExploreMap events={initialEvents} className="h-full" />
            <div className="pointer-events-none absolute inset-x-0 bottom-ds-24 z-40 flex justify-center">
              <div className="pointer-events-auto">
                <MapToggleFab mode="map" onToggle={toggleView} />
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="relative mx-auto w-full max-w-page flex-1 px-ds-16 py-ds-20 pb-28 sm:px-ds-24">
          <ExploreFeed events={initialEvents} className={CARD_GRID} />
          <div className="pointer-events-none fixed inset-x-0 bottom-ds-24 z-40 flex justify-center">
            <div className="pointer-events-auto">
              <MapToggleFab mode="list" onToggle={toggleView} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { ExploreShell };
