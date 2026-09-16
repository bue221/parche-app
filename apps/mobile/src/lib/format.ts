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

export function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  });
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
    return `${minutes} min`;
  }
  return `${hours} h ${minutes} min`;
}
