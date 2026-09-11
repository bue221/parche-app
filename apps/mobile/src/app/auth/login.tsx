import { Link, router, type Href } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Field } from '@/components/field';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { userMessage } from '@/data/errors';
import { debugLog } from '@/data/log';
import { DEMO_PASSWORD } from '@/data/mock/seed';
import { takePendingPath } from '@/data/session';

const DEMOS = [
  { email: 'ata@parche.test', label: 'Asistente' },
  { email: 'promoter@parche.test', label: 'Organizador' },
  { email: 'door@parche.test', label: 'Puerta' },
  { email: 'metrics@parche.test', label: 'Métricas' },
  { email: 'admin@parche.test', label: 'Admin' },
  { email: 'luna@parche.test', label: 'Artista' },
];

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    if (busy) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.auth.login(email, password);
      const pending = takePendingPath();
      router.replace((pending ?? '/') as Href);
    } catch (err) {
      debugLog('auth', 'login failed');
      setError(userMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Text variant="heading">Entrar</Text>
      <View className="mt-ds-24 gap-ds-16">
        <Field label="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <Field label="Contraseña" secureTextEntry value={password} onChangeText={setPassword} />
        {error ? <Text>{error}</Text> : null}
        <Button disabled={busy} onPress={() => void onSubmit()}>
          <Text>{busy ? 'Entrando…' : 'Entrar'}</Text>
        </Button>
        <Link href={'/auth/register' as Href}>
          <Text variant="small" className="font-bold uppercase">
            Crear cuenta
          </Text>
        </Link>
        <Text variant="helper">Cuentas de demo (clave: {DEMO_PASSWORD})</Text>
        <View className="flex-row flex-wrap gap-ds-8">
          {DEMOS.map((demo) => (
            <Button key={demo.email} variant="outline" size="sm" onPress={() => setEmail(demo.email)}>
              <Text>{demo.label}</Text>
            </Button>
          ))}
        </View>
      </View>
    </Screen>
  );
}
