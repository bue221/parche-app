export type ProfileKind = 'attendee' | 'promoter' | 'artist';
export type MembershipRole = 'owner' | 'manager' | 'door' | 'metrics';
export type MembershipStatus = 'pending' | 'active' | 'revoked';
export type EventStatus = 'draft' | 'in_review' | 'published' | 'rejected';
export type TicketStatus = 'reserved' | 'valid' | 'used' | 'transferred' | 'cancelled';
export type OrderStatus = 'pending' | 'paid' | 'failed' | 'expired';
export type CheckInCode = 'approved' | 'duplicate' | 'invalid' | 'wrong_event' | 'expired' | 'forbidden';
export type MediaKind = 'flyer' | 'gallery' | 'avatar' | 'audio';
export type DevicePermission = 'undetermined' | 'granted' | 'denied';

export type User = {
  id: string;
  email: string;
  password: string;
  displayName: string;
  avatarUrl?: string;
  profiles: ProfileKind[];
  platformAdmin: boolean;
};

export type Session = {
  userId: string;
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: number;
  refreshFamilyId: string;
  usedRefreshTokens: string[];
};

export type Artist = {
  id: string;
  userId?: string;
  stageName: string;
  bio: string;
  avatarUrl?: string;
};

export type ParcheEvent = {
  id: string;
  tenantId: string;
  ownerUserId: string;
  name: string;
  startsAt: string;
  venueName: string;
  addressText: string;
  description: string;
  flyerUrl?: string;
  lat?: number;
  lng?: number;
  status: EventStatus;
  genre: string;
  rejectReason?: string;
  updatedAt: string;
};

export type LineupSlot = {
  eventId: string;
  artistId: string;
  sortOrder: number;
};

export type EventTrack = {
  id: string;
  eventId: string;
  title: string;
  url: string;
  sortOrder: number;
};

export type Membership = {
  id: string;
  eventId: string;
  userId?: string;
  email: string;
  role: MembershipRole;
  status: MembershipStatus;
  inviteToken?: string;
};

export type TicketType = {
  id: string;
  eventId: string;
  name: string;
  priceCents: number;
  currency: string;
  capacity: number;
  sold: number;
  reserved: number;
  salesFrom: string;
  salesTo: string;
};

export type Order = {
  id: string;
  eventId: string;
  userId: string;
  ticketTypeId: string;
  quantity: number;
  status: OrderStatus;
  totalCents: number;
  createdAt: string;
};

export type Ticket = {
  id: string;
  orderId: string;
  eventId: string;
  ticketTypeId: string;
  userId: string;
  status: TicketStatus;
  token: string;
  tokenJti: string;
  tokenExpiresAt: number;
  printSeenByUserIds: string[];
};

export type Follow = {
  userId: string;
  artistId: string;
};

export type EditorialPost = {
  id: string;
  title: string;
  body: string;
  flyerUrl?: string;
  publishedAt: string;
};

export type ScanLog = {
  id: string;
  eventId: string;
  ticketId?: string;
  result: CheckInCode;
  scannerUserId: string;
  at: string;
};

export type Upload = {
  id: string;
  kind: MediaKind;
  mime: string;
  url: string;
  ownerUserId: string;
  eventId?: string;
  confirmed: boolean;
};

export type EventFilters = {
  from?: string;
  to?: string;
  genre?: string;
  artistId?: string;
  q?: string;
  minLat?: number;
  minLng?: number;
  maxLat?: number;
  maxLng?: number;
};

export type DevicePermissions = {
  location: DevicePermission;
  camera: DevicePermission;
};

export type MockSnapshot = {
  users: User[];
  artists: Artist[];
  events: ParcheEvent[];
  lineup: LineupSlot[];
  tracks: EventTrack[];
  memberships: Membership[];
  ticketTypes: TicketType[];
  orders: Order[];
  tickets: Ticket[];
  follows: Follow[];
  posts: EditorialPost[];
  scans: ScanLog[];
  uploads: Upload[];
  permissions: DevicePermissions;
};
