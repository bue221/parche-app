import { useAuthStore } from '@/data/auth-store';
import { API_URL, rewriteMediaUrl } from '@/data/env';
import { ApiError } from '@/data/errors';
import { apiFetch, asRecord, mediaUrl, num, refreshSession, revokeLocalSession, str } from '@/data/http';
import { createId } from '@/data/ids';
import { mapEvent, mapEventDetail, mapMembership, mapTicketType, mapWalletTicket } from '@/data/mappers';
import type { EventWithExtras, Me, ParcheApi } from '@/data/mock/api';
import { markPrintSeen as persistPrintSeen } from '@/data/print-seen';
import {
  getWalletTickets,
  hydratePrintSeen,
  pendingPrintTickets,
  rememberPrintSeen,
  setWalletTickets,
} from '@/data/ticket-cache';
import { getAccessExpiresAt, getRefreshToken, setTokens } from '@/data/token-store';
import type {
  Artist,
  CheckInCode,
  DevicePermission,
  EventFilters,
  Membership,
  MembershipRole,
  Order,
  ParcheEvent,
  ProfileKind,
  Ticket,
  TicketType,
  Upload,
} from '@/data/types';

const BOGOTA = { lat: 4.711, lng: -74.072 };
const PNG_1X1 = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82,
]);

function itemsOf(body: unknown): unknown[] {
  const rec = asRecord(body);
  return Array.isArray(rec.items) ? rec.items : Array.isArray(body) ? (body as unknown[]) : [];
}

function mapProfiles(raw: unknown): { profiles: ProfileKind[]; platformAdmin: boolean } {
  const list = Array.isArray(raw) ? raw.map((p) => String(p)) : [];
  const profiles = list.filter((p): p is ProfileKind => p === 'attendee' || p === 'promoter' || p === 'artist');
  if (!profiles.includes('attendee')) {
    profiles.push('attendee');
  }
  return { profiles, platformAdmin: list.includes('platform_admin') };
}

function mapMe(raw: unknown): Me {
  const rec = asRecord(raw);
  const { profiles, platformAdmin } = mapProfiles(rec.profiles);
  const memberships = Array.isArray(rec.memberships)
    ? rec.memberships.map((row) => {
        const m = asRecord(row);
        return {
          id: `${str(m.event_id)}:${str(m.role)}`,
          eventId: str(m.event_id),
          userId: str(rec.id),
          email: str(rec.email),
          role: str(m.role) as MembershipRole,
          status: (str(m.status) || 'active') as Membership['status'],
        } satisfies Membership;
      })
    : [];
  const tenants = Array.isArray(rec.tenants) ? rec.tenants : [];
  const firstTenant = asRecord(tenants[0] ?? rec.tenant);
  if (firstTenant.id) {
    useAuthStore.getState().setTenantId(str(firstTenant.id));
  }
  const me: Me = {
    id: str(rec.id),
    email: str(rec.email),
    displayName: str(rec.display_name),
    phone: str(rec.phone) || undefined,
    avatarUrl: mediaUrl(rec.avatar_url),
    profiles,
    platformAdmin,
    memberships,
  };
  useAuthStore.getState().setMe(me);
  return me;
}

async function applyTokens(body: unknown): Promise<void> {
  const rec = asRecord(body);
  const accessExpiresAt = rec.access_expires_at ? Date.parse(String(rec.access_expires_at)) : Date.now() + 12 * 60_000;
  await setTokens({
    accessToken: str(rec.access_token),
    refreshToken: str(rec.refresh_token) || getRefreshToken() || '',
    accessExpiresAt,
  });
  useAuthStore.getState().setAccessExpiresAt(accessExpiresAt);
}

async function hydrateEvent(id: string): Promise<EventWithExtras> {
  const detail = mapEventDetail(await apiFetch(`/v1/events/${id}`, { auth: Boolean(useAuthStore.getState().me) }));
  if (detail.ticketTypes.length === 0) {
    try {
      const types = await apiFetch(`/v1/events/${id}/ticket-types`, { auth: true });
      detail.ticketTypes = itemsOf(types).map(mapTicketType);
    } catch {
      /* public detail may omit types until signed in */
    }
  }
  return detail;
}

function typeOnSale(type: TicketType): boolean {
  const now = Date.now();
  return now >= Date.parse(type.salesFrom) && now <= Date.parse(type.salesTo) && available(type) > 0;
}

function available(type: TicketType): number {
  return Math.max(0, type.capacity - type.sold - type.reserved);
}

function can(userId: string, eventId: string, permission: string): boolean {
  const { me, memberships } = useAuthStore.getState();
  const role = memberships.find((m) => m.eventId === eventId && m.status === 'active')?.role;
  switch (permission) {
    case 'event.write':
    case 'event.tickets.manage':
    case 'event.members.manage':
      return role === 'owner' || role === 'manager';
    case 'event.door.scan':
    case 'event.door.live':
      return role === 'owner' || role === 'manager' || role === 'door';
    case 'event.metrics.read':
      return role === 'owner' || role === 'manager' || role === 'metrics';
    case 'platform_admin':
      return Boolean(me?.platformAdmin && me.id === userId);
    default:
      return false;
  }
}

async function ensureTenant(): Promise<string> {
  const existing = useAuthStore.getState().tenantId;
  if (existing) {
    return existing;
  }
  const me = await apiFetch('/v1/me', { auth: true });
  mapMe(me);
  const id = useAuthStore.getState().tenantId;
  if (id) {
    return id;
  }
  const created = asRecord(await apiFetch('/v1/tenants', { method: 'POST', auth: true, body: JSON.stringify({ name: 'Parche' }) }));
  const tenantId = str(created.id);
  useAuthStore.getState().setTenantId(tenantId);
  return tenantId;
}

function eventPayload(input: {
  name: string;
  startsAt: string;
  venueName?: string;
  addressText?: string;
  description?: string;
  genre?: string;
  lat?: number;
  lng?: number;
  tenantId: string;
}) {
  const starts = new Date(input.startsAt);
  const ends = new Date(starts.getTime() + 6 * 60 * 60 * 1000);
  const pin =
    input.lat != null && input.lng != null
      ? {
          name: input.venueName || 'Pin',
          address_text: input.addressText || '',
          lat: input.lat,
          lng: input.lng,
        }
      : undefined;
  return {
    tenant_id: input.tenantId,
    title: input.name,
    description: input.description || '',
    starts_at: starts.toISOString(),
    ends_at: ends.toISOString(),
    genres: input.genre ? [input.genre] : ['techno'],
    pin,
  };
}

function mapArtist(raw: unknown): Artist {
  const a = asRecord(raw);
  const avatar = asRecord(a.avatar);
  return {
    id: str(a.id),
    userId: str(a.user_id) || undefined,
    stageName: str(a.name) || str(a.stage_name),
    bio: str(a.bio),
    avatarUrl: mediaUrl(avatar.public_url) ?? mediaUrl(a.avatar_url),
  };
}

function mapOrder(raw: unknown): Order & { tickets: Ticket[] } {
  const o = asRecord(raw);
  const items = Array.isArray(o.items) ? o.items : [];
  const first = asRecord(items[0]);
  const ticketsRaw = Array.isArray(o.tickets) ? o.tickets : [];
  return {
    id: str(o.id) || str(o.order_id),
    eventId: str(o.event_id),
    userId: useAuthStore.getState().me?.id ?? '',
    ticketTypeId: str(first.ticket_type_id),
    quantity: num(first.quantity, ticketsRaw.length || 1),
    status: (str(o.status) || 'pending') as Order['status'],
    totalCents: num(o.amount_cents),
    createdAt: str(o.created_at) || new Date().toISOString(),
    tickets: ticketsRaw.map((row) => {
      const t = asRecord(row);
      return {
        id: str(t.id),
        orderId: str(o.id) || str(o.order_id),
        eventId: str(o.event_id),
        ticketTypeId: str(t.ticket_type_id),
        userId: useAuthStore.getState().me?.id ?? '',
        status: (str(t.status) || 'reserved') as Ticket['status'],
        token: '',
        tokenJti: '',
        tokenExpiresAt: 0,
        printSeenByUserIds: [],
      };
    }),
  };
}

async function putBytes(url: string, mime: string, bytes: BodyInit, headers: Record<string, string>): Promise<void> {
  const target = rewriteMediaUrl(url);
  const res = await fetch(target.startsWith('http') ? target : `${API_URL}${target}`, {
    method: 'PUT',
    headers: { 'Content-Type': mime, ...headers },
    body: bytes,
  });
  if (!res.ok) {
    throw new ApiError('NETWORK', 'No pudimos subir el archivo');
  }
}

let pendingUpload: { mime: string; bytes: Uint8Array } | null = null;

export function setPendingUpload(next: { mime: string; bytes: Uint8Array } | null) {
  pendingUpload = next;
}

async function defaultBytes(kind: string): Promise<{ mime: string; bytes: Uint8Array }> {
  if (pendingUpload) {
    const next = pendingUpload;
    pendingUpload = null;
    return next;
  }
  if (kind === 'audio') {
    return { mime: 'audio/mpeg', bytes: new Uint8Array([0xff, 0xfb, 0x90, 0x00]) };
  }
  return { mime: 'image/png', bytes: PNG_1X1 };
}

export const httpApi: ParcheApi = {
  auth: {
    async register(input) {
      const body = await apiFetch('/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: input.email.trim().toLowerCase(),
          password: input.password,
          display_name: input.displayName.trim(),
          phone: input.phone?.trim() || undefined,
          profile: input.initialProfile,
        }),
      });
      await applyTokens(body);
      return this.me();
    },
    async login(email, password) {
      const body = await apiFetch('/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      await applyTokens(body);
      return this.me();
    },
    async refresh() {
      const ok = await refreshSession();
      if (!ok) {
        throw new ApiError('UNAUTHORIZED', 'Sesión vencida');
      }
      useAuthStore.getState().setAccessExpiresAt(getAccessExpiresAt());
      return {
        userId: useAuthStore.getState().me?.id ?? '',
        accessToken: '',
        refreshToken: getRefreshToken() ?? '',
        accessExpiresAt: getAccessExpiresAt(),
        refreshFamilyId: '',
        usedRefreshTokens: [],
      };
    },
    async logout() {
      try {
        const refresh = getRefreshToken();
        await apiFetch('/v1/auth/logout', {
          method: 'POST',
          auth: true,
          body: JSON.stringify(refresh ? { refresh_token: refresh } : {}),
        });
      } catch {
        /* still clear local */
      }
      await revokeLocalSession();
    },
    async me() {
      const raw = await apiFetch('/v1/me', { auth: true });
      return mapMe(raw);
    },
    async updateMe(patch) {
      const body: Record<string, string> = {};
      if (patch.displayName) body.display_name = patch.displayName;
      if (patch.phone !== undefined) body.phone = patch.phone;
      if (Object.keys(body).length) {
        await apiFetch('/v1/me', { method: 'PATCH', auth: true, body: JSON.stringify(body) });
      }
      return this.me();
    },
    async memberships() {
      const me = await this.me();
      return me.memberships;
    },
    async activateArtist() {
      await apiFetch('/v1/me/profiles/artist', { method: 'POST', auth: true, body: JSON.stringify({}) });
      return this.me();
    },
  },

  events: {
    async list(filters?: EventFilters) {
      const q = new URLSearchParams();
      if (filters?.q) q.set('q', filters.q);
      if (filters?.from) q.set('from', filters.from);
      if (filters?.to) q.set('to', filters.to);
      if (filters?.genre) q.set('genre', filters.genre);
      if (filters?.artistId) q.set('artist_id', filters.artistId);
      if (filters?.minLat != null) q.set('min_lat', String(filters.minLat));
      if (filters?.minLng != null) q.set('min_lng', String(filters.minLng));
      if (filters?.maxLat != null) q.set('max_lat', String(filters.maxLat));
      if (filters?.maxLng != null) q.set('max_lng', String(filters.maxLng));
      q.set('limit', '50');
      const body = await apiFetch(`/v1/events?${q.toString()}`);
      return itemsOf(body).map(mapEvent);
    },
    async get(id: string) {
      return hydrateEvent(id);
    },
    async create(input) {
      const tenantId = await ensureTenant();
      const created = mapEvent(
        await apiFetch('/v1/events', {
          method: 'POST',
          auth: true,
          body: JSON.stringify(eventPayload({ ...input, tenantId })),
        })
      );
      if (input.publish) {
        await apiFetch(`/v1/events/${created.id}/submit`, { method: 'POST', auth: true, body: JSON.stringify({}) });
      }
      try {
        await httpApi.auth.me();
      } catch {
        /* memberships refresh best-effort */
      }
      return hydrateEvent(created.id);
    },
    async patch(id, input) {
      await apiFetch(`/v1/events/${id}`, {
        method: 'PATCH',
        auth: true,
        body: JSON.stringify({
          title: input.name,
          description: input.description,
          starts_at: input.startsAt,
          genres: input.genre ? [input.genre] : undefined,
          pin:
            input.lat != null && input.lng != null
              ? { name: input.venueName || 'Pin', address_text: input.addressText || '', lat: input.lat, lng: input.lng }
              : undefined,
        }),
      });
      if (input.publish) {
        await apiFetch(`/v1/events/${id}/submit`, { method: 'POST', auth: true, body: JSON.stringify({}) });
      }
      return hydrateEvent(id);
    },
    async addLineup(eventId, artistId) {
      await apiFetch(`/v1/events/${eventId}/artists`, {
        method: 'POST',
        auth: true,
        body: JSON.stringify({ artist_id: artistId, billing_order: 0 }),
      });
      return hydrateEvent(eventId);
    },
    async removeLineup(eventId, artistId) {
      await apiFetch(`/v1/events/${eventId}/artists/${artistId}`, { method: 'DELETE', auth: true });
      return hydrateEvent(eventId);
    },
    async reorderLineup(eventId, _artistIds) {
      return hydrateEvent(eventId);
    },
    async putTracks(eventId, tracks) {
      await apiFetch(`/v1/events/${eventId}/tracks`, {
        method: 'PUT',
        auth: true,
        body: JSON.stringify({
          tracks: tracks.map((t, i) => ({ asset_id: t.url, title: t.title, position: i })),
        }),
      });
      return hydrateEvent(eventId);
    },
  },

  artists: {
    async get(id: string) {
      const artist = mapArtist(await apiFetch(`/v1/artists/${id}`));
      let upcoming: ParcheEvent[] = [];
      try {
        const ev = await apiFetch(`/v1/artists/${id}/events`);
        upcoming = itemsOf(ev).map(mapEvent);
      } catch {
        upcoming = [];
      }
      return { ...artist, upcoming };
    },
    async list() {
      try {
        return await this.following();
      } catch {
        return [];
      }
    },
    async mine() {
      try {
        const me = useAuthStore.getState().me;
        if (!me) return null;
        const list = await this.list();
        return list.find((artist) => artist.userId === me.id) ?? null;
      } catch {
        return null;
      }
    },
    async upsert(input) {
      const tenantId = await ensureTenant();
      if (input.id) {
        const raw = await apiFetch(`/v1/artists/${input.id}`, {
          method: 'PATCH',
          auth: true,
          body: JSON.stringify({ name: input.stageName, bio: input.bio }),
        });
        return mapArtist(raw);
      }
      const raw = await apiFetch('/v1/artists', {
        method: 'POST',
        auth: true,
        body: JSON.stringify({ name: input.stageName, bio: input.bio, tenant_id: input.guest ? tenantId : tenantId }),
      });
      return mapArtist(raw);
    },
    async follow(artistId) {
      await apiFetch(`/v1/artists/${artistId}/follow`, { method: 'POST', auth: true, body: JSON.stringify({}) });
      const ids = new Set(useAuthStore.getState().followingIds);
      ids.add(artistId);
      useAuthStore.getState().setFollowingIds([...ids]);
    },
    async unfollow(artistId) {
      await apiFetch(`/v1/artists/${artistId}/follow`, { method: 'DELETE', auth: true });
      useAuthStore.getState().setFollowingIds(useAuthStore.getState().followingIds.filter((id) => id !== artistId));
    },
    async following() {
      const body = await apiFetch('/v1/me/following', { auth: true });
      const list = itemsOf(body).map(mapArtist);
      useAuthStore.getState().setFollowingIds(list.map((a) => a.id));
      return list;
    },
    isFollowing(artistId) {
      return useAuthStore.getState().followingIds.includes(artistId);
    },
  },

  members: {
    async list(eventId) {
      const body = await apiFetch(`/v1/events/${eventId}/members`, { auth: true });
      return itemsOf(body).map((row) => mapMembership(row, eventId));
    },
    async invite(eventId, email, role) {
      const created = asRecord(
        await apiFetch(`/v1/events/${eventId}/members`, {
          method: 'POST',
          auth: true,
          body: JSON.stringify({ email: email.trim().toLowerCase(), role }),
        })
      );
      return {
        id: str(created.id),
        eventId,
        email: email.trim().toLowerCase(),
        role,
        status: 'pending',
        inviteToken: undefined,
      } satisfies Membership;
    },
    async revoke(eventId, membershipId) {
      const userId = membershipId.startsWith(`${eventId}:`) ? membershipId.slice(eventId.length + 1) : membershipId;
      await apiFetch(`/v1/events/${eventId}/members/${userId}`, { method: 'DELETE', auth: true });
    },
    async getInvite(_token) {
      return {
        event: {
          id: '',
          tenantId: '',
          ownerUserId: '',
          name: 'Invitación al equipo',
          startsAt: new Date().toISOString(),
          venueName: '',
          addressText: '',
          description: '',
          status: 'draft',
          genre: 'techno',
          updatedAt: new Date().toISOString(),
        },
        membership: {
          id: 'invite',
          eventId: '',
          email: '',
          role: 'door',
          status: 'pending',
        },
      };
    },
    async acceptInvite(token) {
      await apiFetch(`/v1/invites/${token}/accept`, { method: 'POST', auth: true, body: JSON.stringify({}) });
      const me = await httpApi.auth.me();
      return me.memberships[0] ?? { id: token, eventId: '', email: me.email, role: 'door', status: 'active' };
    },
  },

  tickets: {
    async listTypes(eventId) {
      const body = await apiFetch(`/v1/events/${eventId}/ticket-types`, { auth: true });
      return itemsOf(body).map(mapTicketType);
    },
    async upsertType(eventId, input) {
      const current = await this.listTypes(eventId);
      const next = input.id
        ? current.map((t) => (t.id === input.id ? { ...t, ...input } : t))
        : [...current, { ...input, id: '', eventId, sold: 0, reserved: 0 }];
      const body = await apiFetch(`/v1/events/${eventId}/ticket-types`, {
        method: 'PUT',
        auth: true,
        body: JSON.stringify({
          items: next.map((t) => ({
            id: t.id || undefined,
            name: t.name,
            price_cents: t.priceCents,
            capacity: t.capacity,
            sales_starts_at: t.salesFrom,
            sales_ends_at: t.salesTo,
            status: 'on_sale',
          })),
        }),
      });
      const types = itemsOf(body).map(mapTicketType);
      return types[types.length - 1];
    },
    async createOrder(eventId, ticketTypeId, quantity) {
      const created = asRecord(
        await apiFetch(`/v1/events/${eventId}/orders`, {
          method: 'POST',
          auth: true,
          idempotencyKey: createId('idem').slice(0, 32).padEnd(8, 'x'),
          body: JSON.stringify({ items: [{ ticket_type_id: ticketTypeId, quantity }] }),
        })
      );
      return {
        id: str(created.order_id) || str(created.id),
        eventId,
        userId: useAuthStore.getState().me?.id ?? '',
        ticketTypeId,
        quantity,
        status: (str(created.status) || 'pending') as Order['status'],
        totalCents: 0,
        createdAt: new Date().toISOString(),
      };
    },
    async getOrder(id) {
      return mapOrder(await apiFetch(`/v1/orders/${id}`, { auth: true }));
    },
    async settleOrder(id, result) {
      await apiFetch('/v1/dev/payments/simulate', {
        method: 'POST',
        auth: true,
        body: JSON.stringify({ order_id: id, status: result === 'paid' ? 'success' : 'failed' }),
      });
      for (let i = 0; i < 8; i += 1) {
        const order = await this.getOrder(id);
        if (order.status !== 'pending') {
          return order;
        }
        await new Promise((r) => setTimeout(r, 300 * (i + 1)));
      }
      return this.getOrder(id);
    },
    async mine() {
      await hydratePrintSeen();
      const body = await apiFetch('/v1/me/tickets', { auth: true });
      return setWalletTickets(itemsOf(body).map(mapWalletTicket));
    },
    async getTicket(id) {
      const all = getWalletTickets().length ? getWalletTickets() : await this.mine();
      const ticket = all.find((t) => t.id === id);
      if (!ticket) {
        throw new ApiError('NOT_FOUND', 'No encontramos ese tiquete');
      }
      return ticket;
    },
    async markPrintSeen(ticketIds) {
      rememberPrintSeen(ticketIds);
      await persistPrintSeen(ticketIds);
    },
    async lookupUser(query) {
      const q = query.trim().toLowerCase();
      if (q.includes('@')) {
        return {
          id: q,
          email: q,
          displayName: q,
          profiles: ['attendee'] as ProfileKind[],
          platformAdmin: false,
        };
      }
      try {
        const raw = asRecord(await apiFetch(`/v1/users/${query.trim()}`, { auth: true }));
        return {
          id: str(raw.id),
          email: q,
          displayName: str(raw.display_name),
          phone: str(raw.phone) || undefined,
          profiles: ['attendee'],
          platformAdmin: false,
        };
      } catch {
        return null;
      }
    },
    async transfer(ticketId, toUserId) {
      await apiFetch(`/v1/tickets/${ticketId}/transfer`, {
        method: 'POST',
        auth: true,
        body: JSON.stringify(toUserId.includes('@') ? { to_email: toUserId } : { to_user_id: toUserId }),
      });
      const ticket = await this.getTicket(ticketId).catch(() => null);
      return (
        ticket ?? {
          id: ticketId,
          orderId: '',
          eventId: '',
          ticketTypeId: '',
          userId: useAuthStore.getState().me?.id ?? '',
          status: 'transferred',
          token: '',
          tokenJti: '',
          tokenExpiresAt: 0,
          printSeenByUserIds: [],
        }
      );
    },
  },

  door: {
    async checkIn(eventId, token) {
      try {
        const raw = asRecord(
          await apiFetch(`/v1/events/${eventId}/check-in`, {
            method: 'POST',
            auth: true,
            body: JSON.stringify({ qr_token: token }),
          })
        );
        const code = (str(raw.result) || 'invalid') as CheckInCode;
        let occupancy = 0;
        try {
          const live = asRecord(await apiFetch(`/v1/events/${eventId}/door/live`, { auth: true }));
          occupancy = num(live.inside) || num(live.used);
        } catch {
          occupancy = 0;
        }
        return { code, occupancy };
      } catch (err) {
        if (err instanceof ApiError && err.code === 'FORBIDDEN') {
          return { code: 'forbidden' as CheckInCode, occupancy: 0 };
        }
        throw err;
      }
    },
    occupancy(_eventId: string) {
      return 0;
    },
    async live(eventId) {
      const raw = asRecord(await apiFetch(`/v1/events/${eventId}/door/live`, { auth: true }));
      const recent = Array.isArray(raw.recent) ? raw.recent : [];
      return {
        checkIns: num(raw.inside) || num(raw.used),
        sold: num(raw.sold),
        recent: recent.map((row, i) => {
          const s = asRecord(row);
          return {
            id: `${str(s.ts)}-${i}`,
            eventId,
            result: (str(s.result) || 'invalid') as CheckInCode,
            scannerUserId: str(s.scanner_user_id),
            at: str(s.ts),
          };
        }),
      };
    },
    async metrics(eventId) {
      const raw = asRecord(await apiFetch(`/v1/events/${eventId}/metrics`, { auth: true }));
      const byType = Array.isArray(raw.by_type) ? raw.by_type : [];
      const split = asRecord(raw.sold_valid_used);
      const sold = num(split.valid) + num(split.used) || byType.reduce((sum, row) => sum + num(asRecord(row).sold), 0);
      const checkIns = num(raw.checkins);
      const scanners = Array.isArray(raw.by_scanner) ? raw.by_scanner : [];
      return {
        byType: byType.map((row) => {
          const t = asRecord(row);
          return {
            name: str(t.name),
            sold: num(t.sold),
            reserved: num(t.reserved),
            available: Math.max(0, num(t.capacity) - num(t.sold) - num(t.reserved)),
            revenueCents: num(t.gross_cents),
          };
        }),
        checkIns,
        sold,
        noShow: Math.max(0, sold - checkIns),
        scansByScanner: scanners.map((row) => {
          const s = asRecord(row);
          return { userId: str(s.user_id) || str(s.scanner_user_id), displayName: str(s.display_name) || 'Scanner', count: num(s.count) };
        }),
      };
    },
  },

  admin: {
    async queue() {
      const body = await apiFetch('/v1/admin/events?status=pending_review', { auth: true });
      return itemsOf(body).map(mapEvent);
    },
    async decide(eventId, decision, reason) {
      if (decision === 'approve') {
        await apiFetch(`/v1/admin/events/${eventId}/approve`, { method: 'POST', auth: true, body: JSON.stringify({}) });
        return;
      }
      await apiFetch(`/v1/admin/events/${eventId}/reject`, {
        method: 'POST',
        auth: true,
        body: JSON.stringify({ reason: reason || 'No encaja' }),
      });
    },
  },

  media: {
    async upload(kind, mime, sizeBytes, eventId) {
      const payload = await defaultBytes(kind);
      const contentType = mime || payload.mime;
      const bytes = payload.bytes;
      const body = await apiFetch('/v1/uploads', {
        method: 'POST',
        auth: true,
        body: JSON.stringify({
          kind,
          content_type: contentType,
          byte_size: bytes.byteLength || sizeBytes || bytes.length,
          event_id: kind === 'avatar' ? undefined : eventId,
        }),
      });
      const rec = asRecord(body);
      const upload = asRecord(rec.upload);
      const headers = asRecord(upload.headers) as Record<string, string>;
      await putBytes(
        str(upload.url),
        contentType,
        bytes as unknown as BodyInit,
        Object.fromEntries(Object.entries(headers).map(([k, v]) => [k, String(v)]))
      );
      let url = str(rec.key);
      if (kind === 'flyer' && eventId) {
        const confirmed = asRecord(
          await apiFetch(`/v1/events/${eventId}/assets`, {
            method: 'POST',
            auth: true,
            body: JSON.stringify({ key: rec.key, kind: 'flyer' }),
          })
        );
        url = mediaUrl(confirmed.public_url) ?? str(rec.key);
      } else if (kind === 'avatar') {
        const confirmed = asRecord(
          await apiFetch('/v1/me/avatar', {
            method: 'POST',
            auth: true,
            body: JSON.stringify({ key: rec.key, kind: 'avatar' }),
          })
        );
        url = mediaUrl(confirmed.public_url) ?? str(rec.key);
      } else if (kind === 'audio' && eventId) {
        const confirmed = asRecord(
          await apiFetch(`/v1/events/${eventId}/audio`, {
            method: 'POST',
            auth: true,
            body: JSON.stringify({ key: rec.key, kind: 'audio' }),
          })
        );
        url = str(confirmed.id) || str(rec.key);
      }
      const sessionUser = useAuthStore.getState().me?.id ?? '';
      return {
        id: str(rec.key),
        kind,
        mime: contentType,
        url,
        ownerUserId: sessionUser,
        eventId,
        confirmed: true,
      } satisfies Upload;
    },
  },

  feed: {
    async recommendations() {
      try {
        const body = await apiFetch('/v1/me/recommendations', { auth: true });
        const rec = asRecord(body);
        const events = Array.isArray(rec.events) ? rec.events : itemsOf(body);
        return events.map(mapEvent);
      } catch {
        return [];
      }
    },
  },

  device: {
    getPermissions() {
      return useAuthStore.getState().permissions;
    },
    async setPermission(kind: 'location' | 'camera', value: DevicePermission) {
      useAuthStore.getState().setPermission(kind, value);
    },
    bogota() {
      return BOGOTA;
    },
  },

  helpers: {
    can,
    typeOnSale,
    available,
    pendingPrintTickets,
  },
};

