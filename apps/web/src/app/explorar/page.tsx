import { ExploreShell } from "@/components/explore/explore-shell";
import {
  eventPath,
  listEvents,
  type EventListFilters,
} from "@/lib/events";
import {
  parseExploreSearchParams,
  type ExploreSearchParams,
} from "@/lib/explore-filters";
import { exploreJsonLd, exploreMetadata } from "@/lib/seo";
import { serializeJsonLd } from "@/lib/utils";

export const revalidate = 120;

type ExplorePageProps = {
  searchParams: Promise<ExploreSearchParams>;
};

export async function generateMetadata({ searchParams }: ExplorePageProps) {
  const params = await searchParams;
  const { filters } = parseExploreSearchParams(params);
  return exploreMetadata(filters);
}

export default async function ExplorarPage({ searchParams }: ExplorePageProps) {
  const params = await searchParams;
  const { filters, viewMode } = parseExploreSearchParams(params);
  const events = await listEvents({ ...filters, firstPageOnly: true });

  return (
    <main
      id="contenido"
      className="relative z-0 -mt-[4.75rem] flex flex-1 flex-col sm:-mt-[5.25rem]"
      data-explore-layout
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(exploreJsonLd(events, filters)),
        }}
      />

      <section className="sr-only" aria-label="Listado de eventos para indexación">
        <h2>Eventos en Parche</h2>
        <ul>
          {events.map((event) => (
            <li key={event.id}>
              <a href={eventPath(event.id)}>
                {event.title}
                {event.venueName ? ` — ${event.venueName}` : ""}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <ExploreShell
        initialEvents={events}
        initialFilters={stripEmpty(filters)}
        initialViewMode={viewMode}
      />
    </main>
  );
}

function stripEmpty(filters: EventListFilters): EventListFilters {
  return {
    ...(filters.q ? { q: filters.q } : {}),
    ...(filters.genre ? { genre: filters.genre } : {}),
    ...(filters.from ? { from: filters.from } : {}),
    ...(filters.to ? { to: filters.to } : {}),
    ...(filters.artistId ? { artistId: filters.artistId } : {}),
  };
}
