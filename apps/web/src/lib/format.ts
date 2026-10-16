const TZ = "America/Bogota";

export function formatEventWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("es-CO", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  });
}

export function formatEventTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  });
}

export function formatEventRange(startsAt: string, endsAt?: string): string {
  const start = formatEventWhen(startsAt);
  if (!endsAt) return start;
  return `${start} – ${formatEventTime(endsAt)}`;
}

export function formatEventLongDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const raw = date.toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: TZ,
  });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function formatMoney(cents: number, currency = "COP"): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents);
}

export function eventHasEnded(
  event: { startsAt: string; endsAt?: string },
  now = Date.now(),
): boolean {
  if (event.endsAt) {
    const end = Date.parse(event.endsAt);
    return Number.isFinite(end) && end < now;
  }
  const start = Date.parse(event.startsAt);
  return Number.isFinite(start) && start + 12 * 60 * 60 * 1000 < now;
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatEventDay(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    timeZone: TZ,
  });
}

export function formatEventBadge(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("es-CO", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: TZ,
  });
}

export function formatEventPosterBadge(iso: string): {
  weekday: string;
  dayMonth: string;
} {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return { weekday: iso, dayMonth: "" };
  }
  const weekday = date
    .toLocaleDateString("es-CO", { weekday: "short", timeZone: TZ })
    .replace(".", "")
    .toUpperCase();
  const day = date.toLocaleDateString("es-CO", {
    day: "2-digit",
    timeZone: TZ,
  });
  const month = date
    .toLocaleDateString("es-CO", { month: "short", timeZone: TZ })
    .replace(".", "")
    .toUpperCase();
  return { weekday, dayMonth: `${day} ${month}` };
}

export function ageLabel(policy?: string): string | undefined {
  if (!policy) return undefined;
  if (/\b18\b/.test(policy)) return "+18";
  return policy;
}

export function statusLabel(status: string): string {
  if (status === "cancelled") return "Cancelado";
  if (status === "published") return "Publicado";
  return status;
}

export function toDateInput(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10);
  return date.toISOString().slice(0, 10);
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

export function isSameLocalDay(iso: string, now = new Date()): boolean {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function formatPinDay(iso: string, now = new Date()): string {
  if (isSameLocalDay(iso, now)) return "Hoy";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date
    .toLocaleDateString("es-CO", { day: "numeric", month: "short" })
    .replace(/\./g, "");
}

export function countdownTo(iso: string, now = new Date()): string | null {
  const ms = Date.parse(iso) - now.getTime();
  if (!Number.isFinite(ms) || ms <= 0) return "Ahora";
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  if (hours >= 24) return null;
  if (hours < 1) return `${minutes} min`;
  return `${hours} h ${minutes} min`;
}
