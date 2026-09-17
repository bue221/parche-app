import {
  Calendar,
  CalendarDays,
  Cloud,
  Disc,
  Disc3,
  Factory,
  LayoutGrid,
  Mic2,
  Music2,
  Sun,
  Waves,
  type LucideIcon,
} from 'lucide-react-native';

import { Chip, ChipRow } from '@/components/chip-row';
import { FadeSlideIn } from '@/components/motion';
import { useFilters, type FilterScope } from '@/data/filters';
import { activeDateChip, DATE_CHIPS, datePreset } from '@/lib/explore-rails';
import { GENRE_CHIPS } from '@/lib/genres';

const DATE_ICONS: Record<(typeof DATE_CHIPS)[number]['id'], LucideIcon> = {
  hoy: Sun,
  finde: Calendar,
  mes: CalendarDays,
};

const GENRE_ICONS: Record<(typeof GENRE_CHIPS)[number], LucideIcon> = {
  techno: Disc3,
  industrial: Factory,
  house: Music2,
  trance: Waves,
  ambient: Cloud,
  club: Disc,
  concierto: Mic2,
};

export function ExploreChips({ scope }: { scope: FilterScope }) {
  const { filters, setFilters } = useFilters(scope);
  const selectedDate = activeDateChip(filters.from, filters.to);
  const todoSelected = !selectedDate && !filters.genre;

  return (
    <ChipRow>
      <FadeSlideIn index={0} className="shrink-0">
        <Chip
          label="Todo"
          icon={LayoutGrid}
          selected={todoSelected}
          onPress={() => setFilters({ ...filters, from: undefined, to: undefined, genre: undefined })}
        />
      </FadeSlideIn>
      {DATE_CHIPS.map((chip, index) => (
        <FadeSlideIn key={chip.id} index={index + 1} className="shrink-0">
          <Chip
            label={chip.label}
            icon={DATE_ICONS[chip.id]}
            selected={selectedDate === chip.id}
            onPress={() => {
              if (selectedDate === chip.id) {
                setFilters({ ...filters, from: undefined, to: undefined });
                return;
              }
              setFilters({ ...filters, ...datePreset(chip.id) });
            }}
          />
        </FadeSlideIn>
      ))}
      {GENRE_CHIPS.map((genre, index) => (
        <FadeSlideIn key={genre} index={index + DATE_CHIPS.length + 1} className="shrink-0">
          <Chip
            label={genre}
            icon={GENRE_ICONS[genre]}
            selected={filters.genre === genre}
            onPress={() => setFilters({ ...filters, genre: filters.genre === genre ? undefined : genre })}
          />
        </FadeSlideIn>
      ))}
    </ChipRow>
  );
}

