/** Checkout Pro is an https URL that is not the local fake pay page. */
export function hostedCheckout(url?: string) {
  const value = url?.trim() ?? '';
  if (!value || value.includes('/v1/dev/pay/')) {
    return false;
  }
  return /^https?:\/\//i.test(value);
}

export function isFakeCheckout(url?: string) {
  return Boolean(url?.includes('/v1/dev/pay/'));
}
