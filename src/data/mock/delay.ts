export function wait(ms = 180): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
