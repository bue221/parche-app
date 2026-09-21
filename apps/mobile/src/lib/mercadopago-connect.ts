export type MercadoPagoConnectState = 'locked' | 'needs_secret' | 'ready' | 'connected';

export function mercadoPagoConnectState(input: {
  locked?: boolean;
  connected: boolean;
  oauthEnabled: boolean;
}): MercadoPagoConnectState {
  if (input.locked) return 'locked';
  if (input.connected) return 'connected';
  if (!input.oauthEnabled) return 'needs_secret';
  return 'ready';
}
