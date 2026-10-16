import type { Metadata } from "next";

import { artistPath, type PublicArtist } from "@/lib/artists";
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
import type { ExploreHub } from "@/lib/explore-hubs";
import { exploreHubPath } from "@/lib/explore-hubs";
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
  slug?: string;
  title: string;
  description?: string;
  startsAt: string;
  venueName?: string;
  addressText?: string;
  flyer?: { publicUrl: string };
  genres?: string[];
  status: string;
}): Metadata {
  const url = eventPath(event);
  const description = eventDescription(event);
  const index = event.status === "published";
  const keywords = [
    ...(event.genres ?? []),
    "evento",
    "boletas",
    siteConfig.name,
  ];

  return {
    title: event.title,
    description,
    keywords,
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
  slug?: string;
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
  const url = absoluteUrl(eventPath(event));
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
    url: absoluteUrl(eventPath(event)),
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

export function artistMetadata(artist: PublicArtist): Metadata {
  const url = artistPath(artist.id);
  const description =
    artist.bio?.slice(0, 160) ||
    `${artist.name} en Parche. Mira fechas próximas y abre la app para seguir.`;

  return {
    title: artist.name,
    description,
    alternates: {
      canonical: url,
      languages: { "es-CO": url, es: url },
    },
    openGraph: {
      type: "profile",
      locale: siteConfig.locale,
      url: absoluteUrl(url),
      siteName: siteConfig.name,
      title: artist.name,
      description,
      images: artist.avatar
        ? [{ url: artist.avatar.publicUrl, alt: artist.name }]
        : undefined,
    },
    twitter: {
      card: "summary",
      title: artist.name,
      description,
      creator: siteConfig.creator,
    },
  };
}

export function artistJsonLd(artist: PublicArtist) {
  const url = absoluteUrl(artistPath(artist.id));
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${url}#person`,
    name: artist.name,
    description: artist.bio,
    url,
    image: artist.avatar?.publicUrl,
    sameAs: [artist.links.instagram, artist.links.soundcloud].filter(Boolean),
  };
}

export function exploreHubMetadata(hub: ExploreHub): Metadata {
  const path = exploreHubPath(hub);
  const title =
    hub.kind === "city"
      ? `Eventos en ${hub.label}`
      : `${hub.label} en Colombia`;
  const description =
    hub.kind === "city"
      ? `Agenda de eventos en vivo en ${hub.label}. Explora fechas y mapa en Parche.`
      : `Agenda de ${hub.label}: flyers, fechas y mapa. Descubre en Parche.`;

  return {
    title,
    description,
    alternates: {
      canonical: path,
      languages: { "es-CO": path, es: path },
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
  };
}

export function legalMetadata(input: {
  path: string;
  title: string;
  description: string;
}): Metadata {
  return {
    title: input.title,
    description: input.description,
    alternates: {
      canonical: input.path,
      languages: { "es-CO": input.path, es: input.path },
    },
    robots: { index: true, follow: true },
  };
}
