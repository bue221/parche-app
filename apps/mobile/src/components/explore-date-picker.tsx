import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { cardShadowStyle } from '@/lib/card-shadow';
import {
  buildMonthCells,
  exploreDateRange,
  EXPLORE_WEEKDAYS,
  monthTitle,
} from '@/lib/explore-dates';
import { toDateInput } from '@/lib/format';
import { cn } from '@/lib/utils';

const TODAY = toDateInput(new Date().toISOString());

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
  gap: 4,
} as object;

export function ExploreDatePicker({
  from,
  to,
  onApply,
  onClose,
}: {
  from?: string;
  to?: string;
  onApply: (range: { from?: string; to?: string }) => void;
  onClose: () => void;
}) {
  const initialFrom = toDateInput(from);
  const initialTo = toDateInput(to);
  const theme = useTheme();
  const [draftFrom, setDraftFrom] = useState(initialFrom);
  const [draftTo, setDraftTo] = useState(initialTo);
  const [cursor, setCursor] = useState(() => {
    const base = initialFrom ? new Date(`${initialFrom}T12:00:00`) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const monthB = useMemo(
    () => new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1),
    [cursor]
  );

  function pick(isoDay: string) {
    if (!draftFrom || (draftFrom && draftTo)) {
      setDraftFrom(isoDay);
      setDraftTo('');
      return;
    }
    if (isoDay < draftFrom) {
      setDraftFrom(isoDay);
      setDraftTo('');
      return;
    }
    setDraftTo(isoDay);
  }

  function apply() {
    if (!draftFrom) {
      onApply({ from: undefined, to: undefined });
      onClose();
      return;
    }
    onApply(exploreDateRange(draftFrom, draftTo || draftFrom));
    onClose();
  }

  function clear() {
    setDraftFrom('');
    setDraftTo('');
    onApply({ from: undefined, to: undefined });
    onClose();
  }

  return (
    <View
      accessibilityRole="none"
      className="rounded-[24px] border border-border bg-background p-ds-24"
      style={[
        cardShadowStyle,
        {
          width: 640,
          maxWidth: 640,
          backgroundColor: theme.surface,
          zIndex: 50,
        },
      ]}>
      <View className="mb-ds-16 flex-row items-center justify-between gap-ds-12">
        <Text variant="bodySm" className="font-bold">
          Fechas
        </Text>
        <View className="flex-row items-center gap-ds-4">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mes anterior"
            onPress={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            className="size-9 items-center justify-center rounded-full border border-border">
            <ChevronLeft size={16} color={theme.text} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mes siguiente"
            onPress={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            className="size-9 items-center justify-center rounded-full border border-border">
            <ChevronRight size={16} color={theme.text} />
          </Pressable>
        </View>
      </View>

      <View className="flex-row gap-ds-24">
        <MonthGrid month={cursor} from={draftFrom} to={draftTo} onPick={pick} />
        <View className="min-w-0 flex-1">
          <MonthGrid month={monthB} from={draftFrom} to={draftTo} onPick={pick} />
        </View>
      </View>

      <View className="mt-ds-20 flex-row items-center justify-between gap-ds-12 border-t border-border pt-ds-16">
        <Pressable accessibilityRole="button" accessibilityLabel="Limpiar fechas" onPress={clear}>
          <Text variant="bodySm" className="font-bold underline">
            Limpiar
          </Text>
        </Pressable>
        <Button size="sm" onPress={apply}>
          <Text>Aplicar</Text>
        </Button>
      </View>
    </View>
  );
}

function MonthGrid({
  month,
  from,
  to,
  onPick,
}: {
  month: Date;
  from: string;
  to: string;
  onPick: (isoDay: string) => void;
}) {
  const cells = useMemo(() => buildMonthCells(month), [month]);

  return (
    <View className="min-w-0 flex-1">
      <Text variant="bodySm" className="mb-ds-12 text-center font-bold">
        {monthTitle(month)}
      </Text>
      <View className="mb-ds-8" style={gridStyle}>
        {EXPLORE_WEEKDAYS.map((day) => (
          <Text key={day} variant="caption" className="text-center text-[11px] text-muted-foreground">
            {day}
          </Text>
        ))}
      </View>
      <View style={gridStyle}>
        {cells.map((cell, index) => {
          if (!cell) {
            return <View key={`empty-${index}`} className="h-10" />;
          }
          const selected = cell === from || cell === to || (from && to && cell > from && cell < to);
          const isEdge = cell === from || cell === to;
          const isPast = cell < TODAY;
          return (
            <Pressable
              key={cell}
              accessibilityRole="button"
              accessibilityLabel={cell}
              disabled={isPast}
              onPress={() => onPick(cell)}
              className={cn(
                'h-10 items-center justify-center rounded-full',
                isPast && 'opacity-40',
                selected && !isEdge && 'rounded-none bg-muted',
                isEdge && 'bg-foreground',
                Platform.select({ web: !isPast && !selected ? 'hover:bg-muted' : undefined })
              )}>
              <Text
                variant="bodySm"
                className={isEdge ? 'font-bold text-background' : 'text-foreground'}>
                {Number(cell.slice(8, 10))}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
