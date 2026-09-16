import { api } from '@/data/client';
import { useInterestStore } from '@/data/interest-store';
import { debugLog } from '@/data/log';
import { toast } from '@/data/toast-store';

export async function syncLocalInterest(): Promise<void> {
  const state = useInterestStore.getState();
  if (!state.hydrated) {
    return;
  }
  const pending = state.pending();
  if (pending.artistIds.length === 0 && pending.eventIds.length === 0) {
    return;
  }
  try {
    await api.auth.syncInterest(pending);
    useInterestStore.getState().markSynced(pending.artistIds, pending.eventIds);
    debugLog('interest', 'local_follow_synced', { artists: pending.artistIds.length, events: pending.eventIds.length });
  } catch {
    debugLog('interest', 'sync failed, will retry');
    toast('No pudimos sincronizar lo guardado', 'info');
  }
}

export async function toggleFollow(artistId: string, loggedIn: boolean): Promise<void> {
  const local = useInterestStore.getState();
  const following = local.isFollowing(artistId) || (loggedIn && api.artists.isFollowing(artistId));
  if (following) {
    local.unfollowLocal(artistId);
    if (loggedIn) {
      try {
        await api.artists.unfollow(artistId);
      } catch {
        local.followLocal(artistId);
      }
    }
    return;
  }
  local.followLocal(artistId);
  if (loggedIn) {
    try {
      await api.artists.follow(artistId);
    } catch {
      local.unfollowLocal(artistId);
    }
  }
}

export async function toggleSave(eventId: string, loggedIn: boolean): Promise<void> {
  const local = useInterestStore.getState();
  const saved = local.isSaved(eventId);
  if (saved) {
    local.unsaveEvent(eventId);
    if (loggedIn) {
      try {
        await api.events.unsave(eventId);
      } catch {
        local.saveEvent(eventId);
      }
    }
    return;
  }
  local.saveEvent(eventId);
  if (loggedIn) {
    try {
      await api.events.save(eventId);
    } catch {
      local.unsaveEvent(eventId);
    }
  }
}
