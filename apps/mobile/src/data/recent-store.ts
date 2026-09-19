import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { debugLog } from '@/data/log';

const KEY = 'parche.recent.v2';
const LEGACY_KEY = 'parche.recent.v1';
const MAX_ITEMS = 12;

export type RecentEntry = {
  eventId: string;
  viewedAt: number;
};

type RecentState = {
  items: RecentEntry[];
  buckets: Record<string, RecentEntry[]>;
  ownerId: string | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  adoptOwner: (userId: string | null) => void;
  record: (eventId: string) => void;
  clear: () => void;
  remove: (eventId: string) => void;
};

type PersistShape = {
  buckets: Record<string, RecentEntry[]>;
};

let hydrateInFlight: Promise<void> | null = null;

function persist(buckets: Record<string, RecentEntry[]>) {
  void AsyncStorage.setItem(KEY, JSON.stringify({ buckets } satisfies PersistShape)).catch((err) => {
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

function parseBuckets(raw: unknown): Record<string, RecentEntry[]> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const rec = raw as { buckets?: unknown };
  if (!rec.buckets || typeof rec.buckets !== 'object' || Array.isArray(rec.buckets)) return {};
  const buckets: Record<string, RecentEntry[]> = {};
  for (const [ownerId, rows] of Object.entries(rec.buckets as Record<string, unknown>)) {
    if (!ownerId.trim()) continue;
    buckets[ownerId] = normalize(rows);
  }
  return buckets;
}

export const useRecentStore = create<RecentState>((set, get) => {
  function write(ownerId: string, items: RecentEntry[]) {
    const buckets = { ...get().buckets, [ownerId]: items };
    set({ items, buckets, ownerId });
    persist(buckets);
  }

  return {
    items: [],
    buckets: {},
    ownerId: null,
    hydrated: false,
    hydrate: async () => {
      if (get().hydrated) {
        return;
      }
      if (hydrateInFlight) {
        await hydrateInFlight;
        return;
      }
      hydrateInFlight = (async () => {
        try {
          const raw = await AsyncStorage.getItem(KEY);
          const buckets = raw ? parseBuckets(JSON.parse(raw)) : {};
          void AsyncStorage.removeItem(LEGACY_KEY).catch(() => undefined);
          const ownerId = get().ownerId;
          set({
            buckets,
            items: ownerId ? normalize(buckets[ownerId] ?? []) : [],
            hydrated: true,
          });
          return;
        } catch (err) {
          debugLog('recent', 'hydrate failed', { message: String(err) });
        }
        set({ hydrated: true });
      })();
      try {
        await hydrateInFlight;
      } finally {
        hydrateInFlight = null;
      }
    },
    adoptOwner: (userId) => {
      const ownerId = userId?.trim() || null;
      const items = ownerId ? normalize(get().buckets[ownerId] ?? []) : [];
      set({ ownerId, items });
      debugLog('recent', ownerId ? 'owner adopted' : 'owner cleared');
    },
    record: (eventId) => {
      const ownerId = get().ownerId;
      if (!ownerId) return;
      const id = eventId.trim();
      if (!id) return;
      write(
        ownerId,
        [{ eventId: id, viewedAt: Date.now() }, ...get().items.filter((row) => row.eventId !== id)].slice(0, MAX_ITEMS)
      );
    },
    clear: () => {
      const ownerId = get().ownerId;
      if (!ownerId) {
        set({ items: [] });
        return;
      }
      write(ownerId, []);
    },
    remove: (eventId) => {
      const ownerId = get().ownerId;
      const items = get().items.filter((row) => row.eventId !== eventId);
      if (!ownerId) {
        set({ items });
        return;
      }
      write(ownerId, items);
    },
  };
});
