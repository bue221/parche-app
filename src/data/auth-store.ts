import { create } from 'zustand';

import type { Me } from '@/data/mock/api';
import type { DevicePermission, DevicePermissions, Membership } from '@/data/types';

type AuthState = {
  me: Me | null;
  memberships: Membership[];
  tenantId: string | null;
  followingIds: string[];
  pendingPath: string | null;
  hydrated: boolean;
  accessExpiresAt: number;
  permissions: DevicePermissions;
  setMe: (me: Me | null) => void;
  setTenantId: (id: string | null) => void;
  setFollowingIds: (ids: string[]) => void;
  setPendingPath: (path: string | null) => void;
  setHydrated: (value: boolean) => void;
  setAccessExpiresAt: (at: number) => void;
  setPermission: (kind: 'location' | 'camera', value: DevicePermission) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  me: null,
  memberships: [],
  tenantId: null,
  followingIds: [],
  pendingPath: null,
  hydrated: false,
  accessExpiresAt: 0,
  permissions: { location: 'undetermined', camera: 'undetermined' },
  setMe: (me) =>
    set({
      me,
      memberships: me?.memberships ?? [],
    }),
  setTenantId: (tenantId) => set({ tenantId }),
  setFollowingIds: (followingIds) => set({ followingIds }),
  setPendingPath: (pendingPath) => set({ pendingPath }),
  setHydrated: (hydrated) => set({ hydrated }),
  setAccessExpiresAt: (accessExpiresAt) => set({ accessExpiresAt }),
  setPermission: (kind, value) =>
    set((s) => ({ permissions: { ...s.permissions, [kind]: value } })),
}));
