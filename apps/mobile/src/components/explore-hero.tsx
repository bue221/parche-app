import {
  AudioWaveform,
  Building2,
  CalendarDays,
  Disc3,
  House,
  Radio,
  Search,
  Sparkles,
  Ticket,
  Waves,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, TextInput, View } from 'react-native';

import { CategoryChip, ChipRow } from '@/components/chip-row';
import { ExploreDatePicker } from '@/components/explore-date-picker';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useFilters } from '@/data/filters';
import { useTheme } from '@/hooks/use-theme';
import { controlShadowStyle } from '@/lib/control-chrome';
import { formatDateRangeLabel } from '@/lib/explore-dates';
import { GENRE_CHIPS } from '@/lib/genres';
import { cn } from '@/lib/utils';

export const GENRE_ICONS: Record<(typeof GENRE_CHIPS)[number], LucideIcon> = {
  techno: Disc3,
  industrial: Building2,
  house: House,
  trance: Waves,
  ambient: Sparkles,
  club: Radio,
  concierto: Ticket,
};

export function ExploreDesktopHero({
  resultCount,
  filtered,
  isPromoter,
  onCreateEvent,
}: {
  resultCount: number;
  filtered: boolean;
  isPromoter: boolean;
  onCreateEvent: () => void;
}) {
  const theme = useTheme();
  const { filters, setFilters } = useFilters('agenda');
  const storeQ = filters.q ?? '';
  const [draftQ, setDraftQ] = useState(storeQ);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const calendarRef = useRef<View>(null);
  const hasDates = Boolean(filters.from || filters.to);
  const dateLabel = formatDateRangeLabel(filters.from, filters.to);
  const allSelected = !filters.genre;
  const countLabel = resultCount === 1 ? '1 evento' : `${resultCount} eventos`;

  useEffect(() => {
    setDraftQ(storeQ);
  }, [storeQ]);

  useEffect(() => {
    const q = draftQ.trim() || undefined;
    if (q === (filters.q || undefined)) return;
    const id = setTimeout(() => {
      setFilters({ ...filters, q });
    }, 320);
    return () => clearTimeout(id);
  }, [draftQ, filters, setFilters]);

  useEffect(() => {
    if (!calendarOpen || Platform.OS !== 'web' || typeof document === 'undefined') return;
    const onPointer = (event: MouseEvent) => {
      const node = calendarRef.current as unknown as { contains?: (n: Node) => boolean } | null;
      if (node?.contains && event.target instanceof Node && !node.contains(event.target)) {
        setCalendarOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setCalendarOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [calendarOpen]);

  return (
    <View className="w-full flex-col gap-ds-12 overflow-visible">
      <View
        className={cn(
          'relative w-full flex-row flex-nowrap items-center gap-ds-12',
          calendarOpen ? 'z-50' : 'z-0'
        )}>
        <View ref={calendarRef} className="relative min-w-0 flex-1 overflow-visible">
          <View
            className="h-14 w-full flex-row items-stretch overflow-hidden rounded-full border border-border bg-surface shadow-control"
            style={controlShadowStyle('idle')}>
            <View className="min-w-0 flex-1 flex-row items-center gap-ds-8 px-ds-16 py-ds-8">
              <Search size={15} color={theme.text} />
              <View className="min-w-0 flex-1">
                <Text variant="caption" className="text-[10px]">
                  Buscar
                </Text>
                <TextInput
                  value={draftQ}
                  onChangeText={setDraftQ}
                  placeholder="Eventos, venues…"
                  placeholderTextColor={theme.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="search"
                  accessibilityLabel="Buscar eventos"
                  className="min-h-5 w-full font-favorit text-body-sm tracking-normal text-foreground"
                  {...Platform.select({
                    web: { outlineStyle: 'none', paddingTop: 0, paddingBottom: 0 } as object,
                  })}
                  onSubmitEditing={() => {
                    const q = draftQ.trim() || undefined;
                    setFilters({ ...filters, q });
                  }}
                />
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fechas"
              accessibilityState={{ expanded: calendarOpen }}
              onPress={() => setCalendarOpen((open) => !open)}
              className={cn(
                'shrink-0 flex-row items-center gap-ds-8 border-l border-border px-ds-16 py-ds-8',
                hasDates && 'bg-muted',
                Platform.select({ web: 'hover:bg-muted' })
              )}>
              <CalendarDays size={15} color={theme.text} />
              <View className="min-w-0">
                <Text variant="caption" className="text-[10px]">
                  Fechas
                </Text>
                <Text
                  variant="bodySm"
                  className={hasDates ? 'text-foreground' : 'text-muted-foreground'}
                  numberOfLines={1}>
                  {hasDates ? dateLabel : 'Cualquier fecha'}
                </Text>
              </View>
              {hasDates ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Limpiar fechas"
                  onPress={() => setFilters({ ...filters, from: undefined, to: undefined })}
                  className="size-6 items-center justify-center rounded-full bg-muted">
                  <X size={12} color={theme.text} />
                </Pressable>
              ) : null}
            </Pressable>
          </View>
          {calendarOpen ? (
            <View
              pointerEvents="box-none"
              className="absolute right-0 top-full z-50 pt-ds-12"
              style={{ zIndex: 50 }}>
              <ExploreDatePicker
                from={filters.from}
                to={filters.to}
                onApply={(range) => setFilters({ ...filters, from: range.from, to: range.to })}
                onClose={() => setCalendarOpen(false)}
              />
            </View>
          ) : null}
        </View>

        <Text variant="muted" className="shrink-0">
          {countLabel}
          {filtered ? ' · filtrado' : ' en Bogotá'}
        </Text>
      </View>

      {isPromoter ? (
        <Button size="sm" onPress={onCreateEvent}>
          <Text>Crear evento</Text>
        </Button>
      ) : null}

      <View className="z-0 w-full" pointerEvents={calendarOpen ? 'none' : 'auto'}>
        <ChipRow align="end">
          <CategoryChip
            label="Todo"
            icon={AudioWaveform}
            selected={allSelected}
            onPress={() => setFilters({ ...filters, genre: undefined })}
          />
          {GENRE_CHIPS.map((genre) => (
            <CategoryChip
              key={genre}
              label={genre}
              icon={GENRE_ICONS[genre]}
              selected={filters.genre === genre}
              onPress={() =>
                setFilters({ ...filters, genre: filters.genre === genre ? undefined : genre })
              }
            />
          ))}
        </ChipRow>
      </View>
    </View>
  );
}
