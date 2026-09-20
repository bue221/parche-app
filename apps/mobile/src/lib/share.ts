import * as Linking from 'expo-linking';
import { Platform, Share } from 'react-native';

import { webLink } from '@/data/env';
import { debugLog } from '@/data/log';
import { toast } from '@/data/toast-store';

function isShareCancel(error: unknown) {
  const name = error instanceof Error ? error.name : '';
  const message = error instanceof Error ? error.message : String(error);
  return name === 'AbortError' || /cancel|dismiss/i.test(message);
}

export function eventShareUrl(eventId: string): string {
  if (Platform.OS === 'web' && globalThis.location?.origin) {
    return `${globalThis.location.origin}/event/${eventId}`;
  }
  // A parche:// link is useless to someone without the app, so prefer the web origin when it exists.
  return webLink(`/event/${eventId}`) ?? Linking.createURL(`/event/${eventId}`);
}

function copyUrl(url: string): boolean {
  if (typeof document === 'undefined') {
    return false;
  }
  const field = document.createElement('textarea');
  field.value = url;
  field.setAttribute('readonly', '');
  field.style.position = 'fixed';
  field.style.top = '0';
  field.style.left = '-9999px';
  document.body.appendChild(field);
  field.select();
  field.setSelectionRange(0, url.length);
  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  }
  document.body.removeChild(field);
  return copied;
}

export async function shareEvent(input: { id: string; name: string; venueName?: string }): Promise<void> {
  const url = eventShareUrl(input.id);
  const message = input.venueName?.trim() ? `${input.name} · ${input.venueName.trim()}` : input.name;
  try {
    if (Platform.OS === 'web') {
      const nav = globalThis.navigator;
      if (typeof nav?.share === 'function') {
        try {
          await nav.share({ title: input.name, text: message, url });
          return;
        } catch (error) {
          if (isShareCancel(error)) return;
          debugLog('share', 'web share sheet failed', { eventId: input.id, error: String(error) });
        }
      }
      if (nav?.clipboard?.writeText) {
        try {
          await nav.clipboard.writeText(url);
          toast('Link copiado', 'success');
          return;
        } catch (error) {
          debugLog('share', 'clipboard write failed', { eventId: input.id, error: String(error) });
        }
      }
      if (copyUrl(url)) {
        toast('Link copiado', 'success');
        return;
      }
      toast('No se pudo compartir este evento');
      return;
    }
    await Share.share(
      Platform.OS === 'ios'
        ? { url, message, title: input.name }
        : { message: `${message}\n${url}`, title: input.name }
    );
  } catch (error) {
    if (isShareCancel(error)) return;
    debugLog('share', 'event share failed', { eventId: input.id, error: String(error) });
    toast('No se pudo compartir este evento');
  }
}
