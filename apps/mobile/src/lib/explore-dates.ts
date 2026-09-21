import { endOfDayISO, startOfDayISO, toDateInput } from '@/lib/format';

export const EXPLORE_WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'] as const;

/** Monday-first month grid, empty cells as `null`. */
export function buildMonthCells(month: Date): (string | null)[] {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const first = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const startPad = (first.getDay() + 6) % 7;
  const cells: (string | null)[] = [];
  for (let i = 0; i < startPad; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(`${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
  }
  return cells;
}

export function monthTitle(month: Date): string {
  return month.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
}

/** Capsule label: "Cualquier fecha" lives in the UI; this returns the chosen range. */
export function formatDateRangeLabel(from?: string, to?: string): string {
  if (!from) return '';
  const start = new Date(from);
  if (Number.isNaN(start.getTime())) return '';
  const end = to ? new Date(to) : start;
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  const left = start.toLocaleDateString('es-CO', opts);
  const right = end.toLocaleDateString('es-CO', opts);
  if (toDateInput(from) === toDateInput(to ?? from)) return left;
  return `${left} – ${right}`;
}

/** Local calendar day → agenda `from`/`to` (start and end of day). */
export function exploreDateRange(fromDay: string, toDay = fromDay): { from: string; to: string } {
  const start = parseDay(fromDay);
  const end = parseDay(toDay);
  return { from: startOfDayISO(start), to: endOfDayISO(end) };
}

function parseDay(isoDay: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDay);
  if (!match) return new Date(isoDay);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0);
}
