"use client";

import { create } from "zustand";

import type { EventListFilters } from "@/lib/events";
import type { ExploreViewMode } from "@/lib/explore-filters";

type ExploreState = {
  filters: EventListFilters;
  viewMode: ExploreViewMode;
  selectedId: string | null;
  hydrated: boolean;
  hydrate: (input: {
    filters: EventListFilters;
    viewMode: ExploreViewMode;
  }) => void;
  setFilters: (filters: EventListFilters) => void;
  setViewMode: (viewMode: ExploreViewMode) => void;
  setSelectedId: (id: string | null) => void;
};

export const useExploreStore = create<ExploreState>((set) => ({
  filters: {},
  viewMode: "list",
  selectedId: null,
  hydrated: false,
  hydrate: ({ filters, viewMode }) =>
    set({ filters, viewMode, hydrated: true, selectedId: null }),
  setFilters: (filters) => set({ filters, selectedId: null }),
  setViewMode: (viewMode) => set({ viewMode }),
  setSelectedId: (selectedId) => set({ selectedId }),
}));
