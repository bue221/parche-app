/** Dialing metadata for the phone field. Lengths are national digits after the country code. */

export type PhoneCountry = {
  iso2: string;
  name: string;
  dialCode: string;
  digitMin: number;
  digitMax: number;
};

export const DEFAULT_PHONE_COUNTRY = 'CO';

const COUNTRIES: PhoneCountry[] = [
  { iso2: 'CO', name: 'Colombia', dialCode: '57', digitMin: 10, digitMax: 10 },
  { iso2: 'MX', name: 'México', dialCode: '52', digitMin: 10, digitMax: 10 },
  { iso2: 'US', name: 'Estados Unidos', dialCode: '1', digitMin: 10, digitMax: 10 },
  { iso2: 'ES', name: 'España', dialCode: '34', digitMin: 9, digitMax: 9 },
  { iso2: 'AR', name: 'Argentina', dialCode: '54', digitMin: 10, digitMax: 11 },
  { iso2: 'CL', name: 'Chile', dialCode: '56', digitMin: 9, digitMax: 9 },
  { iso2: 'PE', name: 'Perú', dialCode: '51', digitMin: 9, digitMax: 9 },
  { iso2: 'BR', name: 'Brasil', dialCode: '55', digitMin: 10, digitMax: 11 },
  { iso2: 'EC', name: 'Ecuador', dialCode: '593', digitMin: 9, digitMax: 9 },
  { iso2: 'VE', name: 'Venezuela', dialCode: '58', digitMin: 10, digitMax: 10 },
  { iso2: 'UY', name: 'Uruguay', dialCode: '598', digitMin: 8, digitMax: 8 },
  { iso2: 'PY', name: 'Paraguay', dialCode: '595', digitMin: 9, digitMax: 9 },
  { iso2: 'BO', name: 'Bolivia', dialCode: '591', digitMin: 8, digitMax: 8 },
  { iso2: 'PA', name: 'Panamá', dialCode: '507', digitMin: 8, digitMax: 8 },
  { iso2: 'CR', name: 'Costa Rica', dialCode: '506', digitMin: 8, digitMax: 8 },
  { iso2: 'GT', name: 'Guatemala', dialCode: '502', digitMin: 8, digitMax: 8 },
  { iso2: 'HN', name: 'Honduras', dialCode: '504', digitMin: 8, digitMax: 8 },
  { iso2: 'SV', name: 'El Salvador', dialCode: '503', digitMin: 8, digitMax: 8 },
  { iso2: 'NI', name: 'Nicaragua', dialCode: '505', digitMin: 8, digitMax: 8 },
  { iso2: 'DO', name: 'República Dominicana', dialCode: '1', digitMin: 10, digitMax: 10 },
  { iso2: 'CU', name: 'Cuba', dialCode: '53', digitMin: 8, digitMax: 8 },
  { iso2: 'PR', name: 'Puerto Rico', dialCode: '1', digitMin: 10, digitMax: 10 },
  { iso2: 'CA', name: 'Canadá', dialCode: '1', digitMin: 10, digitMax: 10 },
  { iso2: 'PT', name: 'Portugal', dialCode: '351', digitMin: 9, digitMax: 9 },
  { iso2: 'FR', name: 'Francia', dialCode: '33', digitMin: 9, digitMax: 9 },
  { iso2: 'DE', name: 'Alemania', dialCode: '49', digitMin: 10, digitMax: 11 },
  { iso2: 'IT', name: 'Italia', dialCode: '39', digitMin: 9, digitMax: 10 },
  { iso2: 'GB', name: 'Reino Unido', dialCode: '44', digitMin: 10, digitMax: 10 },
  { iso2: 'NL', name: 'Países Bajos', dialCode: '31', digitMin: 9, digitMax: 9 },
  { iso2: 'BE', name: 'Bélgica', dialCode: '32', digitMin: 8, digitMax: 9 },
  { iso2: 'CH', name: 'Suiza', dialCode: '41', digitMin: 9, digitMax: 9 },
  { iso2: 'AT', name: 'Austria', dialCode: '43', digitMin: 10, digitMax: 13 },
  { iso2: 'IE', name: 'Irlanda', dialCode: '353', digitMin: 9, digitMax: 9 },
  { iso2: 'PL', name: 'Polonia', dialCode: '48', digitMin: 9, digitMax: 9 },
  { iso2: 'SE', name: 'Suecia', dialCode: '46', digitMin: 9, digitMax: 9 },
  { iso2: 'NO', name: 'Noruega', dialCode: '47', digitMin: 8, digitMax: 8 },
  { iso2: 'AU', name: 'Australia', dialCode: '61', digitMin: 9, digitMax: 9 },
  { iso2: 'NZ', name: 'Nueva Zelanda', dialCode: '64', digitMin: 8, digitMax: 10 },
  { iso2: 'JP', name: 'Japón', dialCode: '81', digitMin: 10, digitMax: 10 },
  { iso2: 'KR', name: 'Corea del Sur', dialCode: '82', digitMin: 9, digitMax: 10 },
  { iso2: 'CN', name: 'China', dialCode: '86', digitMin: 11, digitMax: 11 },
  { iso2: 'IN', name: 'India', dialCode: '91', digitMin: 10, digitMax: 10 },
  { iso2: 'PH', name: 'Filipinas', dialCode: '63', digitMin: 10, digitMax: 10 },
  { iso2: 'AE', name: 'Emiratos Árabes', dialCode: '971', digitMin: 9, digitMax: 9 },
];

const PINNED_ISO2 = ['CO', 'MX', 'US', 'ES', 'AR', 'CL', 'PE', 'BR'] as const;
const NANP_ISO2 = new Set(['US', 'CA', 'DO', 'PR']);
const DO_PREFIXES = ['809', '829', '849'];
const PR_PREFIXES = ['787', '939'];

const BY_ISO2 = new Map(COUNTRIES.map((country) => [country.iso2, country]));
const PINNED = new Set<string>(PINNED_ISO2);

export const PHONE_COUNTRIES: PhoneCountry[] = [
  ...PINNED_ISO2.map((iso2) => BY_ISO2.get(iso2)).filter((country): country is PhoneCountry => Boolean(country)),
  ...COUNTRIES.filter((country) => !PINNED.has(country.iso2)).sort((a, b) => a.name.localeCompare(b.name, 'es')),
];

export type ParsedPhone = {
  country: PhoneCountry;
  national: string;
  e164: string;
};

export function getPhoneCountry(iso2?: string): PhoneCountry {
  return (iso2 ? BY_ISO2.get(iso2.toUpperCase()) : undefined) ?? BY_ISO2.get(DEFAULT_PHONE_COUNTRY)!;
}

export function flagEmoji(iso2: string): string {
  return iso2
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 2)
    .split('')
    .map((letter) => String.fromCodePoint(127397 + letter.charCodeAt(0)))
    .join('');
}

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

export function formatE164(country: PhoneCountry, national: string): string {
  const digits = digitsOnly(national).slice(0, country.digitMax);
  return digits ? `+${country.dialCode}${digits}` : '';
}

export function phoneDigitHelper(country: PhoneCountry): string {
  if (country.digitMin === country.digitMax) {
    return `${country.digitMax} dígitos`;
  }
  return `${country.digitMin} a ${country.digitMax} dígitos`;
}

export function isCompleteNational(country: PhoneCountry, national: string): boolean {
  const length = digitsOnly(national).length;
  return length >= country.digitMin && length <= country.digitMax;
}

export function parsePhone(value: string, hintIso2 = DEFAULT_PHONE_COUNTRY): ParsedPhone {
  const hint = getPhoneCountry(hintIso2);
  const trimmed = value.trim();
  if (!trimmed) {
    return { country: hint, national: '', e164: '' };
  }

  let normalized = trimmed.replace(/[\s().-]/g, '');
  if (normalized.startsWith('00')) {
    normalized = `+${normalized.slice(2)}`;
  }

  if (normalized.startsWith('+')) {
    const rest = digitsOnly(normalized.slice(1));
    const matched = matchDialCode(rest, hint.iso2);
    if (matched) {
      const national = matched.national.slice(0, matched.country.digitMax);
      return { country: matched.country, national, e164: formatE164(matched.country, national) };
    }
    const national = rest.slice(0, hint.digitMax);
    return { country: hint, national, e164: formatE164(hint, national) };
  }

  const nationalDigits = digitsOnly(normalized);
  if (nationalDigits.startsWith(hint.dialCode) && nationalDigits.length > hint.digitMax) {
    const stripped = nationalDigits.slice(hint.dialCode.length).slice(0, hint.digitMax);
    return { country: hint, national: stripped, e164: formatE164(hint, stripped) };
  }

  const national = nationalDigits.slice(0, hint.digitMax);
  return { country: hint, national, e164: formatE164(hint, national) };
}

export function validatePhone(value: string, options?: { required?: boolean }): string | null {
  const parsed = parsePhone(value);
  if (!parsed.national) {
    return options?.required ? 'Ingresa tu teléfono' : null;
  }
  if (!isCompleteNational(parsed.country, parsed.national)) {
    return phoneLengthError(parsed.country);
  }
  return null;
}

export function filterPhoneCountries(query: string): PhoneCountry[] {
  const needle = fold(query);
  if (!needle) return PHONE_COUNTRIES;
  return PHONE_COUNTRIES.filter((country) => {
    const haystack = fold(`${country.name} ${country.iso2} +${country.dialCode} ${country.dialCode}`);
    return haystack.includes(needle);
  });
}

function phoneLengthError(country: PhoneCountry): string {
  if (country.digitMin === country.digitMax) {
    return `Ingresa ${country.digitMax} dígitos`;
  }
  return `Ingresa entre ${country.digitMin} y ${country.digitMax} dígitos`;
}

function matchDialCode(digits: string, hintIso2: string): { country: PhoneCountry; national: string } | null {
  const matches = COUNTRIES.filter((country) => digits.startsWith(country.dialCode));
  if (matches.length === 0) return null;
  const longest = Math.max(...matches.map((country) => country.dialCode.length));
  const candidates = matches.filter((country) => country.dialCode.length === longest);
  const country = pickSharedDialCountry(candidates, digits.slice(longest), hintIso2);
  return { country, national: digits.slice(country.dialCode.length) };
}

function pickSharedDialCountry(candidates: PhoneCountry[], national: string, hintIso2: string): PhoneCountry {
  if (candidates.length === 1) return candidates[0]!;
  const nanp = candidates.filter((country) => NANP_ISO2.has(country.iso2));
  if (nanp.length > 0 && candidates.every((country) => country.dialCode === '1')) {
    const prefix = national.slice(0, 3);
    if (DO_PREFIXES.includes(prefix)) {
      return BY_ISO2.get('DO') ?? candidates[0]!;
    }
    if (PR_PREFIXES.includes(prefix)) {
      return BY_ISO2.get('PR') ?? candidates[0]!;
    }
    const hinted = nanp.find((country) => country.iso2 === hintIso2);
    if (hinted) return hinted;
    return BY_ISO2.get('US') ?? candidates[0]!;
  }
  return candidates.find((country) => country.iso2 === hintIso2) ?? candidates[0]!;
}

function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}
