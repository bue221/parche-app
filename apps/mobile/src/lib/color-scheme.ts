export type ResolvedColorScheme = 'light' | 'dark';

/** RN 0.86 may report `unspecified` after unlocking system appearance. That is not a theme. */
export function coerceColorScheme(value: string | null | undefined): ResolvedColorScheme | null {
  if (value === 'dark' || value === 'light') return value;
  return null;
}
