import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { debugLog } from '@/data/log';

const KEY = 'parche.recent.v1';
const MAX_ITEMS = 12;

export type RecentEntry = {
  eventId: string;
  viewedAt: number;
};

type RecentState = {
  items: RecentEntry[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  record: (eventId: string) => void;
  clear: () => void;
  remove: (eventId: string) => void;
};

function persist(items: RecentEntry[]) {
  void AsyncStorage.setItem(KEY, JSON.stringify(items)).catch((err) => {
    debugLog('recent', 'persist failed', { message: String(err) });
  });
}

function normalize(raw: unknown): RecentEntry[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const items: RecentEntry[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const eventId = typeof (row as RecentEntry).eventId === 'string' ? (row as RecentEntry).eventId.trim() : '';
    const viewedAt = Number((row as RecentEntry).viewedAt);
    if (!eventId || !Number.isFinite(viewedAt) || seen.has(eventId)) continue;
    seen.add(eventId);
    items.push({ eventId, viewedAt });
    if (items.length >= MAX_ITEMS) break;
  }
  return items;
}

export const useRecentStore = create<RecentState>((set, get) => ({
  items: [],
  hydrated: false,
  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      const fromDisk = raw ? normalize(JSON.parse(raw)) : [];
      const current = get().items;
      if (current.length === 0) {
        set({ items: fromDisk, hydrated: true });
        return;
      }
      const merged = [...current];
      for (const row of fromDisk) {
        if (!merged.some((item) => item.eventId === row.eventId)) {
          merged.push(row);
        }
      }
      const items = merged.slice(0, MAX_ITEMS);
      set({ items, hydrated: true });
      persist(items);
      return;
    } catch (err) {
      debugLog('recent', 'hydrate failed', { message: String(err) });
    }
    set({ hydrated: true });
  },
  record: (eventId) => {
    const id = eventId.trim();
    if (!id) return;
    const items = [{ eventId: id, viewedAt: Date.now() }, ...get().items.filter((row) => row.eventId !== id)].slice(
      0,
      MAX_ITEMS
    );
    set({ items });
    persist(items);
  },
  clear: () => {
    set({ items: [] });
    persist([]);
  },
  remove: (eventId) => {
    const items = get().items.filter((row) => row.eventId !== eventId);
    set({ items });
    persist(items);
  },
}));
