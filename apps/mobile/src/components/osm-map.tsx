import { useCallback, useEffect, useRef } from 'react';
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
  padTop?: number;
  padBottom?: number;
  className?: string;
};

export function OsmMap({
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
  const pinsRef = useRef(pins);
  pinsRef.current = pins;
  const webRef = useRef<WebView>(null);
  const onPressEventRef = useRef(onPressEvent);
  onPressEventRef.current = onPressEvent;
  const onPressMapRef = useRef(onPressMap);
  onPressMapRef.current = onPressMap;
  const onClearRef = useRef(onClear);
  onClearRef.current = onClear;

  useEffect(() => {
    const id = JSON.stringify(selectedId ?? null);
    webRef.current?.injectJavaScript(`window.setSelected && window.setSelected(${id}); true;`);
  }, [selectedId, html]);

  useEffect(() => {
    webRef.current?.injectJavaScript(`window.setMapPad && window.setMapPad(${padTop}, ${padBottom}); true;`);
  }, [padTop, padBottom, html]);

  const onRaw = useCallback((raw: string) => {
    const msg = parseMapMessage(raw);
    if (!msg) return;
    if (msg.type === 'clear') {
      onClearRef.current?.();
      return;
    }
    if (msg.type === 'event' && msg.id) {
      const found = pinsRef.current.find((event) => event.id === msg.id);
      if (found) onPressEventRef.current?.(found);
    }
    if (msg.type === 'pin' && msg.lat != null && msg.lng != null) {
      onPressMapRef.current?.({ lat: msg.lat, lng: msg.lng });
    }
  }, []);

  return (
    <View
      className={cn('overflow-hidden', fill ? 'min-h-0 flex-1' : 'h-80 rounded-cards border border-border', className)}
      style={fill ? { flex: 1 } : undefined}>
      <WebView
        ref={webRef}
        originWhitelist={['*']}
        source={{ html }}
        onMessage={(e) => onRaw(e.nativeEvent.data)}
        onLoadEnd={() => {
          const id = JSON.stringify(selectedId ?? null);
          webRef.current?.injectJavaScript(
            `window.setSelected && window.setSelected(${id}); window.setMapPad && window.setMapPad(${padTop}, ${padBottom}); true;`
          );
        }}
        bounces={false}
        scrollEnabled={false}
        setSupportMultipleWindows={false}
        style={{ flex: 1, width: '100%', height: '100%', backgroundColor: 'transparent' }}
      />
    </View>
  );
}

export const MockMap = OsmMap;
