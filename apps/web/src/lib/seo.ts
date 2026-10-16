import type { Metadata } from "next";

import { FAQS } from "@/constants/faqs";
import {
  eventPath,
  explorePath,
  lowestOnSale,
  ticketOnSale,
  type EventListFilters,
  type PublicEventCard,
  type PublicTicketType,
} from "@/lib/events";
import { formatEventWhen } from "@/lib/format";
import { absoluteUrl, siteConfig } from "@/lib/site";

export const defaultMetadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s — ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [...siteConfig.keywords],
  applicationName: siteConfig.name,
  authors: [{ name: siteConfig.name, url: siteConfig.url }],
  creator: siteConfig.name,
  publisher: siteConfig.name,
  category: "entertainment",
  alternates: {
    canonical: "/",
    languages: {
      "es-CO": "/",
      es: "/",
    },
  },
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    url: absoluteUrl("/"),
    siteName: siteConfig.name,
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
    creator: siteConfig.creator,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

export function eventMetadata(event: {
  id: string;
  title: string;
  description?: string;
  startsAt: string;
  venueName?: string;
  addressText?: string;
  flyer?: { publicUrl: string };
  status: string;
}): Metadata {
  const url = eventPath(event.id);
  const description = eventDescription(event);
  const index = event.status === "published";

  return {
    title: event.title,
    description,
    alternates: {
      canonical: url,
      languages: {
        "es-CO": url,
        es: url,
      },
    },
    openGraph: {
      type: "website",
      locale: siteConfig.locale,
      url: absoluteUrl(url),
      siteName: siteConfig.name,
      title: event.title,
      description,
      images: event.flyer
        ? [{ url: event.flyer.publicUrl, alt: event.title }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: event.title,
      description,
      creator: siteConfig.creator,
    },
    robots: index
      ? {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        }
      : { index: false, follow: true },
  };
}

export function eventJsonLd(event: {
  id: string;
  title: string;
  description?: string;
  startsAt: string;
  endsAt?: string;
  venueName?: string;
  addressText?: string;
  flyer?: { publicUrl: string };
  status: string;
  lat?: number;
  lng?: number;
  ticketTypes?: PublicTicketType[];
}) {
  const url = absoluteUrl(eventPath(event.id));
  const cancelled = event.status === "cancelled";
  const onSale = (event.ticketTypes ?? []).filter(ticketOnSale);
  const lowest = lowestOnSale(onSale);

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: eventDescription(event),
    url,
    inLanguage: "es-CO",
    startDate: event.startsAt,
    endDate: event.endsAt,
    eventStatus: cancelled
      ? "https://schema.org/EventCancelled"
      : "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    image: event.flyer?.publicUrl,
    location: {
      "@type": "Place",
      name: event.venueName || event.addressText || "Colombia",
      address: event.addressText,
      ...(event.lat != null && event.lng != null
        ? {
            geo: {
              "@type": "GeoCoordinates",
              latitude: event.lat,
              longitude: event.lng,
            },
          }
        : {}),
    },
    organizer: {
      "@type": "Organization",
      name: siteConfig.name,
      url: absoluteUrl("/"),
    },
    ...(lowest
      ? {
          offers: {
            "@type": "AggregateOffer",
            url: siteConfig.appWebUrl
              ? `${siteConfig.appWebUrl.replace(/\/$/, "")}/event/${event.id}`
              : url,
            priceCurrency: lowest.currency,
            lowPrice: lowest.priceCents,
            offerCount: onSale.length,
            availability: "https://schema.org/InStock",
          },
        }
      : {}),
  };
}

function eventDescription(event: {
  title: string;
  description?: string;
  startsAt: string;
  venueName?: string;
  addressText?: string;
}): string {
  if (event.description) return event.description.slice(0, 160);
  const place = event.venueName || event.addressText;
  const when = formatEventWhen(event.startsAt);
  return place
    ? `${event.title} · ${when} · ${place}. Compra tu boleta en Parche.`
    : `${event.title} · ${when}. Compra tu boleta en Parche.`;
}

export function exploreMetadata(filters: EventListFilters = {}): Metadata {
  const hasQuery = Boolean(filters.q?.trim());
  const path = explorePath(filters);
  const { title, description } = exploreCopy(filters);

  return {
    title,
    description,
    alternates: {
      canonical: path,
      languages: {
        "es-CO": path,
        es: path,
      },
    },
    openGraph: {
      type: "website",
      locale: siteConfig.locale,
      url: absoluteUrl(path),
      siteName: siteConfig.name,
      title: `${title} — ${siteConfig.name}`,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} — ${siteConfig.name}`,
      description,
      creator: siteConfig.creator,
    },
    robots: hasQuery
      ? { index: false, follow: true }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        },
  };
}

export function exploreJsonLd(
  events: readonly PublicEventCard[],
  filters: EventListFilters = {},
) {
  const path = explorePath(filters);
  const url = absoluteUrl(path);
  const { title, description } = exploreCopy(filters);
  const items = events.slice(0, 50).map((event, index) => ({
    "@type": "ListItem",
    position: index + 1,
    url: absoluteUrl(eventPath(event.id)),
    name: event.title,
  }));

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${url}#webpage`,
        url,
        name: title,
        description,
        inLanguage: "es-CO",
        isPartOf: { "@id": `${absoluteUrl("/")}#website` },
      },
      {
        "@type": "ItemList",
        "@id": `${url}#itemlist`,
        name: title,
        numberOfItems: events.length,
        itemListElement: items,
      },
    ],
  };
}

function exploreCopy(filters: EventListFilters): {
  title: string;
  description: string;
} {
  const genre = filters.genre?.trim();
  const q = filters.q?.trim();

  if (q) {
    return {
      title: `Buscar “${q}” en Bogotá`,
      description: `Resultados de “${q}” en la agenda de Parche. Descubre eventos en vivo en Bogotá.`,
    };
  }
  if (genre) {
    const label = genre.charAt(0).toUpperCase() + genre.slice(1);
    return {
      title: `${label} en Bogotá`,
      description: `Agenda de ${label} en Bogotá: flyers, fechas y mapa. Explora en Parche.`,
    };
  }
  if (filters.from || filters.to) {
    return {
      title: "Eventos en Bogotá",
      description:
        "Agenda filtrada de eventos en vivo en Bogotá. Mira fechas, venues y mapa en Parche.",
    };
  }
  return {
    title: "Explorar eventos en Bogotá",
    description:
      "Descubre fiestas, conciertos y la noche en Bogotá. Lista y mapa de eventos publicados en Parche.",
  };
}

export function landingJsonLd() {
  const url = absoluteUrl("/");

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${url}/#organization`,
        name: siteConfig.name,
        url,
        email: siteConfig.email,
        logo: {
          "@type": "ImageObject",
          url: absoluteUrl("/brand/icon-dark.png"),
        },
      },
      {
        "@type": "WebSite",
        "@id": `${url}/#website`,
        url,
        name: siteConfig.name,
        description: siteConfig.description,
        inLanguage: "es-CO",
        publisher: { "@id": `${url}/#organization` },
      },
      {
        "@type": "WebPage",
        "@id": `${url}/#webpage`,
        url,
        name: `${siteConfig.name} — ${siteConfig.tagline}`,
        description: siteConfig.description,
        inLanguage: "es-CO",
        isPartOf: { "@id": `${url}/#website` },
        about: { "@id": `${url}/#organization` },
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${url}/#app`,
        name: siteConfig.name,
        applicationCategory: "LifestyleApplication",
        operatingSystem: "iOS, Android",
        description: siteConfig.description,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "COP",
        },
        inLanguage: "es-CO",
      },
      {
        "@type": "FAQPage",
        "@id": `${url}/#faq`,
        mainEntity: FAQS.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.a,
          },
        })),
      },
    ],
  };
}
