import { router, type Href } from 'expo-router';
import { useState } from 'react';

import { Field } from '@/components/field';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useMockStore } from '@/data/mock/store';

export default function FiltersScreen() {
  const current = useMockStore((s) => s.filters);
  const [q, setQ] = useState(current.q ?? '');
  const [genre, setGenre] = useState(current.genre ?? '');
  const [from, setFrom] = useState(current.from ?? '');
  const [to, setTo] = useState(current.to ?? '');
  const [artistId, setArtistId] = useState(current.artistId ?? '');

  return (
    <Screen>
      <Text variant="heading">Filtros</Text>
      <Field label="Texto" value={q} onChangeText={setQ} />
      <Field label="Género" value={genre} onChangeText={setGenre} placeholder="techno" />
      <Field label="Desde (ISO)" value={from} onChangeText={setFrom} />
      <Field label="Hasta (ISO)" value={to} onChangeText={setTo} />
      <Field label="Artist id" value={artistId} onChangeText={setArtistId} />
      <Button
        className="mt-ds-16"
        onPress={() => {
          useMockStore.getState().setFilters({
            q: q || undefined,
            genre: genre || undefined,
            from: from || undefined,
            to: to || undefined,
            artistId: artistId || undefined,
          });
          router.back();
        }}>
        <Text>Aplicar</Text>
      </Button>
      <Button
        variant="outline"
        className="mt-ds-8"
        onPress={() => {
          useMockStore.getState().setFilters({});
          router.replace('/' as Href);
        }}>
        <Text>Limpiar</Text>
      </Button>
    </Screen>
  );
}
