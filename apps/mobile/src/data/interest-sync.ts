import { api } from '@/data/client';
import { useAuthStore } from '@/data/auth-store';
import { useInterestStore } from '@/data/interest-store';
import { debugLog } from '@/data/log';
import { toast } from '@/data/toast-store';
import { getQueryClient } from '@/lib/query';

export async function hydrateServerInterest(): Promise<void> {
  const userId = useAuthStore.getState().me?.id;
  if (!userId) {
    return;
  }
  try {
    const [following, saved] = await Promise.all([api.artists.following(), api.events.saved()]);
    if (useAuthStore.getState().me?.id !== userId) {
      debugLog('interest', 'server interest hydrate discarded');
      return;
    }
    useInterestStore.getState().rememberFromServer(
      following.map((artist) => artist.id),
      saved.map((event) => event.id)
    );
  } catch {
    debugLog('interest', 'server interest hydrate skipped');
  }
}

export async function reconcileInterest(): Promise<void> {
  await hydrateServerInterest();
  await syncLocalInterest();
}

export async function syncLocalInterest(): Promise<void> {
  const userId = useAuthStore.getState().me?.id;
  if (!userId) {
    return;
  }
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
    if (useAuthStore.getState().me?.id !== userId) {
      debugLog('interest', 'local sync discarded');
      return;
    }
    useInterestStore.getState().markSynced(pending.artistIds, pending.eventIds);
    debugLog('interest', 'local_follow_synced', { artists: pending.artistIds.length, events: pending.eventIds.length });
  } catch {
    debugLog('interest', 'sync failed, will retry');
    toast('No pudimos sincronizar lo guardado', 'info');
  }
}

function invalidateInterestQueries(): void {
  const client = getQueryClient();
  client.invalidateQueries({ queryKey: ['saved-events'] });
  client.invalidateQueries({ queryKey: ['following'] });
}

export async function toggleFollow(artistId: string, loggedIn: boolean): Promise<void> {
  const local = useInterestStore.getState();
  const following = local.isFollowing(artistId) || (loggedIn && api.artists.isFollowing(artistId));
  if (following) {
    local.unfollowLocal(artistId);
    if (loggedIn) {
      try {
        await api.artists.unfollow(artistId);
        invalidateInterestQueries();
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
      local.markSynced([artistId], []);
      invalidateInterestQueries();
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
        invalidateInterestQueries();
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
      local.markSynced([], [eventId]);
      invalidateInterestQueries();
    } catch {
      local.unsaveEvent(eventId);
    }
  }
}
