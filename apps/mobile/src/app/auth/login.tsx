import { Link, router, type Href } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AuthSplit } from '@/components/auth-split';
import { Field } from '@/components/field';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '@/data/env';
import { userMessage } from '@/data/errors';
import { toast } from '@/data/toast-store';
import { debugLog } from '@/data/log';
import { takePendingPath } from '@/data/session';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(__DEV__ ? DEMO_PASSWORD : '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.auth.login(email, password);
      const pending = takePendingPath();
      router.replace((pending ?? '/') as Href);
    } catch (err) {
      debugLog('auth', 'login failed');
      setError(userMessage(err) || 'No pudimos entrar');
      toast(userMessage(err) || 'No pudimos entrar');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthSplit title={'Entra\nal parche'} lead="Compra, sigue artistas u opera una fecha.">
      <Text variant="headingSm">Entrar</Text>
      <Field
        label="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        placeholder="tu@correo.com"
      />
      <Field label="Contraseña" secureTextEntry value={password} onChangeText={setPassword} />
      {error ? <Text className="rounded-cards border border-foreground px-ds-12 py-ds-8">{error}</Text> : null}
      <Button disabled={busy} onPress={() => void onSubmit()}>
        <Text>{busy ? 'Entrando…' : 'Entrar'}</Text>
      </Button>
      <Link href={'/auth/register' as Href}>
        <Text variant="small" className="font-bold uppercase">
          Crear cuenta
        </Text>
      </Link>
      {__DEV__ ? (
        <>
          <Text variant="helper">Demo · {DEMO_PASSWORD}</Text>
          <View className="flex-row flex-wrap gap-ds-8">
            {DEMO_ACCOUNTS.map((demo) => (
              <Button key={demo.email} variant="outline" size="sm" onPress={() => setEmail(demo.email)}>
                <Text>{demo.label}</Text>
              </Button>
            ))}
          </View>
        </>
      ) : null}
    </AuthSplit>
  );
}
