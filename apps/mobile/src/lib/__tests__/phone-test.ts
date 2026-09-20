import {
  DEFAULT_PHONE_COUNTRY,
  filterPhoneCountries,
  flagEmoji,
  formatE164,
  getPhoneCountry,
  isCompleteNational,
  parsePhone,
  phoneDigitHelper,
  validatePhone,
} from '@/lib/phone';

describe('getPhoneCountry', () => {
  test('defaults to Colombia', () => {
    expect(getPhoneCountry().iso2).toBe(DEFAULT_PHONE_COUNTRY);
    expect(getPhoneCountry(undefined).iso2).toBe('CO');
  });

  test('is case insensitive', () => {
    expect(getPhoneCountry('mx').iso2).toBe('MX');
  });

  test('falls back to the default for an unknown code', () => {
    expect(getPhoneCountry('ZZ').iso2).toBe('CO');
  });
});

describe('parsePhone', () => {
  test('reads a local Colombian number', () => {
    const parsed = parsePhone('300 123 4567');
    expect(parsed.country.iso2).toBe('CO');
    expect(parsed.national).toBe('3001234567');
    expect(parsed.e164).toBe('+573001234567');
  });

  test('strips separators and parentheses', () => {
    expect(parsePhone('(300) 123-4567').e164).toBe('+573001234567');
  });

  test('detects the country from an E.164 prefix', () => {
    const parsed = parsePhone('+52 55 1234 5678');
    expect(parsed.country.iso2).toBe('MX');
    expect(parsed.e164).toBe('+525512345678');
  });

  test('treats a 00 prefix as an international dial', () => {
    expect(parsePhone('0034600123456').country.iso2).toBe('ES');
  });

  test('prefers the longest matching dial code', () => {
    expect(parsePhone('+593987654321').country.iso2).toBe('EC');
  });

  test('strips a duplicated country code typed without a plus', () => {
    expect(parsePhone('573001234567').national).toBe('3001234567');
  });

  test('truncates past the national length instead of building a bad E.164', () => {
    expect(parsePhone('+57300123456789').national).toBe('3001234567');
  });

  test('an empty value yields the hint country and no number', () => {
    const parsed = parsePhone('   ');
    expect(parsed.country.iso2).toBe('CO');
    expect(parsed.national).toBe('');
    expect(parsed.e164).toBe('');
  });

  test('an unknown dial code keeps the hint country', () => {
    expect(parsePhone('+9995551234', 'MX').country.iso2).toBe('MX');
  });

  describe('shared +1 dial code', () => {
    test('routes Dominican prefixes to DO', () => {
      expect(parsePhone('+18091234567').country.iso2).toBe('DO');
    });

    test('routes Puerto Rico prefixes to PR', () => {
      expect(parsePhone('+17871234567').country.iso2).toBe('PR');
    });

    test('honors the hint country when the prefix is ambiguous', () => {
      expect(parsePhone('+12125551234', 'CA').country.iso2).toBe('CA');
    });

    test('defaults to US when the hint is not in the NANP', () => {
      expect(parsePhone('+12125551234', 'CO').country.iso2).toBe('US');
    });
  });
});

describe('formatE164', () => {
  test('returns an empty string rather than a bare plus sign', () => {
    expect(formatE164(getPhoneCountry('CO'), '')).toBe('');
    expect(formatE164(getPhoneCountry('CO'), 'abc')).toBe('');
  });

  test('clamps to the national maximum', () => {
    expect(formatE164(getPhoneCountry('CO'), '30012345678888')).toBe('+573001234567');
  });
});

describe('isCompleteNational', () => {
  test('accepts the exact length', () => {
    expect(isCompleteNational(getPhoneCountry('CO'), '3001234567')).toBe(true);
  });

  test('rejects a short number', () => {
    expect(isCompleteNational(getPhoneCountry('CO'), '30012345')).toBe(false);
  });

  test('accepts either end of a variable range', () => {
    const ar = getPhoneCountry('AR');
    expect(isCompleteNational(ar, '1123456789')).toBe(true);
    expect(isCompleteNational(ar, '11234567890')).toBe(true);
  });
});

describe('validatePhone', () => {
  test('an empty optional field is valid', () => {
    expect(validatePhone('')).toBeNull();
  });

  test('an empty required field asks for the number', () => {
    expect(validatePhone('', { required: true })).toBe('Ingresa tu teléfono');
  });

  test('a complete number is valid', () => {
    expect(validatePhone('+573001234567')).toBeNull();
  });

  test('a short number states the exact length expected', () => {
    expect(validatePhone('300123')).toBe('Ingresa 10 dígitos');
  });

  test('a variable-length country states the range', () => {
    expect(validatePhone('+5411')).toBe('Ingresa entre 10 y 11 dígitos');
  });
});

describe('phoneDigitHelper', () => {
  test('states one length when min equals max', () => {
    expect(phoneDigitHelper(getPhoneCountry('CO'))).toBe('10 dígitos');
  });

  test('states a range otherwise', () => {
    expect(phoneDigitHelper(getPhoneCountry('AR'))).toBe('10 a 11 dígitos');
  });
});

describe('filterPhoneCountries', () => {
  test('an empty query lists everything with the pinned countries first', () => {
    const all = filterPhoneCountries('');
    expect(all.length).toBeGreaterThan(8);
    expect(all.slice(0, 3).map((country) => country.iso2)).toEqual(['CO', 'MX', 'US']);
  });

  test('ignores accents and case', () => {
    expect(filterPhoneCountries('mexico').map((country) => country.iso2)).toContain('MX');
    expect(filterPhoneCountries('PERÚ').map((country) => country.iso2)).toContain('PE');
  });

  test('matches the dial code with or without a plus', () => {
    expect(filterPhoneCountries('+57').map((country) => country.iso2)).toContain('CO');
    expect(filterPhoneCountries('593').map((country) => country.iso2)).toContain('EC');
  });

  test('a query with no match returns nothing instead of everything', () => {
    expect(filterPhoneCountries('atlantis')).toEqual([]);
  });
});

describe('flagEmoji', () => {
  test('maps an ISO code to regional indicators', () => {
    expect(flagEmoji('CO')).toBe('🇨🇴');
    expect(flagEmoji('co')).toBe('🇨🇴');
  });
});
