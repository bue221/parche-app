import { Link, router, type Href } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Field } from '@/components/field';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { ApiError, userMessage } from '@/data/errors';
import { debugLog } from '@/data/log';
import { takePendingPath } from '@/data/session';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [profile, setProfile] = useState<'attendee' | 'promoter'>('attendee');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    if (busy) {
      return;
    }
    setBusy(true);
    setError(null);
    setFieldErrors({});
    try {
      await api.auth.register({
        email,
        password,
        displayName,
        initialProfile: profile,
      });
      const pending = takePendingPath();
      router.replace((pending ?? '/') as Href);
    } catch (err) {
      debugLog('auth', 'register failed');
      if (err instanceof ApiError && err.fieldErrors) {
        setFieldErrors(err.fieldErrors);
      }
      setError(userMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Text variant="heading">Crear cuenta</Text>
      <Text variant="muted" className="mt-ds-8">
        El perfil inicial no te hace staff de ningún evento.
      </Text>
      <View className="mt-ds-24 gap-ds-16">
        <Field label="Nombre" value={displayName} onChangeText={setDisplayName} error={fieldErrors.displayName} />
        <Field
          label="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          error={fieldErrors.email}
        />
        <Field
          label="Contraseña"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          error={fieldErrors.password}
        />
        <Text variant="caption" className="uppercase">
          Perfil inicial
        </Text>
        <View className="flex-row gap-ds-8">
          <Button variant={profile === 'attendee' ? 'default' : 'outline'} onPress={() => setProfile('attendee')}>
            <Text>Asistente</Text>
          </Button>
          <Button variant={profile === 'promoter' ? 'default' : 'outline'} onPress={() => setProfile('promoter')}>
            <Text>Organizador</Text>
          </Button>
        </View>
        {error ? <Text>{error}</Text> : null}
        <Button disabled={busy} onPress={() => void onSubmit()}>
          <Text>{busy ? 'Creando…' : 'Crear cuenta'}</Text>
        </Button>
        <Link href={'/auth/login' as Href}>
          <Text variant="small" className="font-bold uppercase">
            Ya tengo cuenta
          </Text>
        </Link>
      </View>
    </Screen>
  );
}
