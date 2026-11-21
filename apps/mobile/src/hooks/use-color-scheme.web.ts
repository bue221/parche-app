import { useSyncExternalStore } from 'react';
import { Appearance, useColorScheme as useRNColorScheme } from 'react-native';

import { coerceColorScheme, type ResolvedColorScheme } from '@/lib/color-scheme';

const emptySubscribe = () => () => {};

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme(): ResolvedColorScheme {
  const hasHydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const colorScheme = useRNColorScheme();
  const resolved =
    coerceColorScheme(colorScheme) ?? coerceColorScheme(Appearance.getColorScheme()) ?? 'light';

  if (hasHydrated) {
    return resolved;
  }

  return 'light';
}
