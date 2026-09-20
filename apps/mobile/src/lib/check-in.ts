import type { TagTone } from '@/components/ui/tag';
import type { CheckInCode } from '@/data/types';

/** Door overlay stamps. Keep uppercase — that beat is a printer, not a caption. */
export const CHECK_IN_STAMP: Record<CheckInCode, string> = {
  approved: 'PASA',
  duplicate: 'YA USADO',
  invalid: 'INVÁLIDO',
  wrong_event: 'OTRO EVENTO',
  expired: 'VENCIDO',
  forbidden: 'SIN PERMISO',
};

export const CHECK_IN_LABEL: Record<CheckInCode, string> = {
  approved: 'Pasa',
  duplicate: 'Ya usado',
  invalid: 'Inválido',
  wrong_event: 'Otro evento',
  expired: 'Vencido',
  forbidden: 'Sin permiso',
};

export function checkInTone(result: CheckInCode): TagTone {
  if (result === 'approved') return 'confirm';
  if (result === 'duplicate') return 'amber';
  return 'danger';
}

export function isApprovedCheckIn(result: CheckInCode) {
  return result === 'approved';
}

export function isDuplicateCheckIn(result: CheckInCode) {
  return result === 'duplicate';
}

export function isRejectedCheckIn(result: CheckInCode) {
  return result !== 'approved' && result !== 'duplicate';
}

export function scannerFallback(userId: string) {
  const tail = userId.replace(/[^a-zA-Z0-9]/g, '').slice(-4);
  return tail ? `Puerta ·${tail}` : 'Puerta';
}

export function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function personInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || '?';
}
