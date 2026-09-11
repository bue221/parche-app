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

export function formatMoney(cents: number, currency = 'COP'): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
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
