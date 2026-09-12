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
  className,
}: OsmMapProps) {
  const dark = useResolvedColorScheme() === 'dark';
  const { html, pins } = useMapHtml(events, pin, Boolean(onPressMap), dark);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const pinsRef = useRef(pins);
  pinsRef.current = pins;
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;
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

  return (
    <View
      className={cn(
        'overflow-hidden',
        fill ? 'min-h-[280px] flex-1' : 'h-80 rounded-cards border border-border',
        className
      )}>
      <iframe
        ref={iframeRef}
        title="Mapa OSM"
        srcDoc={html}
        onLoad={() => {
          const frame = iframeRef.current?.contentWindow as MapWindow | null;
          if (!frame) return;
          frame.parcheMapEmit = (raw) => onRawRef.current(raw);
          frame.postMessage(JSON.stringify({ type: 'select', id: selectedIdRef.current ?? null }), '*');
        }}
        style={{ width: '100%', height: '100%', minHeight: 320, border: 0 }}
      />
    </View>
  );
}

export const OsmMap = memo(OsmMapInner);
export const MockMap = OsmMap;
