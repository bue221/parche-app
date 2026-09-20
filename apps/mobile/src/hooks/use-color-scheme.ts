import { useEffect, useState } from 'react';
import { Appearance, AppState } from 'react-native';

import { coerceColorScheme, type ResolvedColorScheme } from '@/lib/color-scheme';

export type { ResolvedColorScheme };

/**
 * RN 0.86 can emit `unspecified` after Appearance.setColorScheme('unspecified').
 * That is not the OS theme — ignore it and keep the last real light/dark value.
 */
export function useColorScheme(): ResolvedColorScheme {
  const [scheme, setScheme] = useState<ResolvedColorScheme>(
    () => coerceColorScheme(Appearance.getColorScheme()) ?? 'light'
  );

  useEffect(() => {
    const apply = (value: string | null | undefined) => {
      const next = coerceColorScheme(value) ?? coerceColorScheme(Appearance.getColorScheme());
      if (next) setScheme(next);
    };

    apply(Appearance.getColorScheme());

    const appearance = Appearance.addChangeListener(({ colorScheme }) => {
      apply(colorScheme);
    });
    const app = AppState.addEventListener('change', (next) => {
      if (next === 'active') apply(Appearance.getColorScheme());
    });

    return () => {
      appearance.remove();
      app.remove();
    };
  }, []);

  return scheme;
}
