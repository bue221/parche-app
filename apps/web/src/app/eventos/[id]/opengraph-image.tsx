import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { getEvent } from "@/lib/events";
import { siteConfig } from "@/lib/site";

export const alt = "Evento en Parche";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 120;

const inter = await readFile(
  join(process.cwd(), "src/assets/fonts/Inter-Bold.ttf"),
);

export default async function EventOpenGraphImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getEvent(id).catch(() => null);
  const title = event?.title ?? siteConfig.name;
  const place = event?.venueName || event?.addressText || siteConfig.tagline;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#07070C",
          color: "#F5F5F8",
          padding: 64,
        }}
      >
        <div
          style={{
            display: "flex",
            fontFamily: "Inter",
            fontSize: 22,
            fontWeight: 700,
            color: "#B8A4FF",
          }}
        >
          Parche
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontFamily: "Inter",
            fontSize: title.length > 28 ? 52 : 68,
            lineHeight: 1.05,
            letterSpacing: "-2px",
            fontWeight: 700,
          }}
        >
          {title}
        </div>
        <div
          style={{
            display: "flex",
            fontFamily: "Inter",
            fontSize: 22,
            color: "#9A9AAB",
          }}
        >
          {place}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Inter", data: inter, weight: 700, style: "normal" }],
    },
  );
}
