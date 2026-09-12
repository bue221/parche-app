import { useCallback, useRef } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';

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

export function OsmMap({ events, pin, onPressMap, onPressEvent, fill = false, className }: OsmMapProps) {
  const dark = useResolvedColorScheme() === 'dark';
  const { html, pins } = useMapHtml(events, pin, Boolean(onPressMap), dark);
  const pinsRef = useRef(pins);
  pinsRef.current = pins;

  const onRaw = useCallback(
    (raw: string) => {
      const msg = parseMapMessage(raw);
      if (!msg) return;
      if (msg.type === 'event' && msg.id) {
        const found = pinsRef.current.find((e) => e.id === msg.id);
        if (found) onPressEvent?.(found);
      }
      if (msg.type === 'pin' && msg.lat != null && msg.lng != null) {
        onPressMap?.({ lat: msg.lat, lng: msg.lng });
      }
    },
    [onPressEvent, onPressMap]
  );

  return (
    <View
      className={cn(
        'overflow-hidden',
        fill ? 'min-h-[280px] flex-1' : 'h-80 rounded-cards border border-border',
        className
      )}>
      <WebView originWhitelist={['*']} source={{ html }} onMessage={(e) => onRaw(e.nativeEvent.data)} style={{ flex: 1 }} />
    </View>
  );
}

export const MockMap = OsmMap;
