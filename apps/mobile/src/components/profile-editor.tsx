import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { Field } from '@/components/field';
import { MediaPicker } from '@/components/media-picker';
import { PhoneField, type PhoneFieldHandle } from '@/components/phone-field';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { userMessage } from '@/data/errors';
import { useAuthSnapshot } from '@/data/session';
import { toast } from '@/data/toast-store';

export function ProfileEditor({
  saveLabel = 'Guardar',
  onSaved,
}: {
  saveLabel?: string;
  onSaved: () => void;
}) {
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

  async function save() {
    if (busy) return;
    if (!phoneFieldRef.current?.validate()) return;
    setBusy(true);
    setError(null);
    try {
      await api.auth.updateMe({ displayName: name.trim() || undefined, phone: phone.trim() });
      toast('Perfil guardado', 'success');
      onSaved();
    } catch (err) {
      const message = userMessage(err);
      setError(message);
      toast(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="max-w-xl gap-ds-16">
      <MediaPicker
        kind="avatar"
        previewUri={user?.avatarUrl}
        fallbackLabel={user?.displayName}
        onUploaded={() => {
          void api.auth.me();
        }}
      />
      <Field label="Nombre" value={name} onChangeText={setName} />
      <PhoneField ref={phoneFieldRef} label="Teléfono" value={phone} onChange={setPhone} />
      {error ? <Text>{error}</Text> : null}
      <Button disabled={busy} onPress={() => void save()}>
        <Text>{busy ? 'Guardando…' : saveLabel}</Text>
      </Button>
    </View>
  );
}
