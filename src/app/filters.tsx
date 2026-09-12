import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { BackBar } from '@/components/back-bar';
import { Chip, ChipWrap } from '@/components/chip-row';
import { DateField } from '@/components/date-field';
import { Field } from '@/components/field';
import { PageHeader } from '@/components/page-header';
import { Screen } from '@/components/screen';
import { StickyCta } from '@/components/sticky-cta';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useFilters } from '@/data/filters';
import {
  endOfDayISO,
  fromDateInput,
  monthRange,
  startOfDayISO,
  toDateInput,
  weekendRange,
} from '@/lib/format';
import { GENRE_CHIPS } from '@/lib/genres';

export default function FiltersScreen() {
  const current = useFilters((s) => s.filters);
  const setFilters = useFilters((s) => s.setFilters);
  const [q, setQ] = useState(current.q ?? '');
  const [genre, setGenre] = useState(current.genre ?? '');
  const [from, setFrom] = useState(toDateInput(current.from));
  const [to, setTo] = useState(toDateInput(current.to));

  function apply() {
    setFilters({
      q: q || undefined,
      genre: genre || undefined,
      from: fromDateInput(from),
      to: fromDateInput(to, true),
    });
    router.back();
  }

  return (
    <Screen
      footer={
        <StickyCta>
          <View className="gap-ds-8">
            <Button onPress={() => apply()}>
              <Text>Ver fechas</Text>
            </Button>
            <Button
              variant="outline"
              onPress={() => {
                setFilters({});
                router.replace('/' as Href);
              }}>
              <Text>Limpiar</Text>
            </Button>
          </View>
        </StickyCta>
      }>
      <BackBar />
      <PageHeader title="Filtros" lead="Nombre, barrio, género o día." />
      <View className="mt-ds-24 gap-ds-24">
        <Field label="Buscar" value={q} onChangeText={setQ} placeholder="Nombre, venue, barrio…" />

        <View className="gap-ds-8">
          <Text variant="caption" className="uppercase">
            Cuándo
          </Text>
          <ChipWrap>
            <Chip
              label="Hoy"
              selected={false}
              onPress={() => {
                const today = toDateInput(startOfDayISO());
                setFrom(today);
                setTo(toDateInput(endOfDayISO()));
              }}
            />
            <Chip
              label="Fin de semana"
              selected={false}
              onPress={() => {
                const range = weekendRange();
                setFrom(toDateInput(range.from));
                setTo(toDateInput(range.to));
              }}
            />
            <Chip
              label="Este mes"
              selected={false}
              onPress={() => {
                const range = monthRange();
                setFrom(toDateInput(range.from));
                setTo(toDateInput(range.to));
              }}
            />
          </ChipWrap>
          <View className="flex-row flex-wrap gap-ds-16">
            <View className="min-w-[180px] flex-1">
              <DateField label="Desde" value={from} onChange={setFrom} />
            </View>
            <View className="min-w-[180px] flex-1">
              <DateField label="Hasta" value={to} onChange={setTo} />
            </View>
          </View>
        </View>

        <View className="gap-ds-8">
          <Text variant="caption" className="uppercase">
            Género
          </Text>
          <ChipWrap>
            {GENRE_CHIPS.map((item) => (
              <Chip
                key={item}
                label={item}
                selected={genre === item}
                onPress={() => setGenre((currentGenre) => (currentGenre === item ? '' : item))}
              />
            ))}
          </ChipWrap>
        </View>
      </View>
    </Screen>
  );
}
