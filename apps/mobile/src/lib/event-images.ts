import type { EventGalleryImage } from '@/data/types';

/** Extra photos besides the flyer. The API does not cap this; the form stays scannable. */
export const MAX_EVENT_GALLERY = 8;

export function eventDetailImages(event: {
  flyerUrl?: string;
  gallery?: EventGalleryImage[];
}): EventGalleryImage[] {
  const images: EventGalleryImage[] = [];
  const seen = new Set<string>();
  if (event.flyerUrl) {
    images.push({ id: 'flyer', url: event.flyerUrl });
    seen.add(event.flyerUrl);
  }
  for (const image of event.gallery ?? []) {
    if (!image.url || seen.has(image.url)) continue;
    seen.add(image.url);
    images.push(image);
  }
  return images;
}
