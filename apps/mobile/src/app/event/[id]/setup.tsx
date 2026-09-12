import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

import { BackBar } from '@/components/back-bar';
import { EventSetupChecklist } from '@/components/event-setup-checklist';
import { LoadError, PendingAuth, Skeleton } from '@/components/feedback';
import { PageHeader } from '@/components/page-header';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { userMessage } from '@/data/errors';
import { useAuthSnapshot } from '@/data/session';
import { listingGaps } from '@/lib/listing-setup';
import { useRequireAuth } from '@/hooks/use-require-auth';

export default function EventSetupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ok = useRequireAuth(`/event/${id}/setup`);
  const { user } = useAuthSnapshot();
  const canWrite = user ? api.helpers.can(user.id, id, 'event.write') : false;
  const query = useQuery({
    queryKey: ['event', id],
    queryFn: () => api.events.get(id),
    enabled: Boolean(id) && ok,
  });

  useEffect(() => {
    if (ok && user && !canWrite) {
      router.replace(`/event/${id}` as Href);
    }
  }, [ok, user, canWrite, id]);

  if (!ok) {
    return <PendingAuth />;
  }
  if (user && !canWrite) {
    return <PendingAuth />;
  }
  if (query.error && !query.data) {
    return <LoadError message={userMessage(query.error)} onRetry={() => void query.refetch()} />;
  }
  if (!query.data) {
    return (
      <Screen back>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-ds-16 h-32 w-full" />
      </Screen>
    );
  }

  const remaining = listingGaps(query.data).length;

  return (
    <Screen>
      <BackBar />
      <PageHeader
        title="Termina el listing"
        lead={remaining ? `Faltan ${remaining} para publicarlo con calma.` : 'Flyer, pin, boleta y lineup listos.'}
      />
      <View className="mt-ds-16">
        <EventSetupChecklist event={query.data} />
      </View>
      <Button className="mt-ds-24" variant="outline" onPress={() => router.replace('/operate' as Href)}>
        <Text>Ir a Operar</Text>
      </Button>
    </Screen>
  );
}
