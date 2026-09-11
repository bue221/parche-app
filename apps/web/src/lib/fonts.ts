import localFont from "next/font/local";

export const inter = localFont({
  src: [
    {
      path: "../assets/fonts/Inter-Light.ttf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../assets/fonts/Inter-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../assets/fonts/Inter-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-inter",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
  adjustFontFallback: "Arial",
});

export const antonio = localFont({
  src: [
    {
      path: "../assets/fonts/Antonio-Regular.ttf",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-antonio",
  display: "swap",
  fallback: ["Arial Narrow", "Impact", "Haettenschweiler", "sans-serif"],
  adjustFontFallback: "Arial",
});
