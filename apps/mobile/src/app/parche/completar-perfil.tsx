import { router, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { BackBar } from '@/components/back-bar';
import { Field } from '@/components/field';
import { MediaPicker } from '@/components/media-picker';
import { PageHeader } from '@/components/page-header';
import { PhoneField, type PhoneFieldHandle } from '@/components/phone-field';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { userMessage } from '@/data/errors';
import { useAuthSnapshot } from '@/data/session';
import { toast } from '@/data/toast-store';
import { useRequireAuth } from '@/hooks/use-require-auth';

export default function CompleteProfileScreen() {
  const ok = useRequireAuth('/parche/completar-perfil');
  const { user } = useAuthSnapshot();
  const [name, setName] = useState(user?.displayName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const phoneFieldRef = useRef<PhoneFieldHandle>(null);

  useEffect(() => {
    setName(user?.displayName ?? '');
    setPhone(user?.phone ?? '');
  }, [user?.displayName, user?.phone]);

  if (!ok) {
    return null;
  }

  async function save() {
    if (busy) return;
    if (!phoneFieldRef.current?.validate()) return;
    setBusy(true);
    setError(null);
    try {
      await api.auth.updateMe({ displayName: name.trim() || undefined, phone: phone.trim() });
      toast('Perfil actualizado', 'success');
      router.back();
    } catch (err) {
      setError(userMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <BackBar />
      <PageHeader title="Completar perfil" lead="Opcional. Tu QR ya está listo." />
      <View className="mt-ds-24 max-w-xl gap-ds-16">
        <MediaPicker kind="avatar" onUploaded={() => void api.auth.me()} />
        <Field label="Nombre" value={name} onChangeText={setName} />
        <PhoneField ref={phoneFieldRef} label="Teléfono" value={phone} onChange={setPhone} />
        {error ? <Text>{error}</Text> : null}
        <Button disabled={busy} onPress={() => void save()}>
          <Text>{busy ? 'Guardando…' : 'Guardar'}</Text>
        </Button>
        <Button variant="ghost" onPress={() => router.replace('/tickets' as Href)}>
          <Text>Más tarde</Text>
        </Button>
      </View>
    </Screen>
  );
}
