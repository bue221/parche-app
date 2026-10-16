import { permanentRedirect, notFound } from "next/navigation";

import { EventDetail } from "@/components/events/event-detail";
import {
  eventPath,
  getSimilarEvents,
  isEventId,
  isPublicEvent,
  listPublishedEvents,
  normalizeEventParam,
  resolveEvent,
} from "@/lib/events";
import { eventJsonLd, eventMetadata } from "@/lib/seo";
import { serializeJsonLd } from "@/lib/utils";

export const revalidate = 120;
export const dynamicParams = true;

export async function generateStaticParams() {
  const events = await listPublishedEvents();
  return events.map((event) => ({
    id: normalizeEventParam(event.slug?.trim() || event.id),
  }));
}

export async function generateMetadata({
  params,
}: PageProps<"/eventos/[id]">) {
  const { id } = await params;
  try {
    const event = await resolveEvent(id);
    if (!event || !isPublicEvent(event)) {
      return { title: "Esta fecha ya no está", robots: { index: false } };
    }
    return eventMetadata(event);
  } catch (error) {
    console.error("[eventos] metadata failed", { id, error });
    return { title: "Evento", robots: { index: false } };
  }
}

export default async function EventPage({
  params,
}: PageProps<"/eventos/[id]">) {
  const { id } = await params;
  const key = normalizeEventParam(id);
  let event;

  try {
    event = await resolveEvent(key);
  } catch (error) {
    console.error("[eventos] load failed", { id, error });
    throw error;
  }

  if (!event || !isPublicEvent(event)) {
    notFound();
  }

  const pretty = eventPath(event);
  if (isEventId(key) && event.slug && pretty !== `/eventos/${key}`) {
    // encodeURI keeps `/` and fixes accented Location headers (í, ñ, …).
    permanentRedirect(encodeURI(pretty));
  }

  const similar = await getSimilarEvents(event.id);

  return (
    <main id="contenido" className="flex flex-1 flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(eventJsonLd(event)) }}
      />
      <EventDetail event={event} similar={similar} />
    </main>
  );
}
