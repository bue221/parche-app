import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useState } from 'react';

import { BackBar } from '@/components/back-bar';
import { PageHeader } from '@/components/page-header';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { userMessage } from '@/data/errors';
import { PendingAuth } from '@/components/feedback';
import { useRequireAuth } from '@/hooks/use-require-auth';
import type { Membership, ParcheEvent } from '@/data/types';

export default function InviteAcceptScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const ok = useRequireAuth(`/invites/${token}`);
  const [payload, setPayload] = useState<{ event: ParcheEvent; membership: Membership } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api.members
      .getInvite(token)
      .then(setPayload)
      .catch((err) => setError(userMessage(err)));
  }, [token]);

  if (!ok) {
    return <PendingAuth />;
  }

  return (
    <Screen>
      <BackBar />
      <PageHeader title="Invitación" />
      {error ? <Text className="mt-ds-16">{error}</Text> : null}
      {payload ? (
        <>
          <Text className="mt-ds-16">
            {payload.event.name} · rol {payload.membership.role}
          </Text>
          {payload.membership.role === 'door' ? (
            <Text variant="muted">Verás scanner, no caja.</Text>
          ) : null}
          <Button
            className="mt-ds-16"
            onPress={() => {
              void api.members.acceptInvite(token).then(() => router.replace('/operate' as Href));
            }}>
            <Text>Aceptar</Text>
          </Button>
        </>
      ) : null}
    </Screen>
  );
}
