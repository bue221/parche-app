export const THEME_STORAGE_KEY = "parche-theme";

export type Theme = "light" | "dark";

export function applyTheme(theme: Theme, persist = true) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
  root.style.colorScheme = theme;
  if (persist) {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }
}

export function readTheme(): Theme {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}
