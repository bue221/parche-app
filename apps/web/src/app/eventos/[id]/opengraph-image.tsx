import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { resolveEvent } from "@/lib/events";
import { formatEventWhen } from "@/lib/format";
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
  const event = await resolveEvent(id).catch((error) => {
    console.error("[eventos] og image failed", { id, error });
    return null;
  });
  const title = event?.title ?? siteConfig.name;
  const place =
    event?.venueName?.trim() ||
    event?.addressText?.trim() ||
    siteConfig.tagline;
  const when = event ? formatEventWhen(event.startsAt) : undefined;
  const flyer = event?.flyer?.publicUrl ?? event?.flyer?.thumbUrl;
  const titleSize = title.length > 42 ? 42 : title.length > 28 ? 52 : 64;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#07070C",
          color: "#F5F5F8",
          padding: 48,
        }}
      >
        {flyer ? (
          <img
            src={flyer}
            alt=""
            width={400}
            height={500}
            style={{
              width: 400,
              height: 500,
              objectFit: "cover",
              borderRadius: 20,
            }}
          />
        ) : null}
        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            justifyContent: "space-between",
            marginLeft: flyer ? 48 : 16,
            paddingTop: 8,
            paddingBottom: 8,
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
              fontSize: titleSize,
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
              flexDirection: "column",
              fontFamily: "Inter",
              fontSize: 22,
              color: "#9A9AAB",
            }}
          >
            {when ? <div style={{ display: "flex" }}>{when}</div> : null}
            <div style={{ display: "flex", marginTop: when ? 8 : 0 }}>
              {place}
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Inter", data: inter, weight: 700, style: "normal" }],
    },
  );
}
