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
