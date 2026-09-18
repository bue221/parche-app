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

export function groupWalletTickets<T extends { status: TicketStatus }>(tickets: T[]) {
  return WALLET_TICKET_GROUPS.map((group) => ({
    ...group,
    tickets: tickets.filter((ticket) => group.statuses.includes(ticket.status)),
  })).filter((group) => group.tickets.length > 0);
}
