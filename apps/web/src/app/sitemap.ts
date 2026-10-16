import type { MetadataRoute } from "next";

import { artistPath, listIndexableArtistIds } from "@/lib/artists";
import { eventPath, listPublishedEvents } from "@/lib/events";
import { exploreHubPath, listExploreHubs } from "@/lib/explore-hubs";
import { absoluteUrl } from "@/lib/site";

export const revalidate = 120;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [events, artistIds] = await Promise.all([
    listPublishedEvents(),
    listIndexableArtistIds(),
  ]);
  const hubs = listExploreHubs();

  return [
    {
      url: absoluteUrl("/"),
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: absoluteUrl("/explorar"),
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.9,
    },
    ...hubs.map((hub) => ({
      url: absoluteUrl(exploreHubPath(hub)),
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.75,
    })),
    {
      url: absoluteUrl("/legal/privacidad"),
      lastModified: new Date(),
      changeFrequency: "yearly" as const,
      priority: 0.2,
    },
    {
      url: absoluteUrl("/legal/terminos"),
      lastModified: new Date(),
      changeFrequency: "yearly" as const,
      priority: 0.2,
    },
    {
      url: absoluteUrl("/legal/cookies"),
      lastModified: new Date(),
      changeFrequency: "yearly" as const,
      priority: 0.2,
    },
    ...events.map((event) => ({
      url: absoluteUrl(eventPath(event)),
      lastModified: event.updatedAt
        ? new Date(event.updatedAt)
        : new Date(event.startsAt),
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...artistIds.map((id) => ({
      url: absoluteUrl(artistPath(id)),
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.65,
    })),
  ];
}
