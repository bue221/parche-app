import type { TicketStatus } from '@/data/types';

export function formatTicketDate(iso?: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const days = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
  const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
  return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
}

export function formatTicketTime(iso?: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function cityFromAddress(address?: string): string {
  const value = address?.trim();
  if (!value) return '—';
  const parts = value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  return parts[parts.length - 1] ?? '—';
}

export function ticketStubCode(eventName: string | undefined, ticketId: string): string {
  const tokens = (eventName ?? '').toUpperCase().match(/[A-Z0-9]+/g) ?? [];
  const marked = tokens.find((token) => /\d/.test(token));
  const slug = (marked ?? tokens.join('')).slice(0, 4) || 'PARC';
  const tail = ticketId.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase() || '0000';
  return `TCK-${slug}-${tail}`;
}

export type WalletTicketGroupId = 'ready' | 'pending' | 'archive';

const WALLET_TICKET_GROUPS: { id: WalletTicketGroupId; title: string; statuses: TicketStatus[] }[] = [
  { id: 'ready', title: 'Para mostrar', statuses: ['valid'] },
  { id: 'pending', title: 'Pago pendiente', statuses: ['reserved'] },
  { id: 'archive', title: 'Usadas y cedidas', statuses: ['used', 'transferred'] },
];

export function isArchivedTicket(status: TicketStatus) {
  return status === 'used' || status === 'transferred';
}

export type WalletEventStack<T extends { eventId: string }> = {
  eventId: string;
  tickets: T[];
};

export type WalletStatusSection<T extends { status: TicketStatus; eventId: string }> = {
  id: WalletTicketGroupId;
  title: string;
  events: WalletEventStack<T>[];
};

export function boletaCountLabel(count: number) {
  return count === 1 ? '1 boleta' : `${count} boletas`;
}

export type WalletEventCounts = {
  available: number;
  used: number;
  pending: number;
  transferred: number;
};

export function walletEventCounts<T extends { status: TicketStatus }>(tickets: T[]): WalletEventCounts {
  const counts: WalletEventCounts = { available: 0, used: 0, pending: 0, transferred: 0 };
  for (const ticket of tickets) {
    if (ticket.status === 'valid') counts.available += 1;
    else if (ticket.status === 'used') counts.used += 1;
    else if (ticket.status === 'reserved') counts.pending += 1;
    else if (ticket.status === 'transferred') counts.transferred += 1;
  }
  return counts;
}

function countPhrase(count: number, one: string, many: string) {
  if (count <= 0) return null;
  return count === 1 ? `1 ${one}` : `${count} ${many}`;
}

export function walletCountLabel(counts: WalletEventCounts) {
  return [
    counts.available === 1 ? '1 disponible' : `${counts.available} disponibles`,
    countPhrase(counts.pending, 'pendiente', 'pendientes'),
    countPhrase(counts.used, 'usada', 'usadas'),
    countPhrase(counts.transferred, 'cedida', 'cedidas'),
  ]
    .filter(Boolean)
    .join(' · ');
}

const TICKET_STATUS_ORDER: TicketStatus[] = ['valid', 'reserved', 'used', 'transferred'];

export function eventWalletTickets<T extends { id: string; eventId: string; status: TicketStatus }>(
  tickets: T[],
  eventId: string
): T[] {
  return tickets
    .filter((ticket) => ticket.eventId === eventId && ticket.status !== 'cancelled')
    .sort((a, b) => TICKET_STATUS_ORDER.indexOf(a.status) - TICKET_STATUS_ORDER.indexOf(b.status));
}

export function groupWalletEvents<T extends { eventId: string; status: TicketStatus }>(tickets: T[]) {
  const stacks = groupTicketsByEvent(tickets.filter((ticket) => ticket.status !== 'cancelled'));
  return stacks.sort((a, b) => {
    const rank = (items: T[]) => {
      if (items.some((ticket) => ticket.status === 'valid')) return 0;
      if (items.some((ticket) => ticket.status === 'reserved')) return 1;
      return 2;
    };
    return rank(a.tickets) - rank(b.tickets);
  });
}

export function siblingWalletTickets<T extends { id: string; eventId: string; status: TicketStatus }>(
  tickets: T[],
  current: Pick<T, 'id' | 'eventId' | 'status'>
): T[] {
  const group = WALLET_TICKET_GROUPS.find((item) => item.statuses.includes(current.status));
  if (!group) return tickets.filter((ticket) => ticket.id === current.id);
  const siblings = tickets.filter(
    (ticket) => ticket.eventId === current.eventId && group.statuses.includes(ticket.status)
  );
  if (siblings.some((ticket) => ticket.id === current.id)) return siblings;
  const missing = tickets.find((ticket) => ticket.id === current.id);
  return missing ? [...siblings, missing] : siblings;
}

export function groupTicketsByEvent<T extends { eventId: string }>(tickets: T[]): WalletEventStack<T>[] {
  const stacks: WalletEventStack<T>[] = [];
  const indexByEvent = new Map<string, number>();
  for (const ticket of tickets) {
    const existing = indexByEvent.get(ticket.eventId);
    if (existing == null) {
      indexByEvent.set(ticket.eventId, stacks.length);
      stacks.push({ eventId: ticket.eventId, tickets: [ticket] });
      continue;
    }
    stacks[existing].tickets.push(ticket);
  }
  return stacks;
}

export function groupWalletTickets<T extends { status: TicketStatus; eventId: string }>(
  tickets: T[]
): WalletStatusSection<T>[] {
  return WALLET_TICKET_GROUPS.map((group) => ({
    ...group,
    events: groupTicketsByEvent(tickets.filter((ticket) => group.statuses.includes(ticket.status))),
  })).filter((group) => group.events.length > 0);
}
