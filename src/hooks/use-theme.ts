/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useThemePref } from '@/data/theme-store';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useResolvedColorScheme(): 'light' | 'dark' {
  const pref = useThemePref((s) => s.pref);
  const system = useColorScheme();
  if (pref === 'light' || pref === 'dark') {
    return pref;
  }
  return system === 'dark' ? 'dark' : 'light';
}

export function useTheme() {
  return Colors[useResolvedColorScheme()];
}
