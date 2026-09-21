import { statusLabel } from '@/lib/format';

export type SaleBadgeTone = 'aurora' | 'amber' | 'muted' | 'danger';

export function agePolicyLabel(policy?: string): string {
  const raw = policy?.trim();
  if (!raw || /^all ages$/i.test(raw) || /^todas las edades$/i.test(raw)) {
    return 'Todas las edades';
  }
  return raw;
}

export function eventSaleBadge(input: {
  status: string;
  ended: boolean;
  onSaleCount: number;
}): { label: string; tone: SaleBadgeTone } {
  if (input.status === 'cancelled') return { label: 'Cancelado', tone: 'danger' };
  if (input.status === 'rejected') return { label: statusLabel(input.status), tone: 'danger' };
  if (input.status !== 'published') return { label: statusLabel(input.status), tone: 'muted' };
  if (input.ended) return { label: 'Finalizado', tone: 'muted' };
  if (input.onSaleCount > 0) return { label: 'Boletas a la venta', tone: 'aurora' };
  return { label: 'Pronto', tone: 'amber' };
}

export function ticketPanelCaption(input: {
  ended: boolean;
  empty: boolean;
  fromPrice?: string;
}): string {
  if (input.fromPrice) return `Desde ${input.fromPrice}. Un pago por evento.`;
  if (input.ended) return 'La venta ya cerró.';
  if (input.empty) return 'Aún no hay boletas a la venta.';
  return 'Pronto.';
}

export function stickyBuyLead(input: { ended: boolean; onSale: boolean }): string {
  if (input.ended) return 'La noche ya pasó. La ficha sigue visible.';
  if (input.onSale) return 'Paga en la app. El QR queda en tu wallet.';
  return 'Cuando abra la venta, compras aquí.';
}

export function ticketRowStatus(input: {
  ended: boolean;
  onSale: boolean;
  remaining: number;
}): string {
  if (input.ended) return 'No disponible';
  if (input.remaining === 0) return 'Agotada';
  if (input.onSale) {
    return `${input.remaining} ${input.remaining === 1 ? 'disponible' : 'disponibles'}`;
  }
  return 'Pronto';
}
