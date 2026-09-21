import { needsPayoutSetup } from '@/lib/payout-setup';

describe('needsPayoutSetup', () => {
  test('blocks create when OAuth is on and the tenant is not connected', () => {
    expect(needsPayoutSetup({ connected: false, oauthEnabled: true })).toBe(true);
  });

  test('lets demo create events without Mercado Pago', () => {
    expect(needsPayoutSetup({ connected: false, oauthEnabled: false })).toBe(false);
  });

  test('skips the modal once the account is connected', () => {
    expect(needsPayoutSetup({ connected: true, oauthEnabled: true })).toBe(false);
  });

  test('trusts payout_required from the API', () => {
    expect(needsPayoutSetup({ connected: false, oauthEnabled: false, payoutRequired: true })).toBe(true);
  });
});
