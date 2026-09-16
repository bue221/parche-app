import type { Metadata } from "next";

import { FAQS } from "@/constants/faqs";
import { eventPath } from "@/lib/events";
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
}) {
  const url = absoluteUrl(eventPath(event.id));
  const cancelled = event.status === "cancelled";

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
  return place
    ? `${event.title} en ${place}. Descubre la fecha en Parche.`
    : `${event.title} en Parche. Descubre la noche y confirma que vas.`;
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
