import { memo, useCallback, useEffect, useRef } from 'react';
import { View } from 'react-native';

import { parseMapMessage, useMapHtml } from '@/components/osm-map-html';
import type { ParcheEvent } from '@/data/types';
import { useResolvedColorScheme } from '@/hooks/use-theme';
import { cn } from '@/lib/utils';

type OsmMapProps = {
  events?: ParcheEvent[];
  pin?: { lat: number; lng: number };
  selectedId?: string | null;
  onPressMap?: (coord: { lat: number; lng: number }) => void;
  onPressEvent?: (event: ParcheEvent) => void;
  onClear?: () => void;
  fill?: boolean;
  padTop?: number;
  padBottom?: number;
  className?: string;
};

type MapWindow = Window & { parcheMapEmit?: (raw: string) => void };

function OsmMapInner({
  events,
  pin,
  selectedId,
  onPressMap,
  onPressEvent,
  onClear,
  fill = false,
  padTop = 0,
  padBottom = 0,
  className,
}: OsmMapProps) {
  const dark = useResolvedColorScheme() === 'dark';
  const { html, pins } = useMapHtml(events, pin, Boolean(onPressMap), dark, !fill, padTop, padBottom);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const pinsRef = useRef(pins);
  pinsRef.current = pins;
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;
  const padRef = useRef({ top: padTop, bottom: padBottom });
  padRef.current = { top: padTop, bottom: padBottom };
  const onPressEventRef = useRef(onPressEvent);
  onPressEventRef.current = onPressEvent;
  const onPressMapRef = useRef(onPressMap);
  onPressMapRef.current = onPressMap;
  const onClearRef = useRef(onClear);
  onClearRef.current = onClear;

  const onRaw = useCallback((raw: string) => {
    const msg = parseMapMessage(raw);
    if (!msg) return;
    if (msg.type === 'clear') {
      onClearRef.current?.();
      return;
    }
    if (msg.type === 'event' && msg.id) {
      const found = pinsRef.current.find((e) => e.id === msg.id);
      if (found) onPressEventRef.current?.(found);
    }
    if (msg.type === 'pin' && msg.lat != null && msg.lng != null) {
      onPressMapRef.current?.({ lat: msg.lat, lng: msg.lng });
    }
  }, []);
  const onRawRef = useRef(onRaw);
  onRawRef.current = onRaw;

  useEffect(() => {
    const frame = iframeRef.current?.contentWindow as MapWindow | null;
    if (!frame) return;
    frame.postMessage(JSON.stringify({ type: 'select', id: selectedId ?? null }), '*');
  }, [selectedId]);

  useEffect(() => {
    const frame = iframeRef.current?.contentWindow as MapWindow | null;
    if (!frame) return;
    frame.postMessage(JSON.stringify({ type: 'pad', top: padTop, bottom: padBottom }), '*');
  }, [padTop, padBottom]);

  return (
    <View
      className={cn(
        'overflow-hidden',
        fill ? 'min-h-0 flex-1' : 'h-80 rounded-cards border border-border',
        className
      )}
      style={fill ? { flex: 1, height: '100%' } : undefined}>
      <iframe
        ref={iframeRef}
        title="Mapa OSM"
        srcDoc={html}
        onLoad={() => {
          const frame = iframeRef.current?.contentWindow as MapWindow | null;
          if (!frame) return;
          frame.parcheMapEmit = (raw) => onRawRef.current(raw);
          frame.postMessage(JSON.stringify({ type: 'select', id: selectedIdRef.current ?? null }), '*');
          frame.postMessage(
            JSON.stringify({ type: 'pad', top: padRef.current.top, bottom: padRef.current.bottom }),
            '*'
          );
        }}
        style={{ width: '100%', height: '100%', minHeight: fill ? 0 : 320, border: 0 }}
      />
    </View>
  );
}

export const OsmMap = memo(OsmMapInner);
export const MockMap = OsmMap;
