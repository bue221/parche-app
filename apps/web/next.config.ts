import type { NextConfig } from "next";

function mediaRemotePatterns(): NonNullable<
  NextConfig["images"]
>["remotePatterns"] {
  const entries = new Set(
    (process.env.MEDIA_HOSTS ?? "localhost:9000")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );

  try {
    const api = new URL(process.env.API_URL ?? "http://localhost:8080");
    entries.add(api.port ? `${api.hostname}:${api.port}` : api.hostname);
  } catch {
    /* ignore invalid API_URL */
  }

  return [...entries].map((entry) => {
    const url = new URL(
      entry.includes("://")
        ? entry
        : `${isLocalHost(entry) ? "http" : "https"}://${entry}`,
    );
    return {
      protocol: url.protocol.replace(":", "") as "http" | "https",
      hostname: url.hostname,
      ...(url.port ? { port: url.port } : {}),
      pathname: "/**" as const,
    };
  });
}

function isLocalHost(entry: string): boolean {
  const host = entry.split(":")[0];
  return host === "localhost" || host === "127.0.0.1";
}

const remotePatterns = mediaRemotePatterns();

const nextConfig: NextConfig = {
  reactCompiler: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns,
    // MinIO and the API run on loopback in local/dev. Production CDNs are public.
    dangerouslyAllowLocalIP: remotePatterns.some(
      (pattern) =>
        pattern.hostname === "localhost" || pattern.hostname === "127.0.0.1",
    ),
  },
};

export default nextConfig;
