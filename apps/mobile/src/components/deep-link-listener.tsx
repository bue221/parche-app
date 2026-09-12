import * as Linking from 'expo-linking';
import { router, type Href } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { debugLog } from '@/data/log';
import { setPendingPath, useAuthSnapshot } from '@/data/session';

function routeFromUrl(url: string): Href | null {
  const parsed = Linking.parse(url);
  const path = (parsed.path ?? '').replace(/^\//, '');
  const [head, ...rest] = path.split('/');
  if (head === 'event' && rest[0]) {
    return `/event/${rest[0]}` as Href;
  }
  if (head === 'artist' && rest[0]) {
    return `/artist/${rest[0]}` as Href;
  }
  if (head === 'invites' && rest[0]) {
    return `/invites/${rest[0]}` as Href;
  }
  if ((head === 'orders' || head === 'return') && rest[0]) {
    return `/orders/${rest[0]}` as Href;
  }
  if (head === 'tickets' && rest[0] === 'print') {
    return '/tickets/print' as Href;
  }
  return null;
}

export function DeepLinkListener() {
  const { isLoggedIn } = useAuthSnapshot();

  useEffect(() => {
    // Web: expo-linking fires `url` on every window.message (maps, HMR). Expo Router owns http URLs.
    if (Platform.OS === 'web') {
      return;
    }

    const handle = (url: string) => {
      const dest = routeFromUrl(url);
      if (!dest) {
        debugLog('deeplink', 'unknown url');
        return;
      }
      const needsAuth = String(dest).includes('/invites/') || String(dest).includes('/orders/');
      if (needsAuth && !isLoggedIn) {
        setPendingPath(String(dest));
        router.push('/auth/login' as Href);
        return;
      }
      router.push(dest);
    };

    const sub = Linking.addEventListener('url', ({ url }) => handle(url));
    void Linking.getInitialURL().then((url) => {
      if (url) {
        handle(url);
      }
    });
    return () => sub.remove();
  }, [isLoggedIn]);

  return null;
}
