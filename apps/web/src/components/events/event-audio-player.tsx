"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import type { EventTrack } from "@/lib/events";
import { formatDuration } from "@/lib/format";

function EventAudioPlayer({ tracks }: { tracks: EventTrack[] }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);

  if (tracks.length === 0) return null;

  async function toggle(track: EventTrack) {
    const el = audioRef.current;
    if (!el || !track.previewUrl) {
      setErrorId(track.id);
      return;
    }
    if (playingId === track.id) {
      el.pause();
      setPlayingId(null);
      return;
    }
    el.src = track.previewUrl;
    try {
      await el.play();
      setPlayingId(track.id);
      setErrorId(null);
    } catch (error) {
      console.error("[audio] play failed", { trackId: track.id, error });
      setErrorId(track.id);
      setPlayingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-ds-8">
      <Text variant="caption" className="uppercase text-muted-foreground">
        Audio
      </Text>
      <audio
        ref={audioRef}
        className="hidden"
        onEnded={() => setPlayingId(null)}
        onError={() => {
          if (playingId) setErrorId(playingId);
          setPlayingId(null);
        }}
      />
      <ul className="flex flex-col gap-ds-8">
        {tracks.map((track) => (
          <li key={track.id} className="flex flex-col gap-ds-4">
            <Button
              variant="outline"
              size="sm"
              className="self-start"
              disabled={!track.previewUrl}
              onClick={() => void toggle(track)}
            >
              {playingId === track.id ? "Pausa" : "Play"} · {track.title}
              {track.durationMs ? ` · ${formatDuration(track.durationMs)}` : ""}
            </Button>
            {errorId === track.id ? (
              <Text variant="helper">No se pudo reproducir</Text>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export { EventAudioPlayer };
