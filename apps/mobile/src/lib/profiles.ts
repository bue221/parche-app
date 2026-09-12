import type { Membership, MembershipRole, ProfileKind } from '@/data/types';

export type PrimaryProfile = 'promoter' | 'artist' | 'attendee';
export type OperateDensity = 'host' | 'door' | 'metrics' | 'empty';

export function primaryProfile(profiles: ProfileKind[] | undefined): PrimaryProfile {
  if (profiles?.includes('promoter')) return 'promoter';
  if (profiles?.includes('artist')) return 'artist';
  return 'attendee';
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
