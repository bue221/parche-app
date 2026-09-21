import type { TicketType } from '@/data/types';

export function ticketRemaining(type: Pick<TicketType, 'capacity' | 'sold' | 'reserved'>): number {
  return Math.max(0, type.capacity - type.sold - type.reserved);
}

export function saleRemaining(types: readonly Pick<TicketType, 'capacity' | 'sold' | 'reserved'>[]): number {
  return types.reduce((sum, type) => sum + ticketRemaining(type), 0);
}

export function lowestPriced<T extends Pick<TicketType, 'priceCents'>>(types: readonly T[]): T | undefined {
  if (types.length === 0) return undefined;
  return types.reduce((min, type) => (type.priceCents < min.priceCents ? type : min));
}

export function buyCtaLabel(ended: boolean, onSaleCount: number): string {
  if (ended) return 'Finalizado';
  if (onSaleCount > 0) return 'Comprar boletas';
  return 'Pronto';
}

export function buyPriceCaption(ended: boolean, onSaleCount: number, emptyTickets: boolean): string {
  if (ended) return 'Cerrado';
  if (onSaleCount > 0) return 'Desde';
  if (emptyTickets) return 'Boleta';
  return 'Pronto';
}

export function ticketsScarce(remaining: number): boolean {
  return remaining > 0 && remaining <= 12;
}
