import type { Metadata } from "next";

import { FAQS } from "@/constants/faqs";
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
