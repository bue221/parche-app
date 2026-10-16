"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { eventPath, type PublicEventCard } from "@/lib/events";
import { cn } from "@/lib/utils";

type LocatedEvent = PublicEventCard & { lat: number; lng: number };

const PIN_TONES = ["bg-heat", "bg-volt", "bg-amber"] as const;

function pinTone(genre: string | undefined, index: number): string {
  if (!genre) return PIN_TONES[index % PIN_TONES.length];
  let hash = 0;
  for (let i = 0; i < genre.length; i += 1) {
    hash = (hash + genre.charCodeAt(i)) % PIN_TONES.length;
  }
  return PIN_TONES[hash];
}

function paddedRange(values: number[]): { min: number; max: number } {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) {
    return { min: min - 0.02, max: max + 0.02 };
  }
  const pad = (max - min) * 0.12;
  return { min: min - pad, max: max + pad };
}

export function NightMapScene({ events }: { events: readonly LocatedEvent[] }) {
  const [activeId, setActiveId] = useState(events[0]?.id ?? null);
  const active = events.find((event) => event.id === activeId) ?? events[0];

  const layout = useMemo(() => {
    const latRange = paddedRange(events.map((event) => event.lat));
    const lngRange = paddedRange(events.map((event) => event.lng));
    const latSpan = latRange.max - latRange.min;
    const lngSpan = lngRange.max - lngRange.min;
    return events.map((event, index) => ({
      event,
      left: ((event.lng - lngRange.min) / lngSpan) * 78 + 11,
      top: (1 - (event.lat - latRange.min) / latSpan) * 70 + 14,
      tone: pinTone(event.genres[0], index),
    }));
  }, [events]);

  return (
    <div className="night-map-scene relative min-h-88 overflow-hidden rounded-cards md:min-h-112">
      {layout.map(({ event, left, top, tone }) => {
        const selected = event.id === active?.id;
        return (
          <button
            key={event.id}
            type="button"
            aria-pressed={selected}
            aria-label={event.title}
            onClick={() => setActiveId(event.id)}
            onMouseEnter={() => setActiveId(event.id)}
            onFocus={() => setActiveId(event.id)}
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-aurora"
            style={{ left: `${left}%`, top: `${top}%` }}
          >
            <span
              className={cn(
                "block size-3 rounded-full ring-2 ring-pitch-black motion-safe:transition-transform",
                tone,
                selected && "scale-150 ring-aurora",
              )}
            />
            {selected ? (
              <span className="absolute top-[calc(100%+8px)] left-1/2 w-max max-w-40 -translate-x-1/2 rounded-tags bg-pitch-black px-ds-8 py-ds-4 text-left">
                <span className="block font-favorit text-caption font-bold tracking-favorit text-paper-white">
                  {event.title}
                </span>
                {event.venueName ? (
                  <span className="block font-favorit text-caption tracking-favorit text-stone">
                    {event.venueName}
                  </span>
                ) : null}
              </span>
            ) : null}
          </button>
        );
      })}
      {active ? (
        <Link
          href={eventPath(active)}
          className="absolute right-ds-16 bottom-ds-16 z-20 rounded-buttons bg-aurora px-ds-16 py-ds-8 font-favorit text-caption font-bold tracking-favorit text-pitch-black uppercase outline-none focus-visible:ring-2 focus-visible:ring-paper-white"
        >
          Ver fecha
        </Link>
      ) : null}
    </div>
  );
}
