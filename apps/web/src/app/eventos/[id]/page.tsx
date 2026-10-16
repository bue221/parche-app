import { notFound } from "next/navigation";

import { EventDetail } from "@/components/events/event-detail";
import {
  getEvent,
  getSimilarEvents,
  isPublicEvent,
  listPublishedEvents,
} from "@/lib/events";
import { eventJsonLd, eventMetadata } from "@/lib/seo";
import { serializeJsonLd } from "@/lib/utils";

export const revalidate = 120;
export const dynamicParams = true;

export async function generateStaticParams() {
  const events = await listPublishedEvents();
  return events.map((event) => ({ id: event.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/eventos/[id]">) {
  const { id } = await params;
  try {
    const event = await getEvent(id);
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
  let event;

  try {
    event = await getEvent(id);
  } catch (error) {
    console.error("[eventos] load failed", { id, error });
    throw error;
  }

  if (!event || !isPublicEvent(event)) {
    notFound();
  }

  const similar = await getSimilarEvents(id);

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
