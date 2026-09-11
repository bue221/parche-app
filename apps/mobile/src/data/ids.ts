export function createId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  const time = Date.now().toString(36).slice(-4);
  return `${prefix}_${time}${rand}`;
}

export function shortId(id: string): string {
  return id.slice(-4).toUpperCase();
}
