import type { EventWithExtras } from '@/data/types';

export type ListingGap = 'flyer' | 'pin' | 'tickets' | 'lineup';

export function listingGaps(event?: Pick<EventWithExtras, 'flyerUrl' | 'lat' | 'lng' | 'ticketTypes' | 'lineup'>): ListingGap[] {
  if (!event) return ['flyer', 'pin', 'tickets', 'lineup'];
  const gaps: ListingGap[] = [];
  if (!event.flyerUrl) gaps.push('flyer');
  if (event.lat == null || event.lng == null) gaps.push('pin');
  if (event.ticketTypes.length === 0) gaps.push('tickets');
  if (event.lineup.length === 0) gaps.push('lineup');
  return gaps;
}

export function isDraftListingIncomplete(event?: EventWithExtras): boolean {
  if (!event) return true;
  if (event.status !== 'draft' && event.status !== 'in_review') return false;
  return listingGaps(event).length > 0;
}
