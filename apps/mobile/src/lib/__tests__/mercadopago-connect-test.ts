import { mercadoPagoConnectState } from '@/lib/mercadopago-connect';

describe('mercadoPagoConnectState', () => {
  test('locks the payout step until the organizer profile exists', () => {
    expect(mercadoPagoConnectState({ locked: true, connected: false, oauthEnabled: true })).toBe('locked');
  });

  test('treats a live account as connected even if OAuth config later drops', () => {
    expect(mercadoPagoConnectState({ connected: true, oauthEnabled: false })).toBe('connected');
  });

  test('asks for the app secret when OAuth is not enabled', () => {
    expect(mercadoPagoConnectState({ connected: false, oauthEnabled: false })).toBe('needs_secret');
  });

  test('is ready to authorize when OAuth is on and nothing is linked', () => {
    expect(mercadoPagoConnectState({ connected: false, oauthEnabled: true })).toBe('ready');
  });
});
