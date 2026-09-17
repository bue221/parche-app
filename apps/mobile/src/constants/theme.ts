import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    // Text hierarchy
    text: '#0b0b12',
    textSecondary: '#5c5c6e',
    textMuted: '#8a8a9b',

    // Surface hierarchy - visible contrast
    background: '#f2f2f5',
    surface: '#ffffff',
    surfaceSunken: '#e8e8ed',
    surfaceElevated: '#ffffff',
    backgroundElement: '#e8e8ee',
    backgroundSelected: '#ece6ff',

    // Stage primitives
    charcoal: '#1c1c26',

    // Borders
    border: 'rgba(11, 11, 18, 0.08)',
    borderStrong: 'rgba(11, 11, 18, 0.16)',

    // Pigment
    aurora: '#b8a4ff',
    neon: '#3ddcff',
    confirm: '#7ffeb1',
    volt: '#7ffeb1',
    amber: '#ffc44d',
    danger: '#ff4d3d',
  },
  dark: {
    // Text hierarchy
    text: '#f5f5f8',
    textSecondary: '#a0a0b0',
    textMuted: '#6b6b7a',

    // Surface hierarchy - 3 levels for visible depth
    background: '#08080d',
    surface: '#111118',
    surfaceSunken: '#08080d',
    surfaceElevated: '#1a1a22',
    surfaceRaised: '#242430',
    backgroundElement: '#1c1c25',
    backgroundSelected: '#2a2248',

    // Stage primitives
    charcoal: '#ececf1',

    // Borders
    border: 'rgba(245, 245, 248, 0.1)',
    borderStrong: 'rgba(245, 245, 248, 0.2)',

    // Pigment
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
