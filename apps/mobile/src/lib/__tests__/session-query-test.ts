import { afterAuthHydration, hasOptionalAuth } from '@/lib/session-query';

describe('afterAuthHydration', () => {
  test('keeps public queries off until the session boot finishes', () => {
    expect(afterAuthHydration(false)).toBe(false);
    expect(afterAuthHydration(false, true)).toBe(false);
    expect(afterAuthHydration(true)).toBe(true);
  });

  test('still respects extra gates after hydration', () => {
    expect(afterAuthHydration(true, false)).toBe(false);
    expect(afterAuthHydration(true, true)).toBe(true);
  });
});

describe('hasOptionalAuth', () => {
  test('sends Bearer only when an access token is in memory', () => {
    expect(hasOptionalAuth(null)).toBe(false);
    expect(hasOptionalAuth(undefined)).toBe(false);
    expect(hasOptionalAuth('')).toBe(false);
    expect(hasOptionalAuth('at_live')).toBe(true);
  });
});
