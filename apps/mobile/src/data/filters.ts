import { create } from 'zustand';

import type { EventFilters } from '@/data/types';

export type FilterScope = 'agenda' | 'map';

type FilterState = {
  agenda: EventFilters;
  map: EventFilters;
  setFilters: (scope: FilterScope, filters: EventFilters) => void;
};

const store = create<FilterState>((set) => ({
  agenda: {},
  map: {},
  setFilters: (scope, filters) => set({ [scope]: filters }),
}));

export function useFilters(scope: FilterScope) {
  const filters = store((s) => s[scope]);
  const setScopeFilters = store((s) => s.setFilters);
  return {
    filters,
    setFilters: (next: EventFilters) => setScopeFilters(scope, next),
  };
}
