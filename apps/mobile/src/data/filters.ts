import { create } from 'zustand';

import type { EventFilters } from '@/data/types';

type FilterState = {
  filters: EventFilters;
  setFilters: (next: EventFilters) => void;
};

export const useFilters = create<FilterState>((set) => ({
  filters: {},
  setFilters: (filters) => set({ filters }),
}));
