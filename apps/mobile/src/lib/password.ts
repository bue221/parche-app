export const MIN_PASSWORD_LEN = 10;

export function passwordIssue(password: string): string | undefined {
  if ([...password].length < MIN_PASSWORD_LEN) {
    return 'Mínimo 10 caracteres.';
  }
  if (/^\d+$/.test(password)) {
    return 'No uses solo números.';
  }
  return undefined;
}
