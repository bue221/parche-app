export function formatWhen(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDay(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function stripDateDots(value: string) {
  return value.replace(/\./g, '').trim();
}

const BOGOTA_TZ = 'America/Bogota';

/** Overlay eyebrow: "JUE, 17 DE SEPT". */
export function formatCardDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const weekday = stripDateDots(
    date.toLocaleDateString('es-CO', { weekday: 'short', timeZone: BOGOTA_TZ })
  ).toUpperCase();
  const month = stripDateDots(
    date.toLocaleDateString('es-CO', { month: 'short', timeZone: BOGOTA_TZ })
  ).toUpperCase();
  const day = date.toLocaleDateString('es-CO', { day: 'numeric', timeZone: BOGOTA_TZ });
  return `${weekday}, ${day} DE ${month}`;
}

/** Overlay date cell: "17 SEPT". */
export function formatCardDayShort(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const month = stripDateDots(
    date.toLocaleDateString('es-CO', { month: 'short', timeZone: BOGOTA_TZ })
  ).toUpperCase();
  const day = date.toLocaleDateString('es-CO', { day: 'numeric', timeZone: BOGOTA_TZ });
  return `${day} ${month}`;
}

/** Catalog meta under the flyer: "17 de sept". */
export function formatListingDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const month = stripDateDots(
    date.toLocaleDateString('es-CO', { month: 'short', timeZone: BOGOTA_TZ })
  ).toLowerCase();
  const day = date.toLocaleDateString('es-CO', { day: 'numeric', timeZone: BOGOTA_TZ });
  return `${day} de ${month}`;
}

/** Listing place line: "Video Club, Bogotá". */
export function listingPlaceLine(venueName?: string, addressText?: string): string {
  const { venue, city } = eventVenueParts(venueName, addressText);
  if (!city || venue.toLowerCase() === city.toLowerCase()) return venue;
  if (venue.toLowerCase().includes(city.toLowerCase())) return venue;
  return `${venue}, ${city}`;
}

const BOGOTA_HINT =
  /bogot|teusaquillo|chapinero|usaqu[eé]n|suba|kennedy|engativ|fontib[oó]n|puente aranda|el dorado|sim[oó]n bol[ií]var|monserrate/i;

export function eventCity(addressText?: string): string {
  const raw = addressText?.trim() ?? '';
  if (!raw || BOGOTA_HINT.test(raw)) return 'Bogotá';
  const parts = raw.split(',').map((part) => part.trim()).filter(Boolean);
  return parts[parts.length - 1] ?? 'Bogotá';
}

/** Calendar year of the date in Bogotá, for collection titles like "Bogotá 2026". */
export function eventYear(iso: string): number {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return new Date().getFullYear();
  const year = Number.parseInt(
    date.toLocaleDateString('en-CA', { timeZone: BOGOTA_TZ, year: 'numeric' }),
    10
  );
  return Number.isFinite(year) ? year : date.getFullYear();
}

/** Relative past in Spanish: "Hace 2 semanas". */
export function formatRelativePast(at: number | string, now = Date.now()): string {
  const then = typeof at === 'string' ? Date.parse(at) : at;
  if (!Number.isFinite(then)) return '';
  const ms = Math.max(0, now - then);
  if (ms < 45_000) return 'Ahora';
  if (ms < 90_000) return 'Hace 1 min';
  if (ms < 3_600_000) return `Hace ${Math.floor(ms / 60_000)} min`;
  if (ms < 5_400_000) return 'Hace 1 hora';
  if (ms < 86_400_000) return `Hace ${Math.floor(ms / 3_600_000)} horas`;
  const days = Math.floor(ms / 86_400_000);
  if (days === 1) return 'Hace 1 día';
  if (days < 7) return `Hace ${days} días`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return 'Hace 1 semana';
  if (weeks < 5) return `Hace ${weeks} semanas`;
  const months = Math.floor(days / 30);
  if (months <= 1) return 'Hace 1 mes';
  if (months < 12) return `Hace ${months} meses`;
  const years = Math.floor(days / 365);
  return years <= 1 ? 'Hace 1 año' : `Hace ${years} años`;
}

export function eventVenueParts(venueName?: string, addressText?: string): { venue: string; city: string } {
  const city = eventCity(addressText);
  if (venueName?.trim()) return { venue: venueName.trim(), city };
  const parts = (addressText ?? '').split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) return { venue: parts[0], city };
  return { venue: city, city };
}

export function isAllNight(startsAt: string, endsAt?: string): boolean {
  if (endsAt) {
    const ms = Date.parse(endsAt) - Date.parse(startsAt);
    if (Number.isFinite(ms) && ms >= 6 * 60 * 60 * 1000) return true;
  }
  const hour = bogotaHour(startsAt);
  if (hour == null) return false;
  return hour >= 21 || hour < 6;
}

function bogotaHour(iso: string): number | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const raw = new Intl.DateTimeFormat('en-GB', {
    timeZone: BOGOTA_TZ,
    hour: '2-digit',
    hourCycle: 'h23',
  }).format(date);
  const hour = Number.parseInt(raw, 10);
  return Number.isFinite(hour) ? hour : null;
}

export function eventTimeLabel(startsAt: string, endsAt?: string, caption?: string): string {
  if (caption?.trim()) return caption.trim();
  if (isAllNight(startsAt, endsAt)) return 'ALL\u00a0NIGHT';
  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) return startsAt;
  return date.toLocaleTimeString('es-CO', {
    timeZone: BOGOTA_TZ,
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Three-beat overlay line from genres or description: "NATURALEZA × RITMO × COMUNIDAD". */
export function eventTagline(description?: string, genres?: string[]): string | null {
  const extra = (genres ?? []).map((genre) => genre.trim()).filter(Boolean);
  if (extra.length >= 2) {
    return extra.slice(0, 3).map((genre) => genre.toUpperCase()).join('  ×  ');
  }
  const raw = description?.trim();
  if (!raw) return null;
  const beats = raw
    .replace(/[:;/|]/g, ',')
    .split(',')
    .map((part) => part.replace(/\.$/, '').trim())
    .filter((part) => part.length >= 3)
    .map((part) => part.split(/\s+/).slice(0, 3).join(' ').toUpperCase());
  if (beats.length >= 2) return beats.slice(0, 3).join('  ×  ');
  const one = raw.replace(/\.$/, '').trim().toUpperCase();
  if (one.length <= 42) return one;
  return `${one.slice(0, 40).trim()}…`;
}

/** Compact pin label: "Hoy" or "18 sep". */
export function formatPinDay(iso: string, now = new Date()): string {
  if (isSameLocalDay(iso, now)) return 'Hoy';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }).replace(/\./g, '');
}

export function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const ENDED_EVENT_COPY =
  'Este evento ya finalizó. Los datos quedan en consulta para no alterar métricas ni ventas.';

const DAY_MS = 24 * 60 * 60 * 1000;

/** True once the night is over. Missing `endsAt` uses a 12h window after start. */
export function eventHasEnded(event: { startsAt: string; endsAt?: string }, now = Date.now()): boolean {
  if (event.endsAt) {
    const end = Date.parse(event.endsAt);
    return Number.isFinite(end) && end < now;
  }
  const start = Date.parse(event.startsAt);
  return Number.isFinite(start) && start + 12 * 60 * 60 * 1000 < now;
}

/** Published nights that start before seven local midnights from now (includes tonight). */
export function eventIsThisWeek(event: { startsAt: string }, now = Date.now()): boolean {
  const start = Date.parse(event.startsAt);
  if (!Number.isFinite(start)) return false;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return start < today.getTime() + 7 * DAY_MS;
}

export function formatWhenRange(startsAt: string, endsAt?: string): string {
  const start = formatWhen(startsAt);
  if (!endsAt) return start;
  return `${start} – ${formatTime(endsAt)}`;
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function toDateInput(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10);
  return date.toISOString().slice(0, 10);
}

export function fromDateInput(value: string, endOfDay = false): string | undefined {
  if (!value) return undefined;
  return endOfDay ? `${value}T23:59:59.000Z` : `${value}T00:00:00.000Z`;
}

export function startOfDayISO(date = new Date()): string {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next.toISOString();
}

export function endOfDayISO(date = new Date()): string {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next.toISOString();
}

export function weekendRange(from = new Date()): { from: string; to: string } {
  const day = from.getDay();
  const saturday = new Date(from);
  const delta = day === 0 ? -1 : 6 - day;
  saturday.setDate(from.getDate() + delta);
  const sunday = new Date(saturday);
  sunday.setDate(saturday.getDate() + 1);
  return { from: startOfDayISO(saturday), to: endOfDayISO(sunday) };
}

export function monthRange(from = new Date()): { from: string; to: string } {
  const start = new Date(from.getFullYear(), from.getMonth(), 1);
  const end = new Date(from.getFullYear(), from.getMonth() + 1, 0);
  return { from: startOfDayISO(start), to: endOfDayISO(end) };
}

export function formatMoney(cents: number, currency = 'COP'): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(cents);
}

export function formatPercent(rate: number): string {
  if (!Number.isFinite(rate)) return '0%';
  return `${Math.round(rate * 100)}%`;
}

/** Clock in Bogotá: "22:00". */
export function formatClock(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleTimeString('es-CO', {
    timeZone: BOGOTA_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    draft: 'Borrador',
    in_review: 'En revisión',
    published: 'Publicado',
    rejected: 'Rechazado',
    valid: 'Válido',
    reserved: 'Pago pendiente',
    used: 'Usado',
    transferred: 'Cedido',
    cancelled: 'Cancelado',
    pending: 'Pendiente',
    paid: 'Pagado',
    failed: 'Fallido',
    expired: 'Vencido',
    active: 'Activo',
    revoked: 'Revocado',
  };
  return map[status] ?? status;
}

export function isSameLocalDay(iso: string, now = new Date()): boolean {
  const d = new Date(iso);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

export function countdownTo(iso: string, now = new Date()): string | null {
  const ms = Date.parse(iso) - now.getTime();
  if (ms <= 0) {
    return 'Ahora';
  }
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  if (hours >= 24) {
    return null;
  }
  if (hours < 1) {
    return `${minutes}\u00a0min`;
  }
  return `${hours}\u00a0h\u00a0${minutes}\u00a0min`;
}
