import type { MetadataRoute } from "next";

import { eventPath, listPublishedEvents } from "@/lib/events";
import { absoluteUrl } from "@/lib/site";

export const revalidate = 120;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const events = await listPublishedEvents();

  return [
    {
      url: absoluteUrl("/"),
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    ...events.map((event) => ({
      url: absoluteUrl(eventPath(event.id)),
      lastModified: event.updatedAt ? new Date(event.updatedAt) : new Date(event.startsAt),
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ];
}
