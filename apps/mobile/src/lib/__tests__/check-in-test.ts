import type { CheckInCode } from '@/data/types';
import {
  CHECK_IN_LABEL,
  CHECK_IN_STAMP,
  checkInTone,
  isApprovedCheckIn,
  isDuplicateCheckIn,
  isRejectedCheckIn,
  looksLikeEmail,
  personInitials,
  scannerFallback,
} from '@/lib/check-in';

const ALL_CODES: CheckInCode[] = ['approved', 'duplicate', 'invalid', 'wrong_event', 'expired', 'forbidden'];

describe('check-in tones', () => {
  test('confirm is reserved for approved', () => {
    const confirming = ALL_CODES.filter((code) => checkInTone(code) === 'confirm');
    expect(confirming).toEqual(['approved']);
  });

  test('duplicate warns instead of failing', () => {
    expect(checkInTone('duplicate')).toBe('amber');
  });

  test('every other code reads as danger', () => {
    for (const code of ['invalid', 'wrong_event', 'expired', 'forbidden'] as CheckInCode[]) {
      expect(checkInTone(code)).toBe('danger');
    }
  });
});

describe('check-in classification', () => {
  test('approved and duplicate are mutually exclusive and neither is rejected', () => {
    expect(isApprovedCheckIn('approved')).toBe(true);
    expect(isDuplicateCheckIn('approved')).toBe(false);
    expect(isRejectedCheckIn('approved')).toBe(false);
    expect(isRejectedCheckIn('duplicate')).toBe(false);
  });

  test('forbidden is a rejection, not a duplicate', () => {
    expect(isRejectedCheckIn('forbidden')).toBe(true);
    expect(isDuplicateCheckIn('forbidden')).toBe(false);
  });

  test('every code has a stamp and a label', () => {
    for (const code of ALL_CODES) {
      expect(CHECK_IN_STAMP[code]).toBeTruthy();
      expect(CHECK_IN_LABEL[code]).toBeTruthy();
    }
  });

  test('stamps stay uppercase so the door overlay reads at a glance', () => {
    for (const code of ALL_CODES) {
      expect(CHECK_IN_STAMP[code]).toBe(CHECK_IN_STAMP[code].toUpperCase());
    }
  });
});

describe('scannerFallback', () => {
  test('keeps the last four alphanumerics of the user id', () => {
    expect(scannerFallback('usr_a1b2c3d4')).toBe('Puerta ·c3d4');
  });

  test('falls back to a bare label when the id has nothing to show', () => {
    expect(scannerFallback('___')).toBe('Puerta');
    expect(scannerFallback('')).toBe('Puerta');
  });
});

describe('personInitials', () => {
  test('uses the first two words', () => {
    expect(personInitials('Ana María')).toBe('AM');
    expect(personInitials('  luna   sol  ')).toBe('LS');
  });

  test('falls back to the first two letters of a single word', () => {
    expect(personInitials('Luna')).toBe('LU');
  });

  test('never returns an empty badge', () => {
    expect(personInitials('   ')).toBe('?');
  });
});

describe('looksLikeEmail', () => {
  test.each(['ata@parche.test', '  door@parche.test  '])('accepts %s', (value) => {
    expect(looksLikeEmail(value)).toBe(true);
  });

  test.each(['ata', 'ata@', '@parche.test', 'ata@parche', 'a b@parche.test'])('rejects %s', (value) => {
    expect(looksLikeEmail(value)).toBe(false);
  });
});
