import * as WebBrowser from 'expo-web-browser';

import { api } from '@/data/client';

WebBrowser.maybeCompleteAuthSession();

const COBROS_RETURN = 'parche://parche/cobros';
const MP_SIGNUP = 'https://www.mercadopago.com.co/hub/registration';

const sheet = (colors?: { toolbar?: string; controls?: string }) => ({
  presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
  dismissButtonStyle: 'close' as const,
  toolbarColor: colors?.toolbar,
  controlsColor: colors?.controls,
  createTask: false,
  showInRecents: false,
  enableBarCollapsing: true,
});

/** Checkout Pro in the official in-app browser (Custom Tabs / Safari VC). Never a WebView. */
export async function openMercadoPagoCheckout(
  url: string,
  colors?: { toolbar?: string; controls?: string }
) {
  return WebBrowser.openBrowserAsync(url, {
    ...sheet(colors),
    // OAuth "conectar cobros" shares Chrome/Safari cookies with Custom Tabs.
    // A private session keeps the buyer as guest so TEST cards can work.
    preferEphemeralSession: true,
  });
}

export function dismissMercadoPagoCheckout() {
  void WebBrowser.dismissBrowser();
}

export async function openMercadoPagoSignup() {
  return WebBrowser.openBrowserAsync(MP_SIGNUP, sheet());
}

export async function startMercadoPagoConnect(): Promise<'connected' | 'denied' | 'dismissed'> {
  const url = await api.payments.connect();
  const result = await WebBrowser.openAuthSessionAsync(url, COBROS_RETURN);
  if (result.type !== 'success' || !result.url) {
    return 'dismissed';
  }
  try {
    const mp = new URL(result.url).searchParams.get('mp');
    if (mp === 'connected') {
      return 'connected';
    }
    if (mp === 'denied') {
      return 'denied';
    }
  } catch {
    /* custom schemes still parse in RN URL */
  }
  if (result.url.includes('mp=connected')) {
    return 'connected';
  }
  if (result.url.includes('mp=denied')) {
    return 'denied';
  }
  return 'dismissed';
}
