import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Field } from '@/components/field';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { userMessage } from '@/data/errors';
import { useAuthSnapshot } from '@/data/session';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { formatMoney } from '@/lib/format';
import type { TicketType } from '@/data/types';

export default function TicketTypesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ok = useRequireAuth(`/event/${id}/tickets`);
  const { user } = useAuthSnapshot();
  const [types, setTypes] = useState<TicketType[]>([]);
  const [name, setName] = useState('Early');
  const [price, setPrice] = useState('80000');
  const [capacity, setCapacity] = useState('100');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api.tickets.listTypes(id).then(setTypes);
  }, [id]);

  if (!ok) {
    return null;
  }
  if (user && !api.helpers.can(user.id, id, 'event.tickets.manage')) {
    return (
      <Screen>
        <Text>No puedes editar tipos.</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text variant="heading">Tipos de tiquete</Text>
      {types.map((type) => (
        <View key={type.id} className="mt-ds-12">
          <Text>
            {type.name} · {formatMoney(type.priceCents, type.currency)} · cupo {type.capacity} · vendidos {type.sold}
            {api.helpers.available(type) === 0 ? ' · SOLD OUT' : ''}
          </Text>
        </View>
      ))}
      <Field label="Nombre" value={name} onChangeText={setName} />
      <Field label="Precio (COP, enteros)" value={price} onChangeText={setPrice} keyboardType="numeric" />
      <Field label="Cupo" value={capacity} onChangeText={setCapacity} keyboardType="numeric" />
      {error ? <Text>{error}</Text> : null}
      <Button
        className="mt-ds-16"
        onPress={() => {
          void api.tickets
            .upsertType(id, {
              name,
              priceCents: Number(price) * 100,
              currency: 'COP',
              capacity: Number(capacity),
              salesFrom: new Date(Date.now() - 86400000).toISOString(),
              salesTo: new Date(Date.now() + 86400000 * 10).toISOString(),
            })
            .then(() => api.tickets.listTypes(id).then(setTypes))
            .catch((err) => setError(userMessage(err)));
        }}>
        <Text>Crear tipo</Text>
      </Button>
    </Screen>
  );
}
