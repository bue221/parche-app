import { useQuery } from '@tanstack/react-query';

import { api } from '@/data/client';
import { isSameLocalDay, startOfDayISO, endOfDayISO } from '@/lib/format';
import { useAuthStore } from '@/data/auth-store';
import type { Membership, User } from '@/data/types';
import { primaryProfile, operateDensity } from '@/lib/profiles';
import { useMemo } from 'react';

export function useAuthSnapshot() {
  const me = useAuthStore((s) => s.me);
  const memberships = useAuthStore((s) => s.memberships);
  const hydrated = useAuthStore((s) => s.hydrated);

  return useMemo(() => {
    const user = me
      ? ({
          id: me.id,
          email: me.email,
          displayName: me.displayName,
          phone: me.phone,
          avatarUrl: me.avatarUrl,
          profiles: me.profiles,
          platformAdmin: me.platformAdmin,
        } satisfies Omit<User, 'password'>)
      : null;
    const isPromoter = Boolean(user?.profiles.includes('promoter'));
    return {
      isLoggedIn: Boolean(user),
      user,
      memberships: memberships as Membership[],
      isPromoter,
      isAdmin: Boolean(user?.platformAdmin),
      hasOperate: isPromoter || memberships.length > 0,
      hydrated,
    };
  }, [me, memberships, hydrated]);
}

export function useTabVisibility() {
  const auth = useAuthSnapshot();
  const invitesQuery = useQuery({
    queryKey: ['invites', auth.user?.id],
    queryFn: () => api.auth.invites(),
    enabled: auth.isLoggedIn && Boolean(auth.user?.id),
  });
  const tonightQuery = useQuery({
    queryKey: ['events', 'tonight-badge'],
    queryFn: () => api.events.list({ from: startOfDayISO(), to: endOfDayISO() }),
    enabled: auth.hasOperate,
  });
  const inviteCount = (invitesQuery.data ?? []).length;
  const tonightCount = (tonightQuery.data ?? []).filter((event) =>
    auth.memberships.some((m) => m.eventId === event.id && isSameLocalDay(event.startsAt))
  ).length;
  const operateBadge = inviteCount + tonightCount;
  return {
    agenda: true,
    explore: true,
    tickets: true,
    parche: true,
    operate: auth.hasOperate,
    operateBadge,
    auth,
  };
}

export function usePrimaryProfile() {
  const { user, memberships } = useAuthSnapshot();
  return {
    primary: primaryProfile(user?.profiles),
    density: operateDensity(memberships),
  };
}

export function setPendingPath(path: string | null) {
  useAuthStore.getState().setPendingPath(path);
}

export function takePendingPath(): string | null {
  const path = useAuthStore.getState().pendingPath;
  useAuthStore.getState().setPendingPath(null);
  return path;
}

export { api };
