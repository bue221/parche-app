export const HERO_KICKERS = [
  "Conciertos",
  "Fiestas",
  "Teatro",
  "Cultura",
] as const;

export const LANDING_CATEGORIES = [
  { id: "concierto", label: "Concierto", icon: "music" },
  { id: "club", label: "Club", icon: "disc" },
  { id: "festival", label: "Festival", icon: "sparkles" },
  { id: "teatro", label: "Teatro", icon: "masks" },
  { id: "fiesta", label: "Fiesta", icon: "wine" },
  { id: "cultura", label: "Cultura", icon: "landmark" },
  { id: "mas", label: "Más", icon: "more" },
] as const;

export type LandingCategory = (typeof LANDING_CATEGORIES)[number];
