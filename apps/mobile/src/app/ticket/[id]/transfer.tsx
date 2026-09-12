import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';

import { BackBar } from '@/components/back-bar';
import { Field } from '@/components/field';
import { PageHeader } from '@/components/page-header';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { userMessage } from '@/data/errors';
import { PendingAuth } from '@/components/feedback';
import { useRequireAuth } from '@/hooks/use-require-auth';
import type { User } from '@/data/types';

export default function TicketTransferScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ok = useRequireAuth(`/ticket/${id}/transfer`);
  const [q, setQ] = useState('');
  const [found, setFound] = useState<Omit<User, 'password'> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  if (!ok) {
    return <PendingAuth />;
  }

  return (
    <Screen>
      <BackBar />
      <PageHeader title="Ceder" lead="Solo a otra cuenta. El código viejo deja de valer." />
      <Field label="Email o id" autoCapitalize="none" value={q} onChangeText={setQ} />
      <Button
        className="mt-ds-16"
        variant="outline"
        onPress={() => {
          void api.tickets.lookupUser(q).then((user) => {
            setFound(user);
            setError(user ? null : 'Esa cuenta no existe en Parche');
          });
        }}>
        <Text>Buscar</Text>
      </Button>
      {found ? (
        <>
          <Text className="mt-ds-16">
            {found.displayName} · {found.email}
          </Text>
          {!confirming ? (
            <Button className="mt-ds-8" onPress={() => setConfirming(true)}>
              <Text>Ceder a esta persona</Text>
            </Button>
          ) : (
            <Button
              className="mt-ds-8"
              variant="confirm"
              onPress={() => {
                void api.tickets
                  .transfer(id, found.id)
                  .then(() => router.replace('/tickets' as Href))
                  .catch((err) => setError(userMessage(err)));
              }}>
              <Text>Confirmar cesión</Text>
            </Button>
          )}
        </>
      ) : null}
      {error ? <Text className="mt-ds-8">{error}</Text> : null}
    </Screen>
  );
}
