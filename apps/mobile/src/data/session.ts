import { useMemo } from 'react';

import { api } from '@/data/client';
import { getSession, useMockStore } from '@/data/mock/store';
import type { Membership, User } from '@/data/types';

export function useAuthSnapshot() {
  const session = useMockStore((s) => s.session);
  const users = useMockStore((s) => s.data.users);
  const memberships = useMockStore((s) => s.data.memberships);
  const revision = useMockStore((s) => s.revision);

  return useMemo(() => {
    const live = getSession();
    if (!live) {
      return {
        isLoggedIn: false,
        user: null as Omit<User, 'password'> | null,
        memberships: [] as Membership[],
        isPromoter: false,
        isAdmin: false,
        hasOperate: false,
      };
    }
    const raw = users.find((u) => u.id === live.userId);
    const user = raw
      ? (() => {
          const { password, ...safe } = raw;
          void password;
          return safe;
        })()
      : null;
    const mine = memberships.filter((m) => m.userId === live.userId && m.status === 'active');
    const isPromoter = Boolean(user?.profiles.includes('promoter'));
    return {
      isLoggedIn: Boolean(user),
      user,
      memberships: mine,
      isPromoter,
      isAdmin: Boolean(user?.platformAdmin),
      hasOperate: isPromoter || mine.length > 0,
    };
    // revision forces recompute after store mutations
  }, [session, users, memberships, revision]);
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

export function setPendingPath(path: string | null) {
  useMockStore.getState().setPendingPath(path);
}

export function takePendingPath(): string | null {
  const path = useMockStore.getState().pendingPath;
  useMockStore.getState().setPendingPath(null);
  return path;
}

export { api };
