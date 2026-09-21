import {
  buyCtaLabel,
  buyPriceCaption,
  lowestPriced,
  saleRemaining,
  ticketRemaining,
  ticketsScarce,
} from '@/lib/ticket-offer';

describe('ticketRemaining', () => {
  test('subtracts sold and reserved from capacity', () => {
    expect(ticketRemaining({ capacity: 40, sold: 10, reserved: 5 })).toBe(25);
  });

  test('never goes negative', () => {
    expect(ticketRemaining({ capacity: 2, sold: 2, reserved: 1 })).toBe(0);
  });
});

describe('saleRemaining', () => {
  test('sums leftover across stages', () => {
    expect(
      saleRemaining([
        { capacity: 10, sold: 8, reserved: 0 },
        { capacity: 20, sold: 0, reserved: 5 },
      ])
    ).toBe(17);
  });
});

describe('lowestPriced', () => {
  test('picks the cheapest stage', () => {
    expect(
      lowestPriced([
        { priceCents: 80000 },
        { priceCents: 40000 },
        { priceCents: 120000 },
      ])?.priceCents
    ).toBe(40000);
  });

  test('empty catalog has no floor price', () => {
    expect(lowestPriced([])).toBeUndefined();
  });
});

describe('buy copy', () => {
  test('sale nights invite a purchase', () => {
    expect(buyCtaLabel(false, 2)).toBe('Comprar boletas');
    expect(buyPriceCaption(false, 2, false)).toBe('Desde');
  });

  test('ended nights close the CTA', () => {
    expect(buyCtaLabel(true, 2)).toBe('Finalizado');
    expect(buyPriceCaption(true, 2, false)).toBe('Cerrado');
  });

  test('no catalog yet is Pronto, empty catalog is Boleta', () => {
    expect(buyCtaLabel(false, 0)).toBe('Pronto');
    expect(buyPriceCaption(false, 0, true)).toBe('Boleta');
    expect(buyPriceCaption(false, 0, false)).toBe('Pronto');
  });

  test('scarcity only fires with a handful left', () => {
    expect(ticketsScarce(12)).toBe(true);
    expect(ticketsScarce(13)).toBe(false);
    expect(ticketsScarce(0)).toBe(false);
  });
});
