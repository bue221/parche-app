/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/develop/user-interface/color-themes/
 */

import { Colors } from '@/constants/theme';
import { useThemePref } from '@/data/theme-store';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { ResolvedColorScheme } from '@/lib/color-scheme';

export function useResolvedColorScheme(): ResolvedColorScheme {
  const pref = useThemePref((s) => s.pref);
  const system = useColorScheme();
  if (pref === 'light' || pref === 'dark') {
    return pref;
  }
  return system;
}

export function useTheme() {
  return Colors[useResolvedColorScheme()];
}
