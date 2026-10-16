"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";

import { useExploreStore } from "@/data/explore-store";
import { eventPath, type PublicEventCard } from "@/lib/events";
import { formatPinDay } from "@/lib/format";
import { placeLine } from "@/lib/landing";
import { cn } from "@/lib/utils";

const BOGOTA = { lat: 4.711, lng: -74.072 };

type LocatedEvent = PublicEventCard & { lat: number; lng: number };
type LeafletNS = typeof import("leaflet");

function pinTone(genre?: string): "neon" | "volt" | "amber" {
  if (!genre) return "neon";
  let n = 0;
  for (let i = 0; i < genre.length; i += 1) n = (n + genre.charCodeAt(i)) % 3;
  return n === 1 ? "volt" : n === 2 ? "amber" : "neon";
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!,
  );
}

function ExploreMap({
  events,
  className,
}: {
  events: readonly PublicEventCard[];
  className?: string;
}) {
  const selectedId = useExploreStore((s) => s.selectedId);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const leafletRef = useRef<LeafletNS | null>(null);
  const fittedKeyRef = useRef<string>("");
  const [mapReady, setMapReady] = useState(false);

  const located = useMemo(
    () =>
      events.filter(
        (event): event is LocatedEvent =>
          event.lat != null && event.lng != null,
      ),
    [events],
  );

  const locatedKey = useMemo(
    () => located.map((e) => e.id).join(","),
    [located],
  );

  const selected = located.find((event) => event.id === selectedId) ?? null;

  useEffect(() => {
    let cancelled = false;
    const markers = markersRef.current;

    async function mount() {
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !containerRef.current || mapRef.current) return;

      leafletRef.current = L;
      const map = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: true,
      }).setView([BOGOTA.lat, BOGOTA.lng], 11);

      L.control.zoom({ position: "topright" }).addTo(map);
      L.tileLayer("https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
        maxZoom: 19,
        subdomains: "abc",
        attribution: "&copy; OSM &copy; HOT",
      }).addTo(map);

      map.on("click", () => {
        useExploreStore.getState().setSelectedId(null);
      });
      mapRef.current = map;
      if (!cancelled) {
        setMapReady(true);
        requestAnimationFrame(() => map.invalidateSize());
      }
    }

    void mount();

    return () => {
      cancelled = true;
      markers.forEach((marker) => marker.remove());
      markers.clear();
      mapRef.current?.remove();
      mapRef.current = null;
      fittedKeyRef.current = "";
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || !containerRef.current) return;
    const ro = new ResizeObserver(() => {
      map.invalidateSize({ animate: false });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!mapReady || !map || !L) return;

    syncMarkers(L, map, markersRef.current, located, selectedId, (id) => {
      useExploreStore.getState().setSelectedId(id);
    });
  }, [located, selectedId, mapReady]);

  // Fit overview only when the set of pins changes — never on hover/selection.
  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!mapReady || !map || !L || located.length === 0) return;
    if (fittedKeyRef.current === locatedKey) return;
    fittedKeyRef.current = locatedKey;
    const bounds = L.latLngBounds(
      located.map((e) => [e.lat, e.lng] as [number, number]),
    );
    map.fitBounds(bounds.pad(0.2), { maxZoom: 13, animate: false });
  }, [located, locatedKey, mapReady]);

  return (
    <div
      className={cn(
        "relative h-full min-h-[320px] overflow-hidden bg-muted",
        className,
      )}
    >
      <div ref={containerRef} className="absolute inset-0 z-0 explore-leaflet" />
      {located.length === 0 ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 p-ds-24 text-center backdrop-blur-sm">
          <p className="max-w-xs font-favorit text-body-sm text-muted-foreground">
            No hay pines en esta vista. Vuelve a la lista o limpia los filtros.
          </p>
        </div>
      ) : null}
      {selected ? (
        <div className="absolute inset-x-ds-12 bottom-ds-12 z-20 rounded-cards border border-border bg-glass p-ds-16 shadow-card backdrop-blur-xl">
          <p className="font-favorit text-body-sm font-bold text-foreground">
            {selected.title}
          </p>
          <p className="mt-ds-4 line-clamp-1 text-caption text-muted-foreground">
            {placeLine(selected) || formatPinDay(selected.startsAt)}
          </p>
          <Link
            href={eventPath(selected)}
            className="mt-ds-12 inline-flex font-favorit text-caption font-bold tracking-favorit text-aurora uppercase outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-aurora"
          >
            Ver detalles
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function syncMarkers(
  L: LeafletNS,
  map: LeafletMap,
  existing: Map<string, Marker>,
  events: LocatedEvent[],
  selectedId: string | null,
  setSelectedId: (id: string | null) => void,
) {
  const keep = new Set(events.map((e) => e.id));

  for (const [id, marker] of existing) {
    if (!keep.has(id)) {
      map.removeLayer(marker);
      existing.delete(id);
    }
  }

  for (const event of events) {
    const tone = pinTone(event.genres[0]);
    const on = selectedId === event.id;
    const html = `<div class="parche-pill ${tone}${on ? " on" : ""}"><span class="dot"></span>${escapeHtml(formatPinDay(event.startsAt))}</div>`;
    const icon = L.divIcon({
      className: "parche-pin-wrap",
      html,
      iconSize: [108, 36],
      iconAnchor: [54, 40],
    });

    let marker = existing.get(event.id);
    if (!marker) {
      marker = L.marker([event.lat, event.lng], { icon });
      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        setSelectedId(event.id);
      });
      marker.addTo(map);
      existing.set(event.id, marker);
    } else {
      marker.setIcon(icon);
      marker.setLatLng([event.lat, event.lng]);
    }
  }
}

export { ExploreMap };
