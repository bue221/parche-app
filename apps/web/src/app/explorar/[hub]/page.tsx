import { notFound } from "next/navigation";

import { ExploreShell } from "@/components/explore/explore-shell";
import { eventPath, listEvents } from "@/lib/events";
import {
  filterEventsForHub,
  filtersForHub,
  listExploreHubs,
  resolveExploreHub,
} from "@/lib/explore-hubs";
import { exploreHubMetadata, exploreJsonLd } from "@/lib/seo";
import { serializeJsonLd } from "@/lib/utils";

export const revalidate = 120;

type HubPageProps = {
  params: Promise<{ hub: string }>;
};

export async function generateStaticParams() {
  return listExploreHubs().map((hub) => ({ hub: hub.slug }));
}

export async function generateMetadata({ params }: HubPageProps) {
  const { hub: raw } = await params;
  const hub = resolveExploreHub(raw);
  if (!hub) return { title: "Explorar", robots: { index: false } };
  return exploreHubMetadata(hub);
}

export default async function ExploreHubPage({ params }: HubPageProps) {
  const { hub: raw } = await params;
  const hub = resolveExploreHub(raw);
  if (!hub) notFound();

  const filters = filtersForHub(hub);
  const listed = await listEvents({ ...filters, firstPageOnly: true });
  const events = filterEventsForHub(listed, hub);

  return (
    <main id="contenido" className="flex flex-1 flex-col" data-explore-layout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(exploreJsonLd(events, filters)),
        }}
      />

      <section className="sr-only" aria-label={`Eventos: ${hub.label}`}>
        <h1>{hub.label}</h1>
        <ul>
          {events.map((event) => (
            <li key={event.id}>
              <a href={eventPath(event)}>{event.title}</a>
            </li>
          ))}
        </ul>
      </section>

      <ExploreShell
        initialEvents={events}
        initialFilters={filters}
        initialViewMode="list"
      />
    </main>
  );
}
