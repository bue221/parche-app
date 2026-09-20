import type { TicketStatus } from '@/data/types';
import {
  boletaCountLabel,
  cityFromAddress,
  eventWalletTickets,
  formatTicketDate,
  groupTicketsByEvent,
  groupWalletEvents,
  groupWalletTickets,
  isArchivedTicket,
  siblingWalletTickets,
  ticketStubCode,
  walletCountLabel,
  walletEventCounts,
} from '@/lib/ticket-label';

type WalletTicket = { id: string; eventId: string; status: TicketStatus };

function ticket(id: string, eventId: string, status: TicketStatus): WalletTicket {
  return { id, eventId, status };
}

describe('formatTicketDate', () => {
  test('renders the printed date in uppercase Spanish', () => {
    expect(formatTicketDate('2026-09-17T03:00:00.000Z')).toMatch(/^[A-ZÁÉÍÓÚ]{3} \d{1,2} [A-Z]{3}$/);
  });

  test.each([undefined, '', 'not-a-date'])('renders a dash for %p instead of Invalid Date', (value) => {
    expect(formatTicketDate(value)).toBe('—');
  });
});

describe('cityFromAddress', () => {
  test('takes the last comma-separated segment', () => {
    expect(cityFromAddress('Cra 13 #55-20, Chapinero, Bogotá')).toBe('Bogotá');
  });

  test('tolerates stray commas and whitespace', () => {
    expect(cityFromAddress('  Bogotá ,, ')).toBe('Bogotá');
  });

  test.each([undefined, '', '   '])('renders a dash for %p', (value) => {
    expect(cityFromAddress(value)).toBe('—');
  });
});

describe('ticketStubCode', () => {
  test('prefers the token that carries a number', () => {
    expect(ticketStubCode('Parche 003 Nocturno', 'tkt_9f3a')).toBe('TCK-003-9F3A');
  });

  test('joins words when no token has a number', () => {
    expect(ticketStubCode('Techno Bogotá', 'tkt_abcd')).toBe('TCK-TECH-ABCD');
  });

  test.each([
    ['missing event name', undefined, 'tkt_abcd', 'TCK-PARC-ABCD'],
    ['symbols-only name', '¡!¿?', 'tkt_abcd', 'TCK-PARC-ABCD'],
    ['symbols-only id', 'Parche', '___', 'TCK-PARC-0000'],
  ])('falls back on %s', (_label, name, id, expected) => {
    expect(ticketStubCode(name, id)).toBe(expected);
  });

  test('is stable for the same ticket', () => {
    expect(ticketStubCode('Parche', 'tkt_abcd')).toBe(ticketStubCode('Parche', 'tkt_abcd'));
  });
});

describe('wallet counts', () => {
  test('buckets every status', () => {
    const counts = walletEventCounts([
      ticket('t1', 'evt_1', 'valid'),
      ticket('t2', 'evt_1', 'valid'),
      ticket('t3', 'evt_1', 'used'),
      ticket('t4', 'evt_1', 'reserved'),
      ticket('t5', 'evt_1', 'transferred'),
    ]);
    expect(counts).toEqual({ available: 2, used: 1, pending: 1, transferred: 1 });
  });

  test('cancelled tickets count as nothing', () => {
    expect(walletEventCounts([ticket('t1', 'evt_1', 'cancelled')])).toEqual({
      available: 0,
      used: 0,
      pending: 0,
      transferred: 0,
    });
  });

  test('the label always states availability, even at zero', () => {
    expect(walletCountLabel({ available: 0, used: 0, pending: 0, transferred: 0 })).toBe('0 disponibles');
  });

  test('the label singularizes and drops empty buckets', () => {
    expect(walletCountLabel({ available: 1, used: 1, pending: 0, transferred: 0 })).toBe('1 disponible · 1 usada');
  });

  test.each([
    [1, '1 boleta'],
    [0, '0 boletas'],
    [3, '3 boletas'],
  ])('boletaCountLabel(%i) is %s', (count, expected) => {
    expect(boletaCountLabel(count)).toBe(expected);
  });

  test('used and transferred are the archive', () => {
    expect(isArchivedTicket('used')).toBe(true);
    expect(isArchivedTicket('transferred')).toBe(true);
    expect(isArchivedTicket('valid')).toBe(false);
    expect(isArchivedTicket('reserved')).toBe(false);
  });
});

describe('eventWalletTickets', () => {
  const tickets = [
    ticket('t_used', 'evt_1', 'used'),
    ticket('t_valid', 'evt_1', 'valid'),
    ticket('t_cancelled', 'evt_1', 'cancelled'),
    ticket('t_reserved', 'evt_1', 'reserved'),
    ticket('t_other', 'evt_2', 'valid'),
  ];

  test('keeps only the event and hides cancelled tickets', () => {
    expect(eventWalletTickets(tickets, 'evt_1').map((entry) => entry.id)).toEqual([
      't_valid',
      't_reserved',
      't_used',
    ]);
  });

  test('returns nothing for an event with no tickets', () => {
    expect(eventWalletTickets(tickets, 'evt_404')).toEqual([]);
  });
});

describe('grouping', () => {
  test('groupTicketsByEvent preserves first-seen event order', () => {
    const stacks = groupTicketsByEvent([
      ticket('t1', 'evt_2', 'valid'),
      ticket('t2', 'evt_1', 'valid'),
      ticket('t3', 'evt_2', 'used'),
    ]);
    expect(stacks.map((stack) => stack.eventId)).toEqual(['evt_2', 'evt_1']);
    expect(stacks[0].tickets.map((entry) => entry.id)).toEqual(['t1', 't3']);
  });

  test('groupWalletEvents floats events with a showable ticket to the top', () => {
    const stacks = groupWalletEvents([
      ticket('t_archive', 'evt_archive', 'used'),
      ticket('t_pending', 'evt_pending', 'reserved'),
      ticket('t_ready', 'evt_ready', 'valid'),
    ]);
    expect(stacks.map((stack) => stack.eventId)).toEqual(['evt_ready', 'evt_pending', 'evt_archive']);
  });

  test('groupWalletEvents drops cancelled tickets entirely', () => {
    expect(groupWalletEvents([ticket('t1', 'evt_1', 'cancelled')])).toEqual([]);
  });

  test('groupWalletTickets omits sections with no tickets', () => {
    const sections = groupWalletTickets([ticket('t1', 'evt_1', 'valid')]);
    expect(sections.map((section) => section.id)).toEqual(['ready']);
  });

  test('groupWalletTickets splits ready, pending and archive', () => {
    const sections = groupWalletTickets([
      ticket('t1', 'evt_1', 'valid'),
      ticket('t2', 'evt_1', 'reserved'),
      ticket('t3', 'evt_1', 'transferred'),
    ]);
    expect(sections.map((section) => section.id)).toEqual(['ready', 'pending', 'archive']);
  });
});

describe('siblingWalletTickets', () => {
  const tickets = [
    ticket('t1', 'evt_1', 'valid'),
    ticket('t2', 'evt_1', 'valid'),
    ticket('t3', 'evt_1', 'used'),
    ticket('t4', 'evt_2', 'valid'),
  ];

  test('pages across tickets of the same event and status', () => {
    const siblings = siblingWalletTickets(tickets, { id: 't1', eventId: 'evt_1', status: 'valid' });
    expect(siblings.map((entry) => entry.id)).toEqual(['t1', 't2']);
  });

  test('a cancelled ticket has no group, so it stands alone', () => {
    const siblings = siblingWalletTickets(
      [...tickets, ticket('t5', 'evt_1', 'cancelled')],
      { id: 't5', eventId: 'evt_1', status: 'cancelled' }
    );
    expect(siblings.map((entry) => entry.id)).toEqual(['t5']);
  });

  test('a ticket missing from the list is appended so the screen never renders empty', () => {
    const siblings = siblingWalletTickets(tickets, { id: 't2', eventId: 'evt_1', status: 'used' });
    expect(siblings.map((entry) => entry.id)).toEqual(['t3', 't2']);
  });
});
