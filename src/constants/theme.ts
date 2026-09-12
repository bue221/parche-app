import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#eeeeee',
    backgroundSelected: '#d9d9d9',
    textSecondary: '#595959',
    textMuted: '#808080',
    charcoal: '#333333',
    border: '#d9d9d9',
    confirm: '#7ffeb1',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#333333',
    backgroundSelected: '#595959',
    textSecondary: '#808080',
    textMuted: '#808080',
    charcoal: '#eeeeee',
    border: '#333333',
    confirm: '#7ffeb1',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'Inter',
    display: 'Antonio',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'Inter',
    display: 'Antonio',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-favorit)',
    display: 'var(--font-foggy)',
    serif: 'var(--font-serif, Georgia, serif)',
    rounded: 'var(--font-favorit)',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
  section: 80,
} as const;

export const Radii = {
  small: 4,
  cards: 16,
  images: 16,
  navelements: 20,
  buttons: 40,
  tags: 100,
} as const;

export const BottomTabInset = Platform.select({ ios: 88, android: 88, web: 0 }) ?? 88;
export const WebNavHeight = 72;
export const WebCompactTop = 56;
export const WebCompactBottom = 72;
export const MaxContentWidth = 1440;
