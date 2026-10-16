export const Colors = {
  light: {
    text: "#0b0b12",
    background: "#f4f4f7",
    surface: "#ffffff",
    backgroundElement: "#ececf1",
    backgroundSelected: "#e2e2ea",
    textSecondary: "#5c5c6e",
    textMuted: "#8a8a9b",
    charcoal: "#1c1c26",
    border: "rgb(11 11 18 / 0.1)",
    aurora: "#b8a4ff",
    neon: "#3ddcff",
    confirm: "#7ffeb1",
  },
  dark: {
    text: "#f5f5f8",
    background: "#07070c",
    surface: "#12121a",
    backgroundElement: "#1c1c26",
    backgroundSelected: "#2a2a36",
    textSecondary: "#9a9aab",
    textMuted: "#8a8a9b",
    charcoal: "#ececf1",
    border: "rgb(245 245 248 / 0.1)",
    aurora: "#b8a4ff",
    neon: "#3ddcff",
    confirm: "#7ffeb1",
  },
} as const;

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

export const MaxContentWidth = 1280;
