import { ApiError } from '@/data/errors';
import { createId } from '@/data/ids';
import { debugLog } from '@/data/log';
import { wait } from '@/data/mock/delay';
import { compactTicketCode } from '@/lib/code128';
import { DEMO_PASSWORD } from '@/data/mock/seed';
import { getSession, getSnapshot, useMockStore } from '@/data/mock/store';
import {
  issueAccessToken,
  issueRefreshToken,
  issueTicketToken,
  parseTicketToken,
} from '@/data/tokens';
import type {
  Artist,
  CheckInCode,
  DevicePermission,
  EventFilters,
  EventTrack,
  Follow,
  MediaKind,
  Membership,
  MembershipRole,
  Order,
  ParcheEvent,
  ProfileKind,
  ScanLog,
  Session,
  Ticket,
  TicketType,
  Upload,
  User,
} from '@/data/types';

const ACCESS_TTL_MS = 12 * 60 * 1000;
const TICKET_TTL_MS = 12 * 60 * 60 * 1000;
const BOGOTA = { lat: 4.711, lng: -74.072 };

export type Me = Omit<User, 'password'> & {
  memberships: Membership[];
};

export type EventWithExtras = ParcheEvent & {
  lineup: Artist[];
  tracks: EventTrack[];
  ticketTypes: TicketType[];
};

function requireSession(): Session {
  const session = getSession();
  if (!session || session.accessExpiresAt < Date.now()) {
    throw new ApiError('UNAUTHORIZED', 'Sesión vencida');
  }
  return session;
}

function optionalSession(): Session | null {
  const session = getSession();
  if (!session || session.accessExpiresAt < Date.now()) {
    return null;
  }
  return session;
}

function publicUser(user: User): Omit<User, 'password'> {
  const { password: _password, ...rest } = user;
  return rest;
}

function eventVisible(event: ParcheEvent, userId?: string): boolean {
  if (event.status === 'published') {
    return true;
  }
  if (!userId) {
    return false;
  }
  return getSnapshot().memberships.some(
    (m) => m.eventId === event.id && m.userId === userId && m.status === 'active'
  );
}

function membershipFor(userId: string, eventId: string): Membership | undefined {
  return getSnapshot().memberships.find(
    (m) => m.eventId === eventId && m.userId === userId && m.status === 'active'
  );
}

function can(userId: string, eventId: string, permission: string): boolean {
  const user = getSnapshot().users.find((u) => u.id === userId);
  const mem = membershipFor(userId, eventId);
  const role = mem?.role;
  switch (permission) {
    case 'event.write':
      return role === 'owner' || role === 'manager';
    case 'event.tickets.manage':
      return role === 'owner' || role === 'manager';
    case 'event.members.manage':
      return role === 'owner' || role === 'manager';
    case 'event.door.scan':
    case 'event.door.live':
      return role === 'owner' || role === 'manager' || role === 'door';
    case 'event.metrics.read':
      return role === 'owner' || role === 'manager' || role === 'metrics';
    case 'platform_admin':
      return Boolean(user?.platformAdmin);
    default:
      return false;
  }
}

function requirePerm(userId: string, eventId: string, permission: string) {
  if (!can(userId, eventId, permission)) {
    throw new ApiError('FORBIDDEN', 'No puedes hacer eso en este evento');
  }
}

function rotateSession(userId: string, familyId = createId('fam')): Session {
  const session: Session = {
    userId,
    accessToken: issueAccessToken(userId),
    refreshToken: issueRefreshToken(familyId),
    accessExpiresAt: Date.now() + ACCESS_TTL_MS,
    refreshFamilyId: familyId,
    usedRefreshTokens: [],
  };
  useMockStore.getState().setSession(session);
  return session;
}

function available(type: TicketType): number {
  return Math.max(0, type.capacity - type.sold - type.reserved);
}

function typeOnSale(type: TicketType): boolean {
  const now = Date.now();
  return now >= Date.parse(type.salesFrom) && now <= Date.parse(type.salesTo) && available(type) > 0;
}

function matchesFilters(event: ParcheEvent, filters?: EventFilters): boolean {
  if (!filters) {
    return true;
  }
  if (filters.from && Date.parse(event.startsAt) < Date.parse(filters.from)) {
    return false;
  }
  if (filters.to && Date.parse(event.startsAt) > Date.parse(filters.to)) {
    return false;
  }
  if (filters.genre && event.genre !== filters.genre) {
    return false;
  }
  if (filters.q) {
    const q = filters.q.toLowerCase();
    const hay = `${event.name} ${event.venueName} ${event.description}`.toLowerCase();
    if (!hay.includes(q)) {
      return false;
    }
  }
  if (filters.artistId) {
    const has = getSnapshot().lineup.some((l) => l.eventId === event.id && l.artistId === filters.artistId);
    if (!has) {
      return false;
    }
  }
  if (
    filters.minLat != null &&
    filters.minLng != null &&
    filters.maxLat != null &&
    filters.maxLng != null
  ) {
    if (event.lat == null || event.lng == null) {
      return false;
    }
    if (event.lat < filters.minLat || event.lat > filters.maxLat) {
      return false;
    }
    if (event.lng < filters.minLng || event.lng > filters.maxLng) {
      return false;
    }
  }
  return true;
}

function hydrateEvent(event: ParcheEvent): EventWithExtras {
  const data = getSnapshot();
  const lineup = data.lineup
    .filter((l) => l.eventId === event.id)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((l) => data.artists.find((a) => a.id === l.artistId))
    .filter((a): a is Artist => Boolean(a));
  return {
    ...event,
    lineup,
    tracks: data.tracks.filter((t) => t.eventId === event.id).sort((a, b) => a.sortOrder - b.sortOrder),
    ticketTypes: data.ticketTypes.filter((t) => t.eventId === event.id),
  };
}

function mintTicketToken(ticketId: string, eventId: string): { token: string; jti: string; exp: number } {
  const jti = createId('jti');
  const exp = Date.now() + TICKET_TTL_MS;
  return { token: issueTicketToken({ ticketId, eventId, jti, exp }), jti, exp };
}

export const mockApi = {
  auth: {
    async register(input: {
      email: string;
      password: string;
      displayName: string;
      phone?: string;
      initialProfile: 'attendee' | 'promoter';
    }): Promise<Me> {
      await wait();
      const email = input.email.trim().toLowerCase();
      if (!email || !input.password || !input.displayName.trim()) {
        throw new ApiError('VALIDATION_ERROR', 'Revisa los campos', {
          email: !email ? 'Email requerido' : '',
          password: !input.password ? 'Contraseña requerida' : '',
          displayName: !input.displayName.trim() ? 'Nombre requerido' : '',
        });
      }
      if (getSnapshot().users.some((u) => u.email === email)) {
        throw new ApiError('VALIDATION_ERROR', 'No pudimos crear la cuenta');
      }
      const user: User = {
        id: createId('user'),
        email,
        password: input.password,
        displayName: input.displayName.trim(),
        phone: input.phone?.trim() || undefined,
        profiles: [input.initialProfile, 'attendee'].filter(
          (v, i, arr) => arr.indexOf(v) === i
        ) as ProfileKind[],
        platformAdmin: false,
      };
      useMockStore.getState().setData((d) => {
        d.users.push(user);
      });
      rotateSession(user.id);
      debugLog('auth', 'register ok', { userId: user.id });
      return this.me();
    },

    async login(email: string, password: string): Promise<Me> {
      await wait();
      const user = getSnapshot().users.find((u) => u.email === email.trim().toLowerCase());
      if (!user || user.password !== password) {
        throw new ApiError('UNAUTHORIZED', 'No pudimos entrar');
      }
      rotateSession(user.id);
      debugLog('auth', 'login ok', { userId: user.id });
      return this.me();
    },

    async refresh(): Promise<Session> {
      await wait(80);
      const session = getSession();
      if (!session) {
        throw new ApiError('UNAUTHORIZED', 'Sesión vencida');
      }
      if (session.usedRefreshTokens.includes(session.refreshToken)) {
        useMockStore.getState().setSession(null);
        throw new ApiError('UNAUTHORIZED', 'Sesión revocada. Vuelve a entrar.');
      }
      const used = [...session.usedRefreshTokens, session.refreshToken];
      const next = rotateSession(session.userId, session.refreshFamilyId);
      useMockStore.getState().setSession({ ...next, usedRefreshTokens: used });
      return getSession() as Session;
    },

    async logout(): Promise<void> {
      await wait(80);
      useMockStore.getState().setSession(null);
      debugLog('auth', 'logout');
    },

    async me(): Promise<Me> {
      await wait(60);
      const session = requireSession();
      const user = getSnapshot().users.find((u) => u.id === session.userId);
      if (!user) {
        throw new ApiError('UNAUTHORIZED', 'Sesión vencida');
      }
      return {
        ...publicUser(user),
        memberships: getSnapshot().memberships.filter((m) => m.userId === user.id && m.status === 'active'),
      };
    },

    async updateMe(patch: { displayName?: string; avatarUrl?: string; phone?: string }): Promise<Me> {
      const session = requireSession();
      useMockStore.getState().setData((d) => {
        const user = d.users.find((u) => u.id === session.userId);
        if (!user) {
          return;
        }
        if (patch.displayName) {
          user.displayName = patch.displayName;
        }
        if (patch.phone !== undefined) {
          user.phone = patch.phone;
        }
        if (patch.avatarUrl !== undefined) {
          user.avatarUrl = patch.avatarUrl;
        }
      });
      return this.me();
    },

    async memberships(): Promise<Membership[]> {
      const me = await this.me();
      return me.memberships;
    },

    async activateArtist(): Promise<Me> {
      await wait();
      const session = requireSession();
      useMockStore.getState().setData((d) => {
        const user = d.users.find((u) => u.id === session.userId);
        if (user && !user.profiles.includes('artist')) {
          user.profiles.push('artist');
        }
      });
      return this.me();
    },
  },

  events: {
    async list(filters?: EventFilters): Promise<ParcheEvent[]> {
      await wait();
      return getSnapshot()
        .events.filter((e) => e.status === 'published' && matchesFilters(e, filters))
        .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
    },

    async get(id: string): Promise<EventWithExtras> {
      await wait();
      const session = optionalSession();
      const event = getSnapshot().events.find((e) => e.id === id);
      if (!event) {
        throw new ApiError('NOT_FOUND', 'Esta fecha ya no está');
      }
      if (!eventVisible(event, session?.userId)) {
        throw new ApiError('GONE', 'Esta fecha ya no está');
      }
      return hydrateEvent(event);
    },

    async create(input: {
      name: string;
      startsAt: string;
      venueName: string;
      addressText: string;
      description: string;
      genre: string;
      lat?: number;
      lng?: number;
      flyerUrl?: string;
      publish?: boolean;
    }): Promise<EventWithExtras> {
      await wait();
      const session = requireSession();
      const user = getSnapshot().users.find((u) => u.id === session.userId);
      if (!user?.profiles.includes('promoter')) {
        throw new ApiError('FORBIDDEN', 'Solo organizadores pueden crear fechas');
      }
      if (!input.name.trim() || !input.startsAt) {
        throw new ApiError('VALIDATION_ERROR', 'Nombre y fecha son obligatorios');
      }
      if (input.publish && (input.lat == null || input.lng == null || !input.flyerUrl)) {
        throw new ApiError('VALIDATION_ERROR', 'Publicar pide pin y flyer');
      }
      const event: ParcheEvent = {
        id: createId('event'),
        tenantId: `tenant_${session.userId}`,
        ownerUserId: session.userId,
        name: input.name.trim(),
        startsAt: input.startsAt,
        venueName: input.venueName.trim(),
        addressText: input.addressText.trim(),
        description: input.description.trim(),
        flyerUrl: input.flyerUrl,
        lat: input.lat,
        lng: input.lng,
        status: input.publish ? 'in_review' : 'draft',
        genre: input.genre || 'techno',
        updatedAt: new Date().toISOString(),
      };
      useMockStore.getState().setData((d) => {
        d.events.push(event);
        d.memberships.push({
          id: createId('mem'),
          eventId: event.id,
          userId: session.userId,
          email: user.email,
          role: 'owner',
          status: 'active',
        });
      });
      debugLog('events', 'created', { eventId: event.id, status: event.status });
      return hydrateEvent(event);
    },

    async patch(
      id: string,
      input: Partial<Omit<ParcheEvent, 'id' | 'tenantId' | 'ownerUserId'>> & { publish?: boolean }
    ): Promise<EventWithExtras> {
      await wait();
      const session = requireSession();
      requirePerm(session.userId, id, 'event.write');
      let forbiddenPublish = false;
      useMockStore.getState().setData((d) => {
        const event = d.events.find((e) => e.id === id);
        if (!event) {
          return;
        }
        Object.assign(event, {
          ...input,
          updatedAt: new Date().toISOString(),
        });
        if (input.publish) {
          if (event.lat == null || event.lng == null || !event.flyerUrl) {
            forbiddenPublish = true;
            return;
          }
          event.status = 'in_review';
        }
      });
      if (forbiddenPublish) {
        throw new ApiError('VALIDATION_ERROR', 'Publicar pide pin y flyer');
      }
      return this.get(id);
    },

    async addLineup(eventId: string, artistId: string): Promise<EventWithExtras> {
      const session = requireSession();
      requirePerm(session.userId, eventId, 'event.write');
      const exists = getSnapshot().lineup.some((l) => l.eventId === eventId && l.artistId === artistId);
      if (exists) {
        throw new ApiError('CONFLICT', 'Ese artista ya está en el lineup');
      }
      useMockStore.getState().setData((d) => {
        const max = d.lineup.filter((l) => l.eventId === eventId).reduce((m, l) => Math.max(m, l.sortOrder), -1);
        d.lineup.push({ eventId, artistId, sortOrder: max + 1 });
      });
      return this.get(eventId);
    },

    async removeLineup(eventId: string, artistId: string): Promise<EventWithExtras> {
      const session = requireSession();
      requirePerm(session.userId, eventId, 'event.write');
      useMockStore.getState().setData((d) => {
        d.lineup = d.lineup.filter((l) => !(l.eventId === eventId && l.artistId === artistId));
      });
      return this.get(eventId);
    },

    async reorderLineup(eventId: string, artistIds: string[]): Promise<EventWithExtras> {
      const session = requireSession();
      requirePerm(session.userId, eventId, 'event.write');
      useMockStore.getState().setData((d) => {
        d.lineup = d.lineup.filter((l) => l.eventId !== eventId);
        artistIds.forEach((artistId, sortOrder) => {
          d.lineup.push({ eventId, artistId, sortOrder });
        });
      });
      return this.get(eventId);
    },

    async putTracks(eventId: string, tracks: { title: string; url: string }[]): Promise<EventWithExtras> {
      const session = requireSession();
      requirePerm(session.userId, eventId, 'event.write');
      useMockStore.getState().setData((d) => {
        d.tracks = d.tracks.filter((t) => t.eventId !== eventId);
        tracks.forEach((t, sortOrder) => {
          d.tracks.push({
            id: createId('track'),
            eventId,
            title: t.title,
            url: t.url,
            sortOrder,
          });
        });
      });
      return this.get(eventId);
    },
  },

  artists: {
    async get(id: string): Promise<Artist & { upcoming: ParcheEvent[] }> {
      await wait();
      const artist = getSnapshot().artists.find((a) => a.id === id);
      if (!artist) {
        throw new ApiError('NOT_FOUND', 'No encontramos a este artista');
      }
      const eventIds = getSnapshot()
        .lineup.filter((l) => l.artistId === id)
        .map((l) => l.eventId);
      const upcoming = getSnapshot().events.filter(
        (e) => eventIds.includes(e.id) && e.status === 'published'
      );
      return { ...artist, upcoming };
    },

    async list(): Promise<Artist[]> {
      await wait(40);
      return getSnapshot().artists;
    },

    async mine(): Promise<Artist | null> {
      await wait(40);
      const session = optionalSession();
      if (!session) return null;
      return getSnapshot().artists.find((artist) => artist.userId === session.userId) ?? null;
    },

    async upsert(input: { id?: string; stageName: string; bio: string; avatarUrl?: string; guest?: boolean }): Promise<Artist> {
      await wait();
      const session = requireSession();
      const user = getSnapshot().users.find((u) => u.id === session.userId);
      if (input.id) {
        const existing = getSnapshot().artists.find((a) => a.id === input.id);
        if (!existing) {
          throw new ApiError('NOT_FOUND', 'No encontramos a este artista');
        }
        if (existing.userId && existing.userId !== session.userId) {
          throw new ApiError('FORBIDDEN', 'No puedes editar esta ficha');
        }
        if (!existing.userId && !user?.profiles.includes('promoter')) {
          throw new ApiError('FORBIDDEN', 'No puedes editar esta ficha');
        }
        useMockStore.getState().setData((d) => {
          const artist = d.artists.find((a) => a.id === input.id);
          if (!artist) {
            return;
          }
          artist.stageName = input.stageName;
          artist.bio = input.bio;
          artist.avatarUrl = input.avatarUrl;
        });
        return getSnapshot().artists.find((a) => a.id === input.id) as Artist;
      }
      const artist: Artist = {
        id: createId('artist'),
        userId: input.guest ? undefined : session.userId,
        stageName: input.stageName.trim(),
        bio: input.bio,
        avatarUrl: input.avatarUrl,
      };
      useMockStore.getState().setData((d) => {
        d.artists.push(artist);
        const owner = d.users.find((u) => u.id === session.userId);
        if (owner && !input.guest && !owner.profiles.includes('artist')) {
          owner.profiles.push('artist');
        }
      });
      return artist;
    },

    async follow(artistId: string): Promise<void> {
      await wait();
      const session = requireSession();
      useMockStore.getState().setData((d) => {
        if (!d.follows.some((f) => f.userId === session.userId && f.artistId === artistId)) {
          d.follows.push({ userId: session.userId, artistId });
        }
      });
    },

    async unfollow(artistId: string): Promise<void> {
      await wait();
      const session = requireSession();
      useMockStore.getState().setData((d) => {
        d.follows = d.follows.filter((f) => !(f.userId === session.userId && f.artistId === artistId));
      });
    },

    async following(): Promise<Artist[]> {
      const session = requireSession();
      const ids = getSnapshot()
        .follows.filter((f) => f.userId === session.userId)
        .map((f) => f.artistId);
      return getSnapshot().artists.filter((a) => ids.includes(a.id));
    },

    isFollowing(artistId: string): boolean {
      const session = getSession();
      if (!session) {
        return false;
      }
      return getSnapshot().follows.some((f) => f.userId === session.userId && f.artistId === artistId);
    },
  },

  members: {
    async list(eventId: string): Promise<Membership[]> {
      const session = requireSession();
      requirePerm(session.userId, eventId, 'event.members.manage');
      return getSnapshot().memberships.filter((m) => m.eventId === eventId);
    },

    async invite(eventId: string, email: string, role: Exclude<MembershipRole, 'owner'>): Promise<Membership> {
      const session = requireSession();
      requirePerm(session.userId, eventId, 'event.members.manage');
      const token = createId('invite');
      const user = getSnapshot().users.find((u) => u.email === email.trim().toLowerCase());
      const membership: Membership = {
        id: createId('mem'),
        eventId,
        userId: undefined,
        email: email.trim().toLowerCase(),
        role,
        status: 'pending',
        inviteToken: token,
      };
      useMockStore.getState().setData((d) => {
        d.memberships.push(membership);
      });
      debugLog('members', 'invite created', { eventId, role, knownUser: Boolean(user) });
      return membership;
    },

    async revoke(eventId: string, membershipId: string): Promise<void> {
      const session = requireSession();
      requirePerm(session.userId, eventId, 'event.members.manage');
      useMockStore.getState().setData((d) => {
        const mem = d.memberships.find((m) => m.id === membershipId && m.eventId === eventId);
        if (mem && mem.role !== 'owner') {
          mem.status = 'revoked';
        }
      });
    },

    async getInvite(token: string): Promise<{ event: ParcheEvent; membership: Membership }> {
      await wait();
      const membership = getSnapshot().memberships.find((m) => m.inviteToken === token);
      if (!membership || membership.status === 'revoked') {
        throw new ApiError('GONE', 'Esta invitación ya no vale');
      }
      const event = getSnapshot().events.find((e) => e.id === membership.eventId);
      if (!event) {
        throw new ApiError('GONE', 'Esta invitación ya no vale');
      }
      return { event, membership };
    },

    async acceptInvite(token: string): Promise<Membership> {
      const session = requireSession();
      const user = getSnapshot().users.find((u) => u.id === session.userId);
      const found = getSnapshot().memberships.find((m) => m.inviteToken === token);
      if (!found || found.status === 'revoked') {
        throw new ApiError('GONE', 'Esta invitación ya no vale');
      }
      if (found.status === 'active' && found.userId === session.userId) {
        return found;
      }
      useMockStore.getState().setData((d) => {
        const mem = d.memberships.find((m) => m.inviteToken === token);
        if (!mem || !user) {
          return;
        }
        mem.status = 'active';
        mem.userId = session.userId;
        mem.email = user.email;
      });
      return getSnapshot().memberships.find((m) => m.inviteToken === token) as Membership;
    },
  },

  tickets: {
    async listTypes(eventId: string): Promise<TicketType[]> {
      await wait(40);
      return getSnapshot().ticketTypes.filter((t) => t.eventId === eventId);
    },

    async upsertType(
      eventId: string,
      input: Omit<TicketType, 'id' | 'eventId' | 'sold' | 'reserved'> & { id?: string }
    ): Promise<TicketType> {
      const session = requireSession();
      requirePerm(session.userId, eventId, 'event.tickets.manage');
      let savedId = input.id;
      useMockStore.getState().setData((d) => {
        if (input.id) {
          const type = d.ticketTypes.find((t) => t.id === input.id && t.eventId === eventId);
          if (type) {
            type.name = input.name;
            type.priceCents = input.priceCents;
            type.capacity = input.capacity;
            type.salesFrom = input.salesFrom;
            type.salesTo = input.salesTo;
            savedId = type.id;
          }
          return;
        }
        const type: TicketType = {
          id: createId('type'),
          eventId,
          name: input.name,
          priceCents: input.priceCents,
          currency: input.currency,
          capacity: input.capacity,
          sold: 0,
          reserved: 0,
          salesFrom: input.salesFrom,
          salesTo: input.salesTo,
        };
        d.ticketTypes.push(type);
        savedId = type.id;
      });
      return getSnapshot().ticketTypes.find((t) => t.id === savedId) as TicketType;
    },

    async createOrder(eventId: string, ticketTypeId: string, quantity: number): Promise<Order> {
      await wait();
      const session = requireSession();
      if (quantity < 1) {
        throw new ApiError('VALIDATION_ERROR', 'Elige una cantidad');
      }
      const type = getSnapshot().ticketTypes.find((t) => t.id === ticketTypeId && t.eventId === eventId);
      if (!type || !typeOnSale(type) || available(type) < quantity) {
        throw new ApiError('CONFLICT', 'Ese tipo ya no tiene cupo');
      }
      const order: Order = {
        id: createId('order'),
        eventId,
        userId: session.userId,
        ticketTypeId,
        quantity,
        status: 'pending',
        totalCents: type.priceCents * quantity,
        createdAt: new Date().toISOString(),
      };
      useMockStore.getState().setData((d) => {
        const t = d.ticketTypes.find((x) => x.id === ticketTypeId);
        if (t) {
          t.reserved += quantity;
        }
        d.orders.push(order);
        for (let i = 0; i < quantity; i += 1) {
          d.tickets.push({
            id: createId('ticket'),
            orderId: order.id,
            eventId,
            ticketTypeId,
            userId: session.userId,
            status: 'reserved',
            token: '',
            tokenJti: '',
            tokenExpiresAt: 0,
            printSeenByUserIds: [],
          });
        }
      });
      debugLog('orders', 'created pending', { orderId: order.id, eventId });
      return order;
    },

    async getOrder(id: string): Promise<Order & { tickets: Ticket[] }> {
      await wait(80);
      const session = requireSession();
      const order = getSnapshot().orders.find((o) => o.id === id);
      if (!order) {
        throw new ApiError('GONE', 'No encontramos esa orden');
      }
      if (order.userId !== session.userId) {
        throw new ApiError('FORBIDDEN', 'Esa orden no es tuya');
      }
      return {
        ...order,
        tickets: getSnapshot().tickets.filter((t) => t.orderId === id),
      };
    },

    async settleOrder(id: string, result: 'paid' | 'failed'): Promise<Order> {
      await wait(240);
      const session = requireSession();
      const order = getSnapshot().orders.find((o) => o.id === id);
      if (!order || order.userId !== session.userId) {
        throw new ApiError('NOT_FOUND', 'No encontramos esa orden');
      }
      useMockStore.getState().setData((d) => {
        const current = d.orders.find((o) => o.id === id);
        const type = d.ticketTypes.find((t) => t.id === current?.ticketTypeId);
        if (!current) {
          return;
        }
        current.status = result;
        const tickets = d.tickets.filter((t) => t.orderId === id);
        if (result === 'paid') {
          if (type) {
            type.reserved = Math.max(0, type.reserved - current.quantity);
            type.sold += current.quantity;
          }
          tickets.forEach((ticket) => {
            const minted = mintTicketToken(ticket.id, ticket.eventId);
            ticket.status = 'valid';
            ticket.token = minted.token;
            ticket.tokenJti = minted.jti;
            ticket.tokenExpiresAt = minted.exp;
          });
        } else {
          if (type) {
            type.reserved = Math.max(0, type.reserved - current.quantity);
          }
          tickets.forEach((ticket) => {
            ticket.status = 'cancelled';
          });
        }
      });
      return getSnapshot().orders.find((o) => o.id === id) as Order;
    },

    async mine(): Promise<Ticket[]> {
      await wait();
      const session = requireSession();
      return getSnapshot().tickets.filter((t) => t.userId === session.userId && t.status !== 'cancelled');
    },

    async getTicket(id: string): Promise<Ticket> {
      const session = requireSession();
      const ticket = getSnapshot().tickets.find((t) => t.id === id && t.userId === session.userId);
      if (!ticket) {
        throw new ApiError('NOT_FOUND', 'No encontramos ese tiquete');
      }
      return ticket;
    },

    async markPrintSeen(ticketIds: string[]): Promise<void> {
      const session = getSession();
      if (!session) {
        return;
      }
      useMockStore.getState().setData((d) => {
        d.tickets.forEach((t) => {
          if (ticketIds.includes(t.id) && !t.printSeenByUserIds.includes(session.userId)) {
            t.printSeenByUserIds.push(session.userId);
          }
        });
      });
    },

    async lookupUser(query: string): Promise<Omit<User, 'password'> | null> {
      await wait();
      requireSession();
      const q = query.trim().toLowerCase();
      const user = getSnapshot().users.find((u) => u.email === q || u.id === query.trim());
      return user ? publicUser(user) : null;
    },

    async transfer(ticketId: string, toUserId: string): Promise<Ticket> {
      await wait();
      const session = requireSession();
      const ticket = getSnapshot().tickets.find((t) => t.id === ticketId);
      if (!ticket || ticket.userId !== session.userId || ticket.status !== 'valid') {
        throw new ApiError('CONFLICT', 'Ese tiquete no se puede ceder');
      }
      if (toUserId === session.userId) {
        throw new ApiError('VALIDATION_ERROR', 'Elige otra cuenta');
      }
      const dest = getSnapshot().users.find((u) => u.id === toUserId);
      if (!dest) {
        throw new ApiError('NOT_FOUND', 'Esa cuenta no existe en Parche');
      }
      useMockStore.getState().setData((d) => {
        const current = d.tickets.find((t) => t.id === ticketId);
        if (!current) {
          return;
        }
        current.status = 'transferred';
        current.token = '';
        const minted = mintTicketToken(current.id, current.eventId);
        d.tickets.push({
          ...current,
          id: createId('ticket'),
          userId: toUserId,
          status: 'valid',
          token: minted.token,
          tokenJti: minted.jti,
          tokenExpiresAt: minted.exp,
          printSeenByUserIds: [],
        });
      });
      return getSnapshot().tickets.find((t) => t.id === ticketId) as Ticket;
    },
  },

  door: {
    async checkIn(eventId: string, token: string): Promise<{ code: CheckInCode; occupancy: number }> {
      await wait(120);
      const session = requireSession();
      if (!can(session.userId, eventId, 'event.door.scan')) {
        return { code: 'forbidden', occupancy: this.occupancy(eventId) };
      }
      const parsed = parseTicketToken(token);
      const compact = compactTicketCode(token);
      let code: CheckInCode = 'invalid';
      useMockStore.getState().setData((d) => {
        const ticket = parsed
          ? d.tickets.find((t) => t.id === parsed.ticketId && t.tokenJti === parsed.jti)
          : d.tickets.find((t) => compactTicketCode(t.tokenJti) === compact);
        if (!parsed && !ticket) {
          code = 'invalid';
          d.scans.push({
            id: createId('scan'),
            eventId,
            result: code,
            scannerUserId: session.userId,
            at: new Date().toISOString(),
          });
          return;
        }
        if (parsed && parsed.exp < Date.now()) {
          code = 'expired';
        } else if ((parsed && parsed.eventId !== eventId) || (ticket && ticket.eventId !== eventId)) {
          code = 'wrong_event';
        } else if (!ticket || ticket.status === 'cancelled') {
          code = 'invalid';
        } else if (ticket.status === 'used') {
          code = 'duplicate';
        } else if (ticket.status !== 'valid') {
          code = 'invalid';
        } else {
          ticket.status = 'used';
          ticket.token = '';
          code = 'approved';
        }
        d.scans.push({
          id: createId('scan'),
          eventId,
          ticketId: ticket?.id ?? parsed?.ticketId,
          result: code,
          scannerUserId: session.userId,
          at: new Date().toISOString(),
        });
      });
      debugLog('door', 'check-in', { eventId, code });
      return { code, occupancy: this.occupancy(eventId) };
    },

    occupancy(eventId: string): number {
      return getSnapshot().scans.filter((s) => s.eventId === eventId && s.result === 'approved').length;
    },

    async live(eventId: string): Promise<{ checkIns: number; sold: number; recent: ScanLog[] }> {
      await wait(60);
      const session = requireSession();
      if (!can(session.userId, eventId, 'event.door.live') && !can(session.userId, eventId, 'event.metrics.read')) {
        throw new ApiError('FORBIDDEN', 'No puedes ver el aforo');
      }
      const sold = getSnapshot()
        .ticketTypes.filter((t) => t.eventId === eventId)
        .reduce((sum, t) => sum + t.sold, 0);
      const recent = getSnapshot()
        .scans.filter((s) => s.eventId === eventId)
        .slice(-12)
        .reverse();
      return { checkIns: this.occupancy(eventId), sold, recent };
    },

    async metrics(eventId: string): Promise<{
      byType: { name: string; sold: number; reserved: number; available: number; revenueCents: number }[];
      checkIns: number;
      sold: number;
      noShow: number;
      scansByScanner: { userId: string; displayName: string; count: number }[];
    }> {
      await wait();
      const session = requireSession();
      requirePerm(session.userId, eventId, 'event.metrics.read');
      const types = getSnapshot().ticketTypes.filter((t) => t.eventId === eventId);
      const checkIns = this.occupancy(eventId);
      const sold = types.reduce((sum, t) => sum + t.sold, 0);
      const scans = getSnapshot().scans.filter((s) => s.eventId === eventId && s.result === 'approved');
      const byScanner = new Map<string, number>();
      scans.forEach((s) => byScanner.set(s.scannerUserId, (byScanner.get(s.scannerUserId) ?? 0) + 1));
      return {
        byType: types.map((t) => ({
          name: t.name,
          sold: t.sold,
          reserved: t.reserved,
          available: available(t),
          revenueCents: t.sold * t.priceCents,
        })),
        checkIns,
        sold,
        noShow: Math.max(0, sold - checkIns),
        scansByScanner: [...byScanner.entries()].map(([userId, count]) => ({
          userId,
          displayName: getSnapshot().users.find((u) => u.id === userId)?.displayName ?? userId,
          count,
        })),
      };
    },
  },

  admin: {
    async queue(): Promise<ParcheEvent[]> {
      await wait();
      const session = requireSession();
      const user = getSnapshot().users.find((u) => u.id === session.userId);
      if (!user?.platformAdmin) {
        throw new ApiError('FORBIDDEN', 'Solo admin de plataforma');
      }
      return getSnapshot().events.filter((e) => e.status === 'in_review');
    },

    async decide(eventId: string, decision: 'approve' | 'reject', reason?: string): Promise<void> {
      const session = requireSession();
      const user = getSnapshot().users.find((u) => u.id === session.userId);
      if (!user?.platformAdmin) {
        throw new ApiError('FORBIDDEN', 'Solo admin de plataforma');
      }
      useMockStore.getState().setData((d) => {
        const event = d.events.find((e) => e.id === eventId);
        if (!event) {
          return;
        }
        event.status = decision === 'approve' ? 'published' : 'rejected';
        event.rejectReason = decision === 'reject' ? reason : undefined;
      });
    },
  },

  media: {
    async upload(kind: MediaKind, mime: string, sizeBytes: number, eventId?: string): Promise<Upload> {
      await wait(200);
      const session = requireSession();
      const imageOk = ['image/jpeg', 'image/png', 'image/webp'].includes(mime);
      const audioOk = ['audio/mpeg', 'audio/ogg', 'audio/wav'].includes(mime);
      if (kind === 'audio' && (!audioOk || sizeBytes > 20 * 1024 * 1024)) {
        throw new ApiError('VALIDATION_ERROR', 'Audio no válido (mpeg/ogg/wav, máx 20 MB)');
      }
      if (kind !== 'audio' && (!imageOk || sizeBytes > 8 * 1024 * 1024)) {
        throw new ApiError('VALIDATION_ERROR', 'Imagen no válida (jpeg/png/webp, máx 8 MB)');
      }
      if (eventId) {
        requirePerm(session.userId, eventId, 'event.write');
      }
      const upload: Upload = {
        id: createId('up'),
        kind,
        mime,
        url: `https://picsum.photos/seed/${createId('media')}/800/1000`,
        ownerUserId: session.userId,
        eventId,
        confirmed: true,
      };
      useMockStore.getState().setData((d) => {
        d.uploads.push(upload);
        if (kind === 'flyer' && eventId) {
          const event = d.events.find((item) => item.id === eventId);
          if (event) {
            event.flyerUrl = upload.url;
            event.updatedAt = new Date().toISOString();
          }
        }
      });
      return upload;
    },
  },

  feed: {
    async recommendations(): Promise<ParcheEvent[]> {
      await wait();
      const session = optionalSession();
      if (!session) {
        return [];
      }
      const followed = getSnapshot()
        .follows.filter((f: Follow) => f.userId === session.userId)
        .map((f) => f.artistId);
      if (followed.length === 0) {
        return [];
      }
      const eventIds = getSnapshot()
        .lineup.filter((l) => followed.includes(l.artistId))
        .map((l) => l.eventId);
      return getSnapshot().events.filter((e) => e.status === 'published' && eventIds.includes(e.id));
    },
  },

  device: {
    getPermissions() {
      return getSnapshot().permissions;
    },
    async setPermission(kind: 'location' | 'camera', value: DevicePermission) {
      useMockStore.getState().setData((d) => {
        d.permissions[kind] = value;
      });
    },
    bogota() {
      return BOGOTA;
    },
  },

  helpers: {
    can,
    typeOnSale,
    available,
    pendingPrintTickets(userId: string): Ticket[] {
      return getSnapshot().tickets.filter(
        (t) => t.userId === userId && t.status === 'valid' && t.token && !t.printSeenByUserIds.includes(userId)
      );
    },
  },
};

export type ParcheApi = typeof mockApi;
