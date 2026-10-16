/**
 * Public catalog GETs accept an optional Bearer. If they run before auth
 * hydration, the app paints as a guest and then refetches with a session.
 */
export function afterAuthHydration(hydrated: boolean, extra = true): boolean {
  return hydrated && extra;
}

export function hasOptionalAuth(accessToken: string | null | undefined): boolean {
  return Boolean(accessToken);
}
