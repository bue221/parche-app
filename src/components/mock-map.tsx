import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import type { ParcheEvent } from '@/data/types';

const BOGOTA = { lat: 4.711, lng: -74.072 };
const SPAN = 0.18;

function project(lat: number, lng: number) {
  const x = (lng - (BOGOTA.lng - SPAN / 2)) / SPAN;
  const y = 1 - (lat - (BOGOTA.lat - SPAN / 2)) / SPAN;
  return { x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) };
}

export function MockMap({
  events,
  pin,
  onPressMap,
  onPressEvent,
}: {
  events?: ParcheEvent[];
  pin?: { lat: number; lng: number };
  onPressMap?: (coord: { lat: number; lng: number }) => void;
  onPressEvent?: (event: ParcheEvent) => void;
}) {
  return (
    <Pressable
      className="h-64 overflow-hidden rounded-cards border border-border bg-muted"
      onPress={(e) => {
        if (!onPressMap) {
          return;
        }
        const { locationX, locationY } = e.nativeEvent;
        const width = 320;
        const height = 256;
        const x = locationX / width;
        const y = locationY / height;
        onPressMap({
          lng: BOGOTA.lng - SPAN / 2 + x * SPAN,
          lat: BOGOTA.lat + SPAN / 2 - y * SPAN,
        });
      }}>
      <View className="absolute inset-0 items-center justify-center">
        <Text variant="helper">OSM mock · Bogotá</Text>
      </View>
      {(events ?? [])
        .filter((ev) => ev.lat != null && ev.lng != null)
        .map((ev) => {
          const p = project(ev.lat as number, ev.lng as number);
          return (
            <Pressable
              key={ev.id}
              onPress={() => onPressEvent?.(ev)}
              className="absolute size-3 rounded-full bg-foreground"
              style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
            />
          );
        })}
      {pin ? (
        <View
          className="absolute size-4 rounded-full border-2 border-background bg-foreground"
          style={{
            left: `${project(pin.lat, pin.lng).x * 100}%`,
            top: `${project(pin.lat, pin.lng).y * 100}%`,
          }}
        />
      ) : null}
    </Pressable>
  );
}
