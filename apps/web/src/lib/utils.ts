import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: [
        "caption",
        "body-sm",
        "body",
        "subheading",
        "heading-sm",
        "heading",
        "display",
      ],
      font: ["favorit", "foggy"],
      tracking: ["favorit"],
      "font-weight": ["quiet"],
      radius: ["tags", "cards", "images", "buttons", "navelements", "small"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
