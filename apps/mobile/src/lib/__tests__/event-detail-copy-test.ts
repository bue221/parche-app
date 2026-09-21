import {
  agePolicyLabel,
  eventSaleBadge,
  stickyBuyLead,
  ticketPanelCaption,
  ticketRowStatus,
} from '@/lib/event-detail-copy';

describe('agePolicyLabel', () => {
  test('empty or all-ages copy becomes Todas las edades', () => {
    expect(agePolicyLabel()).toBe('Todas las edades');
    expect(agePolicyLabel('all ages')).toBe('Todas las edades');
    expect(agePolicyLabel('Todas las edades')).toBe('Todas las edades');
  });

  test('keeps an explicit door policy', () => {
    expect(agePolicyLabel('18+')).toBe('18+');
    expect(agePolicyLabel('21+')).toBe('21+');
  });
});

describe('eventSaleBadge', () => {
  test('a live sale is the aurora boletas chip', () => {
    expect(eventSaleBadge({ status: 'published', ended: false, onSaleCount: 2 })).toEqual({
      label: 'Boletas a la venta',
      tone: 'aurora',
    });
  });

  test('ended and unpublished nights do not invite a purchase', () => {
    expect(eventSaleBadge({ status: 'published', ended: true, onSaleCount: 2 }).label).toBe('Finalizado');
    expect(eventSaleBadge({ status: 'published', ended: false, onSaleCount: 0 }).tone).toBe('amber');
    expect(eventSaleBadge({ status: 'draft', ended: false, onSaleCount: 0 }).label).toBe('Borrador');
    expect(eventSaleBadge({ status: 'rejected', ended: false, onSaleCount: 0 }).tone).toBe('danger');
  });
});

describe('ticket copy', () => {
  test('the panel names a floor price when there is one', () => {
    expect(ticketPanelCaption({ ended: false, empty: false, fromPrice: '$ 85.000' })).toBe(
      'Desde $ 85.000. Un pago por evento.'
    );
  });

  test('empty and ended catalogs explain why there is no buy', () => {
    expect(ticketPanelCaption({ ended: true, empty: false })).toBe('La venta ya cerró.');
    expect(ticketPanelCaption({ ended: false, empty: true })).toBe('Aún no hay boletas a la venta.');
    expect(ticketPanelCaption({ ended: false, empty: false })).toBe('Pronto.');
  });

  test('sticky lead tells the guest where the QR lives', () => {
    expect(stickyBuyLead({ ended: false, onSale: true })).toMatch(/wallet/);
    expect(stickyBuyLead({ ended: true, onSale: false })).toMatch(/pasó/);
  });

  test('a row says available, sold out, or closed', () => {
    expect(ticketRowStatus({ ended: false, onSale: true, remaining: 250 })).toBe('250 disponibles');
    expect(ticketRowStatus({ ended: false, onSale: true, remaining: 1 })).toBe('1 disponible');
    expect(ticketRowStatus({ ended: false, onSale: false, remaining: 0 })).toBe('Agotada');
    expect(ticketRowStatus({ ended: true, onSale: false, remaining: 10 })).toBe('No disponible');
  });
});
