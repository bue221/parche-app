import { useMemo } from 'react';

import { useAuthStore } from '@/data/auth-store';
import { api } from '@/data/client';
import { primaryProfile, operateDensity } from '@/lib/profiles';
import type { Membership, User } from '@/data/types';

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
  return {
    agenda: true,
    explore: true,
    tickets: auth.isLoggedIn,
    parche: true,
    operate: auth.hasOperate,
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
