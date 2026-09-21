import { hostedCheckout, isFakeCheckout } from '@/lib/hosted-checkout';

describe('hostedCheckout', () => {
  test('opens Mercado Pago init_point', () => {
    expect(hostedCheckout('https://www.mercadopago.com.co/checkout/v1/redirect?pref_id=p1')).toBe(true);
  });

  test('keeps the fake pay page on the demo buttons', () => {
    expect(hostedCheckout('https://api-parche.bue221.xyz/v1/dev/pay/ord-1')).toBe(false);
    expect(isFakeCheckout('/v1/dev/pay/ord-1')).toBe(true);
  });

  test('does not treat a missing URL as hosted', () => {
    expect(hostedCheckout(undefined)).toBe(false);
    expect(hostedCheckout('')).toBe(false);
  });
});
