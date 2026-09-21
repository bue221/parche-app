import {
  buildMonthCells,
  exploreDateRange,
  formatDateRangeLabel,
  monthTitle,
} from '@/lib/explore-dates';
import { toDateInput } from '@/lib/format';

describe('buildMonthCells', () => {
  test('September 2026 starts on Tuesday so Monday-first pads one empty cell', () => {
    const cells = buildMonthCells(new Date(2026, 8, 1));
    expect(cells[0]).toBeNull();
    expect(cells[1]).toBe('2026-09-01');
    expect(cells.filter(Boolean)).toHaveLength(30);
    expect(cells[cells.length - 1]).toBe('2026-09-30');
  });

  test('a month that starts on Monday has no leading pad', () => {
    const cells = buildMonthCells(new Date(2026, 5, 1));
    expect(cells[0]).toBe('2026-06-01');
  });
});

describe('formatDateRangeLabel', () => {
  test('no dates yields an empty label so the capsule can say Cualquier fecha', () => {
    expect(formatDateRangeLabel()).toBe('');
  });

  test('a single day does not print a dash', () => {
    const start = '2026-09-22T05:00:00.000Z';
    expect(formatDateRangeLabel(start, start)).not.toContain('–');
  });

  test('a span joins the two days', () => {
    expect(formatDateRangeLabel('2026-09-22T05:00:00.000Z', '2026-09-24T05:00:00.000Z')).toContain('–');
  });
});

describe('exploreDateRange', () => {
  test('brackets the local calendar day', () => {
    const range = exploreDateRange('2026-09-22');
    expect(toDateInput(range.from)).toBe('2026-09-22');
    expect(Date.parse(range.to)).toBeGreaterThan(Date.parse(range.from));
    expect(Date.parse(range.to) - Date.parse(range.from)).toBeGreaterThan(20 * 60 * 60 * 1000);
  });

  test('a multi-day pick keeps the later day as the end', () => {
    const one = exploreDateRange('2026-09-22');
    const span = exploreDateRange('2026-09-22', '2026-09-24');
    expect(toDateInput(span.from)).toBe('2026-09-22');
    expect(Date.parse(span.to)).toBeGreaterThan(Date.parse(one.to));
  });
});

describe('monthTitle', () => {
  test('prints month and year in Spanish', () => {
    expect(monthTitle(new Date(2026, 8, 1)).toLowerCase()).toContain('2026');
    expect(monthTitle(new Date(2026, 8, 1)).toLowerCase()).toContain('sept');
  });
});
