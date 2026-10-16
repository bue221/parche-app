import { CityExplore } from "@/components/landing/city-explore";
import { DownloadCta } from "@/components/landing/download-cta";
import { Faq } from "@/components/landing/faq";
import { FeaturedEvents } from "@/components/landing/featured-events";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { NightMap } from "@/components/landing/night-map";
import { TicketDemo } from "@/components/landing/ticket-demo";
import { TrendingArtists } from "@/components/landing/trending-artists";
import { listPublishedEvents } from "@/lib/events";
import { landingJsonLd } from "@/lib/seo";
import { serializeJsonLd } from "@/lib/utils";

export default async function Home() {
  const events = await listPublishedEvents();

  return (
    <main id="contenido" className="flex-1">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(landingJsonLd()),
        }}
      />
      <Hero events={events} />
      <FeaturedEvents events={events} />
      <CityExplore events={events} />
      <TrendingArtists events={events} />
      <NightMap events={events} />
      <HowItWorks />
      <TicketDemo />
      <DownloadCta />
      <Faq />
    </main>
  );
}
