import { create } from 'zustand';

import { createSeed } from '@/data/mock/seed';
import type { EventFilters, MockSnapshot, Session } from '@/data/types';

type MockStore = {
  data: MockSnapshot;
  session: Session | null;
  pendingPath: string | null;
  filters: EventFilters;
  revision: number;
  setData: (recipe: (draft: MockSnapshot) => void) => void;
  setSession: (session: Session | null) => void;
  setPendingPath: (path: string | null) => void;
  setFilters: (filters: EventFilters) => void;
  reset: () => void;
};

function cloneSnapshot(data: MockSnapshot): MockSnapshot {
  return JSON.parse(JSON.stringify(data)) as MockSnapshot;
}

export const useMockStore = create<MockStore>((set, get) => ({
  data: createSeed(),
  session: null,
  pendingPath: null,
  filters: {},
  revision: 0,
  setData: (recipe) => {
    const draft = cloneSnapshot(get().data);
    recipe(draft);
    set({ data: draft, revision: get().revision + 1 });
  },
  setSession: (session) => set({ session }),
  setPendingPath: (pendingPath) => set({ pendingPath }),
  setFilters: (filters) => set({ filters, revision: get().revision + 1 }),
  reset: () =>
    set({
      data: createSeed(),
      session: null,
      pendingPath: null,
      filters: {},
      revision: 0,
    }),
}));

export function getSnapshot(): MockSnapshot {
  return useMockStore.getState().data;
}

export function getSession(): Session | null {
  return useMockStore.getState().session;
}
