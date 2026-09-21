import { isAuthPath } from '@/lib/auth-routes';

describe('isAuthPath', () => {
  test('marks the password stack so the OTP sheet stays closed', () => {
    expect(isAuthPath('/auth/login')).toBe(true);
    expect(isAuthPath('/auth/register')).toBe(true);
    expect(isAuthPath('/reset')).toBe(true);
  });

  test('leaves product tabs and checkout alone', () => {
    expect(isAuthPath('/')).toBe(false);
    expect(isAuthPath('/parche')).toBe(false);
    expect(isAuthPath('/wallet')).toBe(false);
    expect(isAuthPath('/checkout/evt_1')).toBe(false);
  });
});
