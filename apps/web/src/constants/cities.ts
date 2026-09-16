export type LandingCity = {
  slug: string;
  name: string;
  image: string;
  pattern: RegExp;
};

export const LANDING_CITIES: readonly LandingCity[] = [
  {
    slug: "bogota",
    name: "Bogotá",
    image: "/landing/bogota.jpg",
    pattern: /bogot[aá]/i,
  },
  {
    slug: "medellin",
    name: "Medellín",
    image: "/landing/medellin.jpg",
    pattern: /medell[ií]n/i,
  },
  {
    slug: "cali",
    name: "Cali",
    image: "/landing/cali.jpg",
    pattern: /\bcali\b/i,
  },
  {
    slug: "barranquilla",
    name: "Barranquilla",
    image: "/landing/barranquilla.jpg",
    pattern: /barranquilla/i,
  },
  {
    slug: "cartagena",
    name: "Cartagena",
    image: "/landing/cartagena.jpg",
    pattern: /cartagena/i,
  },
] as const;

export const DEFAULT_CITY = LANDING_CITIES[0];
