import { mediaUrl, num, str, asRecord } from '@/data/http';
import type {
  Artist,
  EventStatus,
  EventWithExtras,
  Membership,
  MembershipRole,
  MembershipStatus,
  ParcheEvent,
  Ticket,
  TicketType,
} from '@/data/types';

export function mapStatus(raw: string): EventStatus {
  if (raw === 'pending_review') {
    return 'in_review';
  }
  if (raw === 'published' || raw === 'draft' || raw === 'rejected') {
    return raw;
  }
  if (raw === 'cancelled' || raw === 'archived') {
    return 'draft';
  }
  return 'draft';
}

export function mapEvent(raw: unknown): ParcheEvent {
  const e = asRecord(raw);
  const flyer = asRecord(e.flyer);
  const genres = Array.isArray(e.genres) ? e.genres.map((g) => String(g)) : [];
  return {
    id: str(e.id),
    tenantId: str(e.tenant_id),
    ownerUserId: str(e.created_by),
    name: str(e.title) || str(e.name),
    startsAt: str(e.starts_at),
    venueName: str(e.venue_name),
    addressText: str(e.address_text),
    description: str(e.description),
    flyerUrl: mediaUrl(flyer.public_url) ?? mediaUrl(flyer.thumb_url),
    lat: typeof e.lat === 'number' ? e.lat : undefined,
    lng: typeof e.lng === 'number' ? e.lng : undefined,
    status: mapStatus(str(e.status)),
    genre: genres[0] ?? 'techno',
    rejectReason: str(e.reject_reason) || undefined,
    updatedAt: str(e.updated_at),
  };
}

export function mapEventDetail(raw: unknown): EventWithExtras {
  const e = asRecord(raw);
  const base = mapEvent(raw);
  const lineupRaw = Array.isArray(e.lineup) ? e.lineup : [];
  const tracksRaw = Array.isArray(e.tracks) ? e.tracks : [];
  const typesRaw = Array.isArray(e.ticket_types) ? e.ticket_types : [];
  return {
    ...base,
    lineup: lineupRaw.map((row) => {
      const a = asRecord(row);
      const avatar = asRecord(a.avatar);
      return {
        id: str(a.artist_id) || str(a.id),
        stageName: str(a.name),
        bio: '',
        avatarUrl: mediaUrl(avatar.public_url),
      } satisfies Artist;
    }),
    tracks: tracksRaw.map((row, i) => {
      const t = asRecord(row);
      return {
        id: str(t.id),
        eventId: base.id,
        title: str(t.title),
        url: mediaUrl(t.preview_url) ?? '',
        sortOrder: num(t.position, i),
      };
    }),
    ticketTypes: typesRaw.map(mapTicketType),
  };
}

export function mapTicketType(raw: unknown): TicketType {
  const t = asRecord(raw);
  return {
    id: str(t.id),
    eventId: str(t.event_id),
    name: str(t.name),
    priceCents: num(t.price_cents),
    currency: str(t.currency, 'COP'),
    capacity: num(t.capacity),
    sold: num(t.sold_count),
    reserved: num(t.reserved_count),
    salesFrom: str(t.sales_starts_at) || new Date(0).toISOString(),
    salesTo: str(t.sales_ends_at) || new Date('2099-01-01').toISOString(),
  };
}

export function mapMembership(raw: unknown, eventId: string): Membership {
  const m = asRecord(raw);
  return {
    id: `${eventId}:${str(m.user_id)}`,
    eventId,
    userId: str(m.user_id) || undefined,
    email: str(m.email) || str(m.display_name),
    role: str(m.role) as MembershipRole,
    status: (str(m.status) || 'active') as MembershipStatus,
  };
}

export function mapWalletTicket(raw: unknown): Ticket {
  const t = asRecord(raw);
  const event = asRecord(t.event);
  return {
    id: str(t.ticket_id) || str(t.id),
    orderId: str(t.order_id),
    eventId: str(event.id) || str(t.event_id),
    ticketTypeId: str(t.ticket_type_id),
    userId: str(t.user_id),
    status: (str(t.status) || 'valid') as Ticket['status'],
    token: str(t.qr_token),
    tokenJti: str(t.barcode) || str(t.jti),
    tokenExpiresAt: 0,
    printSeenByUserIds: [],
  };
}
