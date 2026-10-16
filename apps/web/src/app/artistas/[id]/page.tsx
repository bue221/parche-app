import { notFound } from "next/navigation";

import { ArtistDetail } from "@/components/artists/artist-detail";
import {
  getArtist,
  listIndexableArtistIds,
} from "@/lib/artists";
import { artistJsonLd, artistMetadata } from "@/lib/seo";
import { serializeJsonLd } from "@/lib/utils";

export const revalidate = 120;
export const dynamicParams = true;

type ArtistPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateStaticParams() {
  const ids = await listIndexableArtistIds();
  return ids.map((id) => ({ id }));
}

export async function generateMetadata({ params }: ArtistPageProps) {
  const { id } = await params;
  try {
    const artist = await getArtist(id);
    if (!artist) return { title: "Artista", robots: { index: false } };
    return artistMetadata(artist);
  } catch (error) {
    console.error("[artistas] metadata failed", { id, error });
    return { title: "Artista", robots: { index: false } };
  }
}

export default async function ArtistPage({ params }: ArtistPageProps) {
  const { id } = await params;
  let artist;

  try {
    artist = await getArtist(id);
  } catch (error) {
    console.error("[artistas] load failed", { id, error });
    throw error;
  }

  if (!artist) notFound();

  return (
    <main id="contenido" className="flex flex-1 flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(artistJsonLd(artist)),
        }}
      />
      <ArtistDetail artist={artist} />
    </main>
  );
}
