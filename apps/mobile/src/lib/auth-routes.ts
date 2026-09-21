/** Password / OTP stack routes. The boot AuthSheet must not cover these. */
export function isAuthPath(path: string | null | undefined): boolean {
  if (!path) return false;
  return path === '/reset' || path.startsWith('/auth');
}
