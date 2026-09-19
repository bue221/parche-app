import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { debugLog } from '@/data/log';

const KEY = 'parche.interest.v1';

type InterestState = {
  artistIds: string[];
  eventIds: string[];
  lastSyncedArtists: string[];
  lastSyncedEvents: string[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  followLocal: (artistId: string) => void;
  unfollowLocal: (artistId: string) => void;
  saveEvent: (eventId: string) => void;
  unsaveEvent: (eventId: string) => void;
  isFollowing: (artistId: string) => boolean;
  isSaved: (eventId: string) => boolean;
  pending: () => { artistIds: string[]; eventIds: string[] };
  markSynced: (artists: string[], events: string[]) => void;
  rememberFromServer: (artists: string[], events: string[]) => void;
  clearAccount: () => void;
  dropSynced: () => void;
};

type PersistShape = {
  artistIds: string[];
  eventIds: string[];
  lastSyncedArtists: string[];
  lastSyncedEvents: string[];
};

function persistPending(get: () => InterestState) {
  const pending = get().pending();
  void AsyncStorage.setItem(
    KEY,
    JSON.stringify({
      artistIds: pending.artistIds,
      eventIds: pending.eventIds,
      lastSyncedArtists: [],
      lastSyncedEvents: [],
    } satisfies PersistShape)
  ).catch(() => undefined);
}

export const useInterestStore = create<InterestState>((set, get) => ({
  artistIds: [],
  eventIds: [],
  lastSyncedArtists: [],
  lastSyncedEvents: [],
  hydrated: false,
  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PersistShape>;
        const lastSyncedArtists = Array.isArray(parsed.lastSyncedArtists) ? parsed.lastSyncedArtists : [];
        const lastSyncedEvents = Array.isArray(parsed.lastSyncedEvents) ? parsed.lastSyncedEvents : [];
        const artistIds = (Array.isArray(parsed.artistIds) ? parsed.artistIds : []).filter(
          (id) => !lastSyncedArtists.includes(id)
        );
        const eventIds = (Array.isArray(parsed.eventIds) ? parsed.eventIds : []).filter(
          (id) => !lastSyncedEvents.includes(id)
        );
        set({
          artistIds,
          eventIds,
          lastSyncedArtists: [],
          lastSyncedEvents: [],
          hydrated: true,
        });
        persistPending(get);
        return;
      }
    } catch {
      /* keep empty */
    }
    set({ hydrated: true });
  },
  followLocal: (artistId) => {
    set({ artistIds: [...new Set([...get().artistIds, artistId])] });
    persistPending(get);
  },
  unfollowLocal: (artistId) => {
    set({
      artistIds: get().artistIds.filter((id) => id !== artistId),
      lastSyncedArtists: get().lastSyncedArtists.filter((id) => id !== artistId),
    });
    persistPending(get);
  },
  saveEvent: (eventId) => {
    set({ eventIds: [...new Set([...get().eventIds, eventId])] });
    persistPending(get);
  },
  unsaveEvent: (eventId) => {
    set({
      eventIds: get().eventIds.filter((id) => id !== eventId),
      lastSyncedEvents: get().lastSyncedEvents.filter((id) => id !== eventId),
    });
    persistPending(get);
  },
  isFollowing: (artistId) => get().artistIds.includes(artistId),
  isSaved: (eventId) => get().eventIds.includes(eventId),
  pending: () => ({
    artistIds: get().artistIds.filter((id) => !get().lastSyncedArtists.includes(id)),
    eventIds: get().eventIds.filter((id) => !get().lastSyncedEvents.includes(id)),
  }),
  markSynced: (artists, events) => {
    set({
      lastSyncedArtists: [...new Set([...get().lastSyncedArtists, ...artists])],
      lastSyncedEvents: [...new Set([...get().lastSyncedEvents, ...events])],
    });
    persistPending(get);
  },
  rememberFromServer: (artists, events) => {
    const pending = get().pending();
    set({
      artistIds: [...new Set([...pending.artistIds, ...artists])],
      eventIds: [...new Set([...pending.eventIds, ...events])],
      lastSyncedArtists: [...new Set(artists)],
      lastSyncedEvents: [...new Set(events)],
    });
    persistPending(get);
  },
  clearAccount: () => {
    set({
      artistIds: [],
      eventIds: [],
      lastSyncedArtists: [],
      lastSyncedEvents: [],
    });
    persistPending(get);
    debugLog('interest', 'account interest cleared');
  },
  dropSynced: () => {
    const pending = get().pending();
    set({
      artistIds: pending.artistIds,
      eventIds: pending.eventIds,
      lastSyncedArtists: [],
      lastSyncedEvents: [],
    });
    persistPending(get);
    debugLog('interest', 'synced interest dropped', {
      pendingArtists: pending.artistIds.length,
      pendingEvents: pending.eventIds.length,
    });
  },
}));
