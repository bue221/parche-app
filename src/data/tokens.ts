import { createId } from '@/data/ids';

const TICKET_PREFIX = 'tkt.';
const ACCESS_PREFIX = 'acc.';

export function issueAccessToken(userId: string): string {
  return `${ACCESS_PREFIX}${userId}.${createId('at')}`;
}

export function issueRefreshToken(familyId: string): string {
  return `ref.${familyId}.${createId('rt')}`;
}

export function issueTicketToken(input: { ticketId: string; eventId: string; jti: string; exp: number }): string {
  const payload = encodeURIComponent(JSON.stringify(input));
  return `${TICKET_PREFIX}${payload}.sig`;
}

export function parseTicketToken(token: string): { ticketId: string; eventId: string; jti: string; exp: number } | null {
  if (!token.startsWith(TICKET_PREFIX)) {
    return null;
  }
  const payload = token.slice(TICKET_PREFIX.length).split('.sig')[0];
  try {
    const parsed = JSON.parse(decodeURIComponent(payload)) as {
      ticketId: string;
      eventId: string;
      jti: string;
      exp: number;
    };
    if (!parsed.ticketId || !parsed.eventId || !parsed.jti) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function isAccessToken(token: string): boolean {
  return token.startsWith(ACCESS_PREFIX);
}
