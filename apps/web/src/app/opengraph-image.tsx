import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { siteConfig } from "@/lib/site";

export const alt = `${siteConfig.name} — ${siteConfig.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const antonio = await readFile(
  join(process.cwd(), "src/assets/fonts/Antonio-Regular.ttf"),
);
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
          background: "#ffffff",
          color: "#000000",
          padding: 64,
        }}
      >
        <div
          style={{
            display: "flex",
            fontFamily: "Inter",
            fontSize: 18,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          Parche
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontFamily: "Antonio",
            fontSize: 120,
            lineHeight: 0.83,
            textTransform: "uppercase",
          }}
        >
          Welcome
          <br />
          to the
          <br />
          Parche
        </div>
        <div
          style={{
            display: "flex",
            fontFamily: "Inter",
            fontSize: 22,
            letterSpacing: "0.06em",
            color: "#595959",
          }}
        >
          {siteConfig.tagline}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Antonio", data: antonio, weight: 400, style: "normal" },
        { name: "Inter", data: inter, weight: 700, style: "normal" },
      ],
    },
  );
}
