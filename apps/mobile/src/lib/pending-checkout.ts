const urls = new Map<string, string>();
const autoOpened = new Set<string>();

export function rememberCheckout(orderId: string, url?: string) {
  const id = orderId.trim();
  const checkout = url?.trim() ?? '';
  if (!id || !checkout) {
    return;
  }
  urls.set(id, checkout);
}

export function peekCheckout(orderId: string) {
  return urls.get(orderId.trim());
}

/** True the first time this order should auto-open Mercado Pago. */
export function claimCheckoutAutoOpen(orderId: string) {
  const id = orderId.trim();
  if (!id || autoOpened.has(id)) {
    return false;
  }
  autoOpened.add(id);
  return true;
}

export function resetPendingCheckout() {
  urls.clear();
  autoOpened.clear();
}
