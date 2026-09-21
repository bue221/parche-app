import {
  countdownTo,
  endOfDayISO,
  eventCity,
  eventHasEnded,
  eventIsThisWeek,
  eventTagline,
  eventTimeLabel,
  eventVenueParts,
  eventYear,
  formatCardDate,
  formatCardDayShort,
  listingPlaceLine,
  formatClock,
  formatDuration,
  formatEventLongDate,
  formatEventTime,
  formatEventTimeRange,
  formatListingDate,
  formatPercent,
  formatPinDay,
  formatRelativePast,
  fromDateInput,
  isAllNight,
  isSameLocalDay,
  monthRange,
  startOfDayISO,
  statusLabel,
  toDateInput,
  weekendRange,
} from '@/lib/format';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** 2026-09-16 22:00 in Bogotá (UTC-5). Every Bogotá-pinned assertion hangs off this. */
const NIGHT_ISO = '2026-09-17T03:00:00.000Z';

describe('Bogotá-pinned date formatting', () => {
  test('uses the Bogotá calendar day, not the UTC one', () => {
    expect(formatCardDate(NIGHT_ISO)).toContain('16');
    expect(formatCardDayShort(NIGHT_ISO)).toMatch(/^16 /);
    expect(formatListingDate(NIGHT_ISO)).toMatch(/^16 /);
  });

  test('the card eyebrow shouts and the listing meta whispers', () => {
    const card = formatCardDate(NIGHT_ISO);
    expect(card).toBe(card.toUpperCase());
    expect(card).not.toContain('.');
    const listing = formatListingDate(NIGHT_ISO);
    expect(listing).toBe(listing.toLowerCase());
    expect(listing).toMatch(/^16 de /);
  });

  test('formatClock renders 24h Bogotá time', () => {
    expect(formatClock(NIGHT_ISO)).toBe('22:00');
  });

  test('the desktop ficha uses a long Bogotá date and 12h clock', () => {
    expect(formatEventLongDate(NIGHT_ISO)).toMatch(/^Miércoles, 16 de septiembre$/i);
    expect(formatEventTime(NIGHT_ISO)).toMatch(/10:00/);
    expect(formatEventTimeRange(NIGHT_ISO, '2026-09-17T12:00:00.000Z')).toContain(' – ');
  });

  test('eventYear rolls back for a night that is next year in UTC', () => {
    expect(eventYear('2026-01-01T02:00:00.000Z')).toBe(2025);
  });

  test.each([formatCardDate, formatCardDayShort, formatListingDate, formatClock, formatEventLongDate, formatEventTime])(
    'invalid input passes through untouched',
    (format) => {
      expect(format('not-a-date')).toBe('not-a-date');
    }
  );
});

describe('isAllNight', () => {
  test('a party starting at 22:00 Bogotá is all night', () => {
    expect(isAllNight(NIGHT_ISO)).toBe(true);
  });

  test('an afternoon event is not', () => {
    expect(isAllNight('2026-09-17T18:00:00.000Z')).toBe(false);
  });

  test('a six hour run counts even when it starts early', () => {
    expect(isAllNight('2026-09-17T18:00:00.000Z', '2026-09-18T00:00:00.000Z')).toBe(true);
  });

  test('a short afternoon run does not', () => {
    expect(isAllNight('2026-09-17T18:00:00.000Z', '2026-09-17T20:00:00.000Z')).toBe(false);
  });
});

describe('eventTimeLabel', () => {
  test('a caption wins over any computed label', () => {
    expect(eventTimeLabel(NIGHT_ISO, undefined, '  Puertas 9pm ')).toBe('Puertas 9pm');
  });

  test('an all-night party reads ALL NIGHT with a non-breaking space', () => {
    expect(eventTimeLabel(NIGHT_ISO)).toBe('ALL\u00a0NIGHT');
  });

  test('otherwise it shows the Bogotá clock', () => {
    expect(eventTimeLabel('2026-09-17T18:00:00.000Z')).toMatch(/\d{1,2}:\d{2}/);
  });
});

describe('eventHasEnded', () => {
  const now = Date.parse('2026-09-17T12:00:00.000Z');

  test('trusts endsAt when the API provides it', () => {
    expect(eventHasEnded({ startsAt: NIGHT_ISO, endsAt: '2026-09-17T08:00:00.000Z' }, now)).toBe(true);
    expect(eventHasEnded({ startsAt: NIGHT_ISO, endsAt: '2026-09-17T23:00:00.000Z' }, now)).toBe(false);
  });

  test('assumes a twelve hour night when endsAt is missing', () => {
    expect(eventHasEnded({ startsAt: '2026-09-16T20:00:00.000Z' }, now)).toBe(true);
    expect(eventHasEnded({ startsAt: '2026-09-17T06:00:00.000Z' }, now)).toBe(false);
  });

  test('an unparseable date never looks finished', () => {
    expect(eventHasEnded({ startsAt: 'nope' }, now)).toBe(false);
    expect(eventHasEnded({ startsAt: NIGHT_ISO, endsAt: 'nope' }, now)).toBe(false);
  });
});

describe('eventIsThisWeek', () => {
  const now = Date.parse('2026-09-17T12:00:00.000Z');

  test('includes tonight and the next six days', () => {
    expect(eventIsThisWeek({ startsAt: new Date(now + HOUR).toISOString() }, now)).toBe(true);
    expect(eventIsThisWeek({ startsAt: new Date(now + 5 * DAY).toISOString() }, now)).toBe(true);
  });

  test('excludes anything past the seventh midnight', () => {
    expect(eventIsThisWeek({ startsAt: new Date(now + 8 * DAY).toISOString() }, now)).toBe(false);
  });

  test('an unparseable date is not this week', () => {
    expect(eventIsThisWeek({ startsAt: 'nope' }, now)).toBe(false);
  });
});

describe('formatRelativePast', () => {
  const now = Date.parse('2026-09-17T12:00:00.000Z');
  const ago = (ms: number) => formatRelativePast(now - ms, now);

  test.each([
    [10_000, 'Ahora'],
    [60_000, 'Hace 1 min'],
    [10 * MINUTE, 'Hace 10 min'],
    [HOUR, 'Hace 1 hora'],
    [5 * HOUR, 'Hace 5 horas'],
    [DAY, 'Hace 1 día'],
    [3 * DAY, 'Hace 3 días'],
    [8 * DAY, 'Hace 1 semana'],
    [21 * DAY, 'Hace 3 semanas'],
    [60 * DAY, 'Hace 2 meses'],
    [400 * DAY, 'Hace 1 año'],
    [800 * DAY, 'Hace 2 años'],
  ])('%i ms ago reads "%s"', (ms, expected) => {
    expect(ago(ms)).toBe(expected);
  });

  test('a future timestamp clamps to now instead of reading negative', () => {
    expect(formatRelativePast(now + DAY, now)).toBe('Ahora');
  });

  test('an unparseable timestamp renders nothing', () => {
    expect(formatRelativePast('nope', now)).toBe('');
  });

  test('accepts an ISO string as well as a number', () => {
    expect(formatRelativePast('2026-09-17T11:00:00.000Z', now)).toBe('Hace 1 hora');
  });
});

describe('countdownTo', () => {
  const now = new Date('2026-09-17T12:00:00.000Z');

  test('shows minutes under an hour with non-breaking spaces', () => {
    expect(countdownTo('2026-09-17T12:30:00.000Z', now)).toBe('30\u00a0min');
  });

  test('shows hours and minutes within the day', () => {
    expect(countdownTo('2026-09-17T15:30:00.000Z', now)).toBe('3\u00a0h\u00a030\u00a0min');
  });

  test('returns null past 24h so the rail hides the countdown', () => {
    expect(countdownTo('2026-09-19T12:00:00.000Z', now)).toBeNull();
  });

  test('a past or current start reads as now', () => {
    expect(countdownTo('2026-09-17T11:00:00.000Z', now)).toBe('Ahora');
    expect(countdownTo('2026-09-17T12:00:00.000Z', now)).toBe('Ahora');
  });
});

describe('formatPinDay', () => {
  test('today reads Hoy', () => {
    const now = new Date('2026-09-17T12:00:00.000Z');
    expect(formatPinDay(now.toISOString(), now)).toBe('Hoy');
  });

  test('another day reads as a short date without dots', () => {
    const now = new Date('2026-09-17T12:00:00.000Z');
    const label = formatPinDay('2026-10-02T12:00:00.000Z', now);
    expect(label).not.toBe('Hoy');
    expect(label).not.toContain('.');
  });

  test('an unparseable date renders nothing', () => {
    expect(formatPinDay('nope', new Date('2026-09-17T12:00:00.000Z'))).toBe('');
  });
});

describe('isSameLocalDay', () => {
  test('compares against the local calendar day', () => {
    const now = new Date(2026, 8, 17, 12, 0, 0);
    expect(isSameLocalDay(new Date(2026, 8, 17, 23, 0, 0).toISOString(), now)).toBe(true);
    expect(isSameLocalDay(new Date(2026, 8, 18, 1, 0, 0).toISOString(), now)).toBe(false);
  });
});

describe('eventCity and eventVenueParts', () => {
  test.each(['Cra 13, Teusaquillo', 'Monserrate', 'Bogotá D.C.'])('%s resolves to Bogotá', (address) => {
    expect(eventCity(address)).toBe('Bogotá');
  });

  test('an out-of-town address keeps its own city', () => {
    expect(eventCity('Calle 10 #5-5, Medellín')).toBe('Medellín');
  });

  test.each([undefined, '', '   '])('%p defaults to Bogotá', (address) => {
    expect(eventCity(address)).toBe('Bogotá');
  });

  test('a named venue wins over the address', () => {
    expect(eventVenueParts('  Video Club  ', 'Calle 10, Medellín')).toEqual({
      venue: 'Video Club',
      city: 'Medellín',
    });
  });

  test('the listing line joins venue and city', () => {
    expect(listingPlaceLine('Video Club', 'Calle 10, Medellín')).toBe('Video Club, Medellín');
  });

  test('a venue that already names the city is not duplicated', () => {
    expect(listingPlaceLine('Medellín', 'Medellín')).toBe('Medellín');
  });

  test('without a venue name the street becomes the venue', () => {
    expect(eventVenueParts(undefined, 'Calle 10 #5-5, Medellín')).toEqual({
      venue: 'Calle 10 #5-5',
      city: 'Medellín',
    });
  });

  test('a single-part address collapses venue into city', () => {
    expect(eventVenueParts(undefined, 'Medellín')).toEqual({ venue: 'Medellín', city: 'Medellín' });
  });
});

describe('eventTagline', () => {
  test('two or more genres win over the description', () => {
    expect(eventTagline('cualquier cosa', ['techno', 'acid', 'ambient', 'drone'])).toBe(
      'TECHNO  ×  ACID  ×  AMBIENT'
    );
  });

  test('a single genre falls back to the description beats', () => {
    expect(eventTagline('Naturaleza, ritmo, comunidad.', ['techno'])).toBe(
      'NATURALEZA  ×  RITMO  ×  COMUNIDAD'
    );
  });

  test('a one-beat description is used whole when it is short', () => {
    expect(eventTagline('Solo techno')).toBe('SOLO TECHNO');
  });

  test('a long one-beat description is ellipsized', () => {
    const tagline = eventTagline('a'.repeat(80));
    expect(tagline).toHaveLength(41);
    expect(tagline?.endsWith('…')).toBe(true);
  });

  test('nothing to say returns null instead of an empty string', () => {
    expect(eventTagline(undefined, [])).toBeNull();
    expect(eventTagline('   ')).toBeNull();
  });
});

describe('formatDuration', () => {
  test.each([
    [0, '0:00'],
    [9_000, '0:09'],
    [65_000, '1:05'],
    [600_000, '10:00'],
  ])('%i ms reads %s', (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected);
  });

  test('a negative position clamps to zero instead of showing -0:01', () => {
    expect(formatDuration(-5_000)).toBe('0:00');
  });
});

describe('statusLabel', () => {
  test.each([
    ['in_review', 'En revisión'],
    ['published', 'Publicado'],
    ['reserved', 'Pago pendiente'],
    ['transferred', 'Cedido'],
  ])('%s reads %s', (status, expected) => {
    expect(statusLabel(status)).toBe(expected);
  });

  test('an unknown status is shown raw rather than blank', () => {
    expect(statusLabel('brand_new')).toBe('brand_new');
  });
});

describe('formatPercent', () => {
  test('rounds to whole percents', () => {
    expect(formatPercent(0.456)).toBe('46%');
    expect(formatPercent(0)).toBe('0%');
    expect(formatPercent(1)).toBe('100%');
  });

  test.each([Number.NaN, Number.POSITIVE_INFINITY])('%p degrades to 0%%', (rate) => {
    expect(formatPercent(rate)).toBe('0%');
  });
});

describe('date inputs', () => {
  test('toDateInput yields a yyyy-mm-dd value', () => {
    expect(toDateInput('2026-09-17T03:00:00.000Z')).toBe('2026-09-17');
  });

  test('toDateInput on an unparseable value salvages the first ten characters', () => {
    expect(toDateInput('2026-09-17')).toBe('2026-09-17');
  });

  test('toDateInput on nothing yields an empty field', () => {
    expect(toDateInput(undefined)).toBe('');
  });

  test('fromDateInput brackets the day', () => {
    expect(fromDateInput('2026-09-17')).toBe('2026-09-17T00:00:00.000Z');
    expect(fromDateInput('2026-09-17', true)).toBe('2026-09-17T23:59:59.000Z');
  });

  test('fromDateInput on an empty field clears the filter', () => {
    expect(fromDateInput('')).toBeUndefined();
  });
});

describe('local day ranges', () => {
  test('startOfDayISO and endOfDayISO bracket the same local day', () => {
    const date = new Date(2026, 8, 17, 13, 45, 12);
    expect(Date.parse(startOfDayISO(date))).toBeLessThan(date.getTime());
    expect(Date.parse(endOfDayISO(date))).toBeGreaterThan(date.getTime());
    expect(Date.parse(endOfDayISO(date)) - Date.parse(startOfDayISO(date))).toBe(DAY - 1);
  });

  test('weekendRange always spans Saturday into Sunday', () => {
    for (let offset = 0; offset < 7; offset += 1) {
      const from = new Date(2026, 8, 14 + offset, 10, 0, 0);
      const range = weekendRange(from);
      expect(new Date(range.from).getDay()).toBe(6);
      expect(new Date(range.to).getDay()).toBe(0);
      expect(Date.parse(range.to)).toBeGreaterThan(Date.parse(range.from));
    }
  });

  test('monthRange covers the calendar month', () => {
    const range = monthRange(new Date(2026, 1, 15));
    expect(new Date(range.from).getDate()).toBe(1);
    expect(new Date(range.from).getMonth()).toBe(1);
    expect(new Date(range.to).getDate()).toBe(28);
    expect(new Date(range.to).getMonth()).toBe(1);
  });
});
