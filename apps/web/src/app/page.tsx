import { DownloadCta } from "@/components/landing/download-cta";
import { Faq } from "@/components/landing/faq";
import { FeaturedEvents } from "@/components/landing/featured-events";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Manifesto } from "@/components/landing/manifesto";
import { TicketDemo } from "@/components/landing/ticket-demo";
import { landingJsonLd } from "@/lib/seo";
import { serializeJsonLd } from "@/lib/utils";

export default function Home() {
  return (
    <main id="contenido" className="flex-1">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(landingJsonLd()),
        }}
      />
      <Hero />
      <FeaturedEvents />
      <Manifesto />
      <HowItWorks />
      <TicketDemo />
      <Faq />
      <DownloadCta />
    </main>
  );
}
