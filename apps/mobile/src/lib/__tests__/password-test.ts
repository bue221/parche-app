import { MIN_PASSWORD_LEN, passwordIssue } from '@/lib/password';

describe('passwordIssue', () => {
  test('accepts a password at the minimum length', () => {
    expect(passwordIssue('a'.repeat(MIN_PASSWORD_LEN))).toBeUndefined();
  });

  test('rejects anything shorter', () => {
    expect(passwordIssue('a'.repeat(MIN_PASSWORD_LEN - 1))).toBe('Mínimo 10 caracteres.');
    expect(passwordIssue('')).toBe('Mínimo 10 caracteres.');
  });

  test('rejects an all-digit password even when it is long enough', () => {
    expect(passwordIssue('1234567890')).toBe('No uses solo números.');
  });

  test('digits are fine as long as something else is there', () => {
    expect(passwordIssue('parche1234')).toBeUndefined();
  });

  test('counts code points, so emoji are not double-counted', () => {
    expect(passwordIssue('🎧'.repeat(MIN_PASSWORD_LEN))).toBeUndefined();
    expect(passwordIssue('🎧'.repeat(MIN_PASSWORD_LEN - 1))).toBe('Mínimo 10 caracteres.');
  });

  test('whitespace counts as a character rather than being trimmed away', () => {
    expect(passwordIssue('   1234567')).toBeUndefined();
  });
});
