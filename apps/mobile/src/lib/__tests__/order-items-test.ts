import type { TicketType } from '@/data/types';
import { mergeOrderItems, orderItemsLabel, orderItemsTotalCents } from '@/lib/order-items';

function ticketType(id: string, name: string, priceCents: number): TicketType {
  return {
    id,
    eventId: 'evt_1',
    name,
    priceCents,
    currency: 'COP',
    capacity: 100,
    sold: 0,
    reserved: 0,
    salesFrom: '2026-01-01T00:00:00.000Z',
    salesTo: '2026-12-31T00:00:00.000Z',
  };
}

const EARLY = ticketType('tt_early', 'Early bird', 60_000);
const GENERAL = ticketType('tt_general', 'General', 90_000);
const TYPES = [EARLY, GENERAL];

describe('mergeOrderItems', () => {
  test('collapses repeated stages into one line', () => {
    expect(
      mergeOrderItems([
        { ticketTypeId: 'tt_early', quantity: 1 },
        { ticketTypeId: 'tt_early', quantity: 2 },
      ])
    ).toEqual([{ ticketTypeId: 'tt_early', quantity: 3 }]);
  });

  test('keeps distinct stages of the same event in one order', () => {
    expect(
      mergeOrderItems([
        { ticketTypeId: 'tt_early', quantity: 1 },
        { ticketTypeId: 'tt_general', quantity: 2 },
      ])
    ).toEqual([
      { ticketTypeId: 'tt_early', quantity: 1 },
      { ticketTypeId: 'tt_general', quantity: 2 },
    ]);
  });

  test('preserves first-seen order of stages', () => {
    const merged = mergeOrderItems([
      { ticketTypeId: 'tt_general', quantity: 1 },
      { ticketTypeId: 'tt_early', quantity: 1 },
      { ticketTypeId: 'tt_general', quantity: 1 },
    ]);
    expect(merged.map((item) => item.ticketTypeId)).toEqual(['tt_general', 'tt_early']);
  });

  test.each([
    ['zero quantity', { ticketTypeId: 'tt_early', quantity: 0 }],
    ['negative quantity', { ticketTypeId: 'tt_early', quantity: -2 }],
    ['fractional below one', { ticketTypeId: 'tt_early', quantity: 0.9 }],
    ['missing stage id', { ticketTypeId: '', quantity: 3 }],
  ])('drops %s', (_label, item) => {
    expect(mergeOrderItems([item])).toEqual([]);
  });

  test('floors fractional quantities instead of sending them to the API', () => {
    expect(mergeOrderItems([{ ticketTypeId: 'tt_early', quantity: 2.7 }])).toEqual([
      { ticketTypeId: 'tt_early', quantity: 2 },
    ]);
  });

  test('an empty cart merges to an empty order', () => {
    expect(mergeOrderItems([])).toEqual([]);
  });
});

describe('orderItemsTotalCents', () => {
  test('adds up mixed stages', () => {
    const total = orderItemsTotalCents(
      [
        { ticketTypeId: 'tt_early', quantity: 2 },
        { ticketTypeId: 'tt_general', quantity: 1 },
      ],
      TYPES
    );
    expect(total).toBe(2 * 60_000 + 90_000);
  });

  test('ignores stages the event no longer offers rather than throwing', () => {
    expect(orderItemsTotalCents([{ ticketTypeId: 'tt_gone', quantity: 3 }], TYPES)).toBe(0);
  });

  test('an empty cart costs nothing', () => {
    expect(orderItemsTotalCents([], TYPES)).toBe(0);
  });
});

describe('orderItemsLabel', () => {
  test('names each stage with its quantity', () => {
    expect(
      orderItemsLabel(
        [
          { ticketTypeId: 'tt_early', quantity: 2 },
          { ticketTypeId: 'tt_general', quantity: 1 },
        ],
        TYPES
      )
    ).toBe('2 Early bird · 1 General');
  });

  test('falls back to a generic stage name when the type is unknown', () => {
    expect(orderItemsLabel([{ ticketTypeId: 'tt_gone', quantity: 1 }], TYPES)).toBe('1 etapa');
  });
});
