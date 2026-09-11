export const Colors = {
  light: {
    text: "#000000",
    background: "#ffffff",
    backgroundElement: "#eeeeee",
    backgroundSelected: "#d9d9d9",
    textSecondary: "#595959",
    textMuted: "#808080",
    charcoal: "#333333",
    border: "#d9d9d9",
    confirm: "#7ffeb1",
  },
  dark: {
    text: "#ffffff",
    background: "#000000",
    backgroundElement: "#333333",
    backgroundSelected: "#595959",
    textSecondary: "#808080",
    textMuted: "#808080",
    charcoal: "#eeeeee",
    border: "#333333",
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
  small: 4,
  cards: 8,
  images: 8,
  navelements: 20,
  buttons: 40,
  tags: 100,
} as const;

export const MaxContentWidth = 1200;
