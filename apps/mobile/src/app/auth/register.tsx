import { Link, router, type Href } from 'expo-router';
import { useRef, useState } from 'react';
import { View } from 'react-native';

import { AuthSplit } from '@/components/auth-split';
import { Field } from '@/components/field';
import { PhoneField, type PhoneFieldHandle } from '@/components/phone-field';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { ApiError, userMessage } from '@/data/errors';
import { toast } from '@/data/toast-store';
import { debugLog } from '@/data/log';
import { takePendingPath } from '@/data/session';
import { syncLocalInterest } from '@/data/interest-sync';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [profile, setProfile] = useState<'attendee' | 'promoter'>('attendee');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const phoneFieldRef = useRef<PhoneFieldHandle>(null);

  async function onSubmit() {
    if (busy) return;
    if (!phoneFieldRef.current?.validate()) return;
    setBusy(true);
    setError(null);
    setFieldErrors({});
    try {
      await api.auth.register({ email, password, displayName, phone, initialProfile: profile });
      await syncLocalInterest();
      const pending = takePendingPath();
      router.replace((pending ?? '/') as Href);
    } catch (err) {
      debugLog('auth', 'register failed');
      if (err instanceof ApiError && err.fieldErrors) {
        setFieldErrors(err.fieldErrors);
      }
      setError(userMessage(err) || 'No pudimos crear la cuenta');
      toast(userMessage(err) || 'No pudimos crear la cuenta');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthSplit
      title={'Crea\ntu cuenta'}
      lead="El perfil inicial no te hace staff. Después te invitan a una fecha.">
      <Text variant="headingSm">Registro</Text>
      <Field label="Nombre" value={displayName} onChangeText={setDisplayName} error={fieldErrors.displayName} />
      <PhoneField
        ref={phoneFieldRef}
        label="Teléfono"
        value={phone}
        onChange={setPhone}
        error={fieldErrors.phone}
      />
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
      <View className="flex-row flex-wrap gap-ds-8">
        <Button variant={profile === 'attendee' ? 'default' : 'outline'} onPress={() => setProfile('attendee')}>
          <Text>Asistente</Text>
        </Button>
        <Button variant={profile === 'promoter' ? 'default' : 'outline'} onPress={() => setProfile('promoter')}>
          <Text>Organizador</Text>
        </Button>
      </View>
      {error ? <Text className="rounded-cards border border-foreground px-ds-12 py-ds-8">{error}</Text> : null}
      <Button disabled={busy} onPress={() => void onSubmit()}>
        <Text>{busy ? 'Creando…' : 'Crear cuenta'}</Text>
      </Button>
      <Link href={'/auth/login' as Href}>
        <Text variant="small" className="font-bold uppercase">
          Ya tengo cuenta
        </Text>
      </Link>
    </AuthSplit>
  );
}
