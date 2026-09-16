import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { siteConfig } from "@/lib/site";

export const alt = `${siteConfig.name} — ${siteConfig.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const inter = await readFile(
  join(process.cwd(), "src/assets/fonts/Inter-Bold.ttf"),
);

export default function OpenGraphImage() {
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
          }}
        >
          Parche
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontFamily: "Inter",
            fontSize: 72,
            lineHeight: 0.95,
            letterSpacing: "-2px",
            fontWeight: 700,
          }}
        >
          Qué hay{" "}
          <span style={{ color: "#B8A4FF" }}>hoy</span>
          {" "}en tu ciudad?
        </div>
        <div
          style={{
            display: "flex",
            fontFamily: "Inter",
            fontSize: 22,
            color: "#9A9AAB",
          }}
        >
          {siteConfig.tagline}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Inter", data: inter, weight: 700, style: "normal" }],
    },
  );
}
