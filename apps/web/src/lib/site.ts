function optionalUrl(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export const siteConfig = {
  name: "Parche",
  shortName: "Parche",
  tagline: "Descubre la noche. Confirma que vas.",
  description:
    "Parche es la app para descubrir conciertos, rumba, teatro y festivales en tu ciudad. Mira qué hay esta noche y confirma que vas.",
  locale: "es_CO",
  language: "es",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://parche.app",
  appWebUrl: optionalUrl(process.env.NEXT_PUBLIC_APP_WEB_URL),
  appStoreUrl: optionalUrl(process.env.NEXT_PUBLIC_APP_STORE_URL),
  playStoreUrl: optionalUrl(process.env.NEXT_PUBLIC_PLAY_STORE_URL),
  creator: "@parche",
  email: "hola@parche.app",
  keywords: [
    "parche",
    "eventos en vivo",
    "conciertos",
    "fiestas",
    "app de eventos",
    "Colombia",
    "Bogotá",
    "Medellín",
    "Cali",
  ],
} as const;

export function absoluteUrl(path = "/"): string {
  const base = siteConfig.url.replace(/\/$/, "");
  if (path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function appWebHref(path = "/"): string | undefined {
  const base = siteConfig.appWebUrl?.replace(/\/$/, "");
  if (!base) return undefined;
  if (path === "/" || path === "") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
