export function formatTicketDate(iso?: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const days = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
  const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
  return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
}

export function formatTicketTime(iso?: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function cityFromAddress(address?: string): string {
  const value = address?.trim();
  if (!value) return '—';
  const parts = value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  return parts[parts.length - 1] ?? '—';
}

export function ticketStubCode(eventName: string | undefined, ticketId: string): string {
  const tokens = (eventName ?? '').toUpperCase().match(/[A-Z0-9]+/g) ?? [];
  const marked = tokens.find((token) => /\d/.test(token));
  const slug = (marked ?? tokens.join('')).slice(0, 4) || 'PARC';
  const tail = ticketId.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase() || '0000';
  return `TCK-${slug}-${tail}`;
}
