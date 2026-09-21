export type PayoutStatus = {
  connected: boolean;
  oauthEnabled: boolean;
  payoutRequired?: boolean;
};

/** Organizers must connect Mercado Pago before creating events when OAuth is on. */
export function needsPayoutSetup(status: PayoutStatus): boolean {
  if (status.payoutRequired === true) {
    return true;
  }
  if (status.payoutRequired === false || status.connected) {
    return false;
  }
  return status.oauthEnabled;
}
