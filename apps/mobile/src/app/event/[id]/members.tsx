import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { BackBar } from '@/components/back-bar';
import { Field } from '@/components/field';
import { FormSection } from '@/components/form-section';
import { PageHeader } from '@/components/page-header';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { userMessage } from '@/data/errors';
import { useAuthSnapshot } from '@/data/session';
import { PendingAuth } from '@/components/feedback';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { statusLabel } from '@/lib/format';
import type { Membership, MembershipRole } from '@/data/types';

export default function EventMembersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ok = useRequireAuth(`/event/${id}/members`);
  const { user } = useAuthSnapshot();
  const [rows, setRows] = useState<Membership[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Exclude<MembershipRole, 'owner'>>('door');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRows(await api.members.list(id));
      setError(null);
    } catch (err) {
      setError(userMessage(err));
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!ok) {
    return <PendingAuth />;
  }
  if (user && !api.helpers.can(user.id, id, 'event.members.manage')) {
    return (
      <Screen>
        <Text>No puedes gestionar el equipo.</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <BackBar />
      <PageHeader title="Equipo" lead="Invita a quien cubre la puerta." />
      {rows.length === 0 ? <Text variant="muted">Invita a quien cubre la puerta</Text> : null}
      {rows.map((row) => (
        <View key={row.id} className="mt-ds-12 gap-ds-8">
          <Text>
            {row.email} · {row.role} · {statusLabel(row.status)}
          </Text>
          {row.inviteToken ? (
            <Text variant="helper" selectable>
              Link mock: parche://invites/{row.inviteToken}
            </Text>
          ) : null}
          {row.role !== 'owner' && row.status !== 'revoked' ? (
            <Button variant="outline" onPress={() => void api.members.revoke(id, row.id).then(load)}>
              <Text>Revocar</Text>
            </Button>
          ) : null}
        </View>
      ))}
      <FormSection title="Invitar" className="mt-ds-24">
        <Field label="Email" autoCapitalize="none" value={email} onChangeText={setEmail} />
        <View className="flex-row flex-wrap gap-ds-8">
          {(['manager', 'door', 'metrics'] as const).map((r) => (
            <Button key={r} variant={role === r ? 'default' : 'outline'} onPress={() => setRole(r)}>
              <Text>{r}</Text>
            </Button>
          ))}
        </View>
        {error ? (
          <Text variant="helper" className="text-foreground">
            {error}
          </Text>
        ) : null}
        <Button
          onPress={() => {
            void api.members
              .invite(id, email, role)
              .then(load)
              .catch((err) => setError(userMessage(err)));
          }}>
          <Text>Invitar</Text>
        </Button>
      </FormSection>
    </Screen>
  );
}
