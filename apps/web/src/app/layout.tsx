import type { Metadata, Viewport } from "next";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader, SkipLink } from "@/components/layout/site-header";
import { ThemeScript } from "@/components/theme/theme-script";
import { antonio, inter } from "@/lib/fonts";
import { defaultMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

import "./globals.css";

export const metadata: Metadata = defaultMetadata;

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f4f7" },
    { media: "(prefers-color-scheme: dark)", color: "#07070c" },
  ],
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang={siteConfig.language}
      suppressHydrationWarning
      className={cn(inter.variable, antonio.variable, "h-full antialiased")}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-full flex-col bg-background font-favorit text-foreground">
        <SkipLink />
        <SiteHeader />
        <div className="flex min-h-full flex-1 flex-col pt-[4.75rem] sm:pt-[5.25rem]">
          {children}
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
