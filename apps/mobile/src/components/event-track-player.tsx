import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { debugLog } from '@/data/log';
import type { EventTrack } from '@/data/types';
import { formatDuration } from '@/lib/format';

function EventTrackPlayer({
  tracks,
  onRefresh,
}: {
  tracks: EventTrack[];
  onRefresh: () => Promise<EventTrack[]>;
}) {
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);
  const tracksRef = useRef(tracks);
  tracksRef.current = tracks;

  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers' }).catch((error) => {
      debugLog('audio', 'mode failed', { error });
    });
  }, []);

  useEffect(() => {
    if (status.didJustFinish) {
      setActiveId(null);
    }
  }, [status.didJustFinish]);

  if (tracks.length === 0) return null;

  async function toggle(track: EventTrack) {
    if (activeId === track.id && status.playing) {
      player.pause();
      setActiveId(null);
      return;
    }

    let next = track;
    const expiring =
      !track.url ||
      (track.previewExpiresAt != null && Date.parse(track.previewExpiresAt) <= Date.now() + 15_000);
    if (expiring) {
      try {
        const fresh = await onRefresh();
        next = fresh.find((row) => row.id === track.id) ?? tracksRef.current.find((row) => row.id === track.id) ?? track;
      } catch (error) {
        debugLog('audio', 'refresh failed', { trackId: track.id, error });
        setErrorId(track.id);
        return;
      }
    }

    if (!next.url) {
      setErrorId(track.id);
      return;
    }

    try {
      player.replace({ uri: next.url });
      player.play();
      setActiveId(track.id);
      setErrorId(null);
    } catch (error) {
      debugLog('audio', 'play failed', { trackId: track.id, error });
      setErrorId(track.id);
      setActiveId(null);
    }
  }

  return (
    <View className="gap-ds-12">
      <Text variant="headingSm">Audio</Text>
      {tracks.map((track) => (
        <View key={track.id} className="gap-ds-4">
          <Button variant="outline" disabled={!track.url && !track.previewExpiresAt} onPress={() => void toggle(track)}>
            <Text>
              {activeId === track.id && status.playing ? 'Pausa' : 'Play'} · {track.title}
              {track.durationMs ? ` · ${formatDuration(track.durationMs)}` : ''}
            </Text>
          </Button>
          {errorId === track.id ? <Text variant="helper">No se pudo reproducir</Text> : null}
        </View>
      ))}
    </View>
  );
}

export { EventTrackPlayer };
