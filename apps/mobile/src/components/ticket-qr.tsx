import Svg, { Rect } from 'react-native-svg';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';

function cellsFromToken(token: string, size = 21): boolean[][] {
  const grid = Array.from({ length: size }, () => Array.from({ length: size }, () => false));
  let h = 0;
  for (let i = 0; i < token.length; i += 1) {
    h = (h * 33 + token.charCodeAt(i)) >>> 0;
  }
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const bit = (h >> ((x + y) % 24)) & 1;
      grid[y][x] = Boolean(bit) || x < 3 || y < 3 || x > size - 4 || y > size - 4;
      h = (h * 16777619 + x * 13 + y * 17) >>> 0;
    }
  }
  return grid;
}

export function TicketQr({ token, revealed }: { token: string; revealed: boolean }) {
  if (!revealed || !token) {
    return (
      <View className="size-40 items-center justify-center bg-muted">
        <Text variant="helper">Imprimiendo…</Text>
      </View>
    );
  }
  const grid = cellsFromToken(token);
  const cell = 8;
  return (
    <View className="bg-paper-white p-ds-8">
      <Svg width={grid.length * cell} height={grid.length * cell}>
        {grid.flatMap((row, y) =>
          row.map((on, x) =>
            on ? (
              <Rect
                key={`${x}-${y}`}
                x={x * cell}
                y={y * cell}
                width={cell}
                height={cell}
                fill="#000000"
              />
            ) : null
          )
        )}
      </Svg>
    </View>
  );
}
