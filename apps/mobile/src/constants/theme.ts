import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0b0b12',
    background: '#f4f4f7',
    surface: '#ffffff',
    backgroundElement: '#ececf1',
    backgroundSelected: '#ece6ff',
    textSecondary: '#5c5c6e',
    textMuted: '#8a8a9b',
    charcoal: '#1c1c26',
    border: 'rgba(11, 11, 18, 0.1)',
    aurora: '#b8a4ff',
    neon: '#3ddcff',
    confirm: '#7ffeb1',
    volt: '#7ffeb1',
    amber: '#ffc44d',
    danger: '#ff4d3d',
  },
  dark: {
    text: '#f5f5f8',
    background: '#07070c',
    surface: '#12121a',
    backgroundElement: '#1c1c26',
    backgroundSelected: '#2a2248',
    textSecondary: '#9a9aab',
    textMuted: '#8a8a9b',
    charcoal: '#ececf1',
    border: 'rgba(245, 245, 248, 0.1)',
    aurora: '#b8a4ff',
    neon: '#3ddcff',
    confirm: '#7ffeb1',
    volt: '#7ffeb1',
    amber: '#ffc44d',
    danger: '#ff4d3d',
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
  small: 8,
  cards: 20,
  images: 20,
  navelements: 28,
  buttons: 40,
  tags: 100,
} as const;

export const BottomTabInset = Platform.select({ ios: 96, android: 96, web: 0 }) ?? 96;
export const WebNavHeight = 72;
export const WebCompactTop = 56;
export const WebCompactBottom = 88;
export const MaxContentWidth = 1280;
