import type { Membership, MembershipRole, ProfileKind } from '@/data/types';

export type PrimaryProfile = 'promoter' | 'artist' | 'attendee';
export type OperateDensity = 'host' | 'door' | 'metrics' | 'empty';

export type ProfileMascotMeta = {
  name: string;
  hint: string;
};

export const PROFILE_MASCOTS: Record<ProfileKind, ProfileMascotMeta> = {
  attendee: {
    name: 'Tucán',
    hint: 'Sale al parche. Trópico y rumba.',
  },
  artist: {
    name: 'Cóndor',
    hint: 'Vuela en el escenario. Está en el escudo.',
  },
  promoter: {
    name: 'Jaguar',
    hint: 'Arma la noche. Selva y mando.',
  },
};

export function primaryProfile(profiles: ProfileKind[] | undefined): PrimaryProfile {
  if (profiles?.includes('promoter')) return 'promoter';
  if (profiles?.includes('artist')) return 'artist';
  return 'attendee';
}

export function profileMascot(kind: ProfileKind): ProfileMascotMeta {
  return PROFILE_MASCOTS[kind];
}

export function operateDensity(memberships: Membership[]): OperateDensity {
  const active = memberships.filter((m) => m.status === 'active');
  if (active.length === 0) return 'empty';
  if (active.some((m) => m.role === 'owner' || m.role === 'manager')) return 'host';
  if (active.some((m) => m.role === 'door')) return 'door';
  return 'metrics';
}

export function profileLabel(kind: ProfileKind): string {
  if (kind === 'promoter') return 'Organizador';
  if (kind === 'artist') return 'Artista';
  return 'Asistente';
}

export function membershipRoleLabel(role: MembershipRole): string {
  if (role === 'owner') return 'Owner';
  if (role === 'manager') return 'Manager';
  if (role === 'door') return 'Puerta';
  return 'Métricas';
}
