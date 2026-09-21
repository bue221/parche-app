import {
  claimCheckoutAutoOpen,
  peekCheckout,
  rememberCheckout,
  resetPendingCheckout,
} from '@/lib/pending-checkout';

describe('pendingCheckout', () => {
  beforeEach(() => {
    resetPendingCheckout();
  });

  test('remembers the init_point from POST orders', () => {
    rememberCheckout('ord-1', 'https://www.mercadopago.com.co/checkout/v1/redirect?pref_id=p1');
    expect(peekCheckout('ord-1')).toContain('pref_id=p1');
  });

  test('auto-opens Mercado Pago only once per order', () => {
    expect(claimCheckoutAutoOpen('ord-1')).toBe(true);
    expect(claimCheckoutAutoOpen('ord-1')).toBe(false);
    expect(claimCheckoutAutoOpen('ord-2')).toBe(true);
  });
});
