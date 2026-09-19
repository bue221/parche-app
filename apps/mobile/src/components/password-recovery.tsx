import { useState } from 'react';
import { View } from 'react-native';
import { router, type Href } from 'expo-router';

import { Field } from '@/components/field';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { userMessage } from '@/data/errors';
import { revokeLocalSession } from '@/data/http';
import { toast } from '@/data/toast-store';
import { passwordIssue } from '@/lib/password';

export function PasswordResetRequest({
  initialEmail = '',
  emailLocked = false,
}: {
  initialEmail?: string;
  emailLocked?: boolean;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (busy) return;
    const next = email.trim().toLowerCase();
    if (!next.includes('@')) {
      setError('Revisa el email');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.auth.requestPasswordReset(next);
      setSent(true);
      toast('Revisa tu correo', 'success');
    } catch (err) {
      const message = userMessage(err);
      setError(message);
      toast(message);
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <View className="gap-ds-16">
        <Text variant="headingSm">Revisa tu correo</Text>
        <Text variant="muted">
          Si hay una cuenta con ese email, te llega un enlace de un solo uso. Caduca en 30 minutos.
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-ds-16">
      <Field
        label="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={emailLocked ? undefined : setEmail}
        editable={!emailLocked}
        helper={emailLocked ? 'El enlace llega a este correo.' : undefined}
        placeholder="tu@correo.com"
      />
      {error ? <Text className="rounded-cards border border-foreground px-ds-12 py-ds-8">{error}</Text> : null}
      <Button disabled={busy} onPress={() => void submit()}>
        <Text>{busy ? 'Enviando…' : 'Enviar enlace'}</Text>
      </Button>
    </View>
  );
}

export function PasswordResetConfirm({ token }: { token: string }) {
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (busy) return;
    const issue = passwordIssue(password);
    if (issue) {
      setError(issue);
      return;
    }
    if (password !== repeat) {
      setError('Las claves no coinciden.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.auth.resetPassword(token, password);
      await revokeLocalSession();
      toast('Clave actualizada. Entra de nuevo.', 'success');
      router.replace('/auth/login' as Href);
    } catch (err) {
      const message = userMessage(err);
      setError(message);
      toast(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="gap-ds-16">
      <Field
        label="Nueva contraseña"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        helper="Mínimo 10 caracteres, no solo números."
      />
      <Field label="Repite la contraseña" secureTextEntry value={repeat} onChangeText={setRepeat} />
      {error ? <Text className="rounded-cards border border-foreground px-ds-12 py-ds-8">{error}</Text> : null}
      <Button disabled={busy} onPress={() => void submit()}>
        <Text>{busy ? 'Guardando…' : 'Guardar clave'}</Text>
      </Button>
    </View>
  );
}
