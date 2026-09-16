import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
};

type PersistShape = {
  artistIds: string[];
  eventIds: string[];
  lastSyncedArtists: string[];
  lastSyncedEvents: string[];
};

function persist(state: PersistShape) {
  void AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => undefined);
}

function snapshot(get: () => InterestState): PersistShape {
  return {
    artistIds: get().artistIds,
    eventIds: get().eventIds,
    lastSyncedArtists: get().lastSyncedArtists,
    lastSyncedEvents: get().lastSyncedEvents,
  };
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
        set({
          artistIds: Array.isArray(parsed.artistIds) ? parsed.artistIds : [],
          eventIds: Array.isArray(parsed.eventIds) ? parsed.eventIds : [],
          lastSyncedArtists: Array.isArray(parsed.lastSyncedArtists) ? parsed.lastSyncedArtists : [],
          lastSyncedEvents: Array.isArray(parsed.lastSyncedEvents) ? parsed.lastSyncedEvents : [],
          hydrated: true,
        });
        return;
      }
    } catch {
      /* keep empty */
    }
    set({ hydrated: true });
  },
  followLocal: (artistId) => {
    set({ artistIds: [...new Set([...get().artistIds, artistId])] });
    persist(snapshot(get));
  },
  unfollowLocal: (artistId) => {
    set({
      artistIds: get().artistIds.filter((id) => id !== artistId),
      lastSyncedArtists: get().lastSyncedArtists.filter((id) => id !== artistId),
    });
    persist(snapshot(get));
  },
  saveEvent: (eventId) => {
    set({ eventIds: [...new Set([...get().eventIds, eventId])] });
    persist(snapshot(get));
  },
  unsaveEvent: (eventId) => {
    set({
      eventIds: get().eventIds.filter((id) => id !== eventId),
      lastSyncedEvents: get().lastSyncedEvents.filter((id) => id !== eventId),
    });
    persist(snapshot(get));
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
    persist(snapshot(get));
  },
  rememberFromServer: (artists, events) => {
    set({
      artistIds: [...new Set([...get().artistIds, ...artists])],
      eventIds: [...new Set([...get().eventIds, ...events])],
      lastSyncedArtists: [...new Set([...get().lastSyncedArtists, ...artists])],
      lastSyncedEvents: [...new Set([...get().lastSyncedEvents, ...events])],
    });
    persist(snapshot(get));
  },
}));
