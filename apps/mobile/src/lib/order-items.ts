import type { OrderItem, TicketType } from '@/data/types';

export function mergeOrderItems(items: OrderItem[]): OrderItem[] {
  const qty = new Map<string, number>();
  for (const item of items) {
    const n = Math.floor(item.quantity);
    if (!item.ticketTypeId || n < 1) {
      continue;
    }
    qty.set(item.ticketTypeId, (qty.get(item.ticketTypeId) ?? 0) + n);
  }
  return [...qty.entries()].map(([ticketTypeId, quantity]) => ({ ticketTypeId, quantity }));
}

export function orderItemsTotalCents(items: OrderItem[], types: TicketType[]): number {
  return items.reduce((sum, item) => {
    const type = types.find((entry) => entry.id === item.ticketTypeId);
    return sum + (type ? type.priceCents * item.quantity : 0);
  }, 0);
}

export function orderItemsLabel(items: OrderItem[], types: TicketType[]): string {
  return items
    .map((item) => {
      const type = types.find((entry) => entry.id === item.ticketTypeId);
      return `${item.quantity} ${type?.name ?? 'etapa'}`;
    })
    .join(' · ');
}
