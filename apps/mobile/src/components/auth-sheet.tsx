import { useState } from 'react';
import { View } from 'react-native';
import { router, type Href } from 'expo-router';

import { BottomSheet } from '@/components/bottom-sheet';
import { Field } from '@/components/field';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { userMessage } from '@/data/errors';
import { syncLocalInterest } from '@/data/interest-sync';
import { googleAuthEnabled, requestGoogleIdToken } from '@/lib/google-auth';

type Step = 'method' | 'email' | 'otp';

export function AuthSheet({
  visible,
  onClose,
  onSuccess,
  inline = false,
}: {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  inline?: boolean;
}) {
  const [step, setStep] = useState<Step>('method');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const google = googleAuthEnabled();

  function reset() {
    setStep('method');
    setEmail('');
    setCode('');
    setError(null);
    setBusy(false);
  }

  function close() {
    reset();
    onClose();
  }

  async function finish() {
    await syncLocalInterest();
    reset();
    onSuccess?.();
    onClose();
  }

  async function sendCode() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.auth.requestOtp(email);
      setStep('otp');
    } catch (err) {
      setError(userMessage(err) || 'No pudimos enviar el código');
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.auth.verifyOtp(email, code);
      await finish();
    } catch (err) {
      setError(userMessage(err) || 'No pudimos verificar el código');
    } finally {
      setBusy(false);
    }
  }

  async function googleSignIn() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const token = await requestGoogleIdToken();
      if (!token) {
        return;
      }
      await api.auth.oauthGoogle(token);
      await finish();
    } catch (err) {
      setError(userMessage(err) || 'No pudimos entrar con Google');
    } finally {
      setBusy(false);
    }
  }

  return (
    <BottomSheet visible={visible} onClose={close} title="Entra para continuar" inline={inline}>
      <View className="gap-ds-12 pb-ds-8">
        {step === 'method' ? (
          <>
            <Text variant="muted">Guarda boletas y sigue artistas. En la compra solo pedimos tu email.</Text>
            {google ? (
              <Button disabled={busy} onPress={() => void googleSignIn()}>
                <Text>{busy ? 'Entrando…' : 'Continuar con Google'}</Text>
              </Button>
            ) : null}
            <Button variant={google ? 'outline' : 'default'} disabled={busy} onPress={() => setStep('email')}>
              <Text>Continuar con email</Text>
            </Button>
            <Button
              variant="ghost"
              onPress={() => {
                close();
                router.push('/auth/login' as Href);
              }}>
              <Text>Otras opciones</Text>
            </Button>
          </>
        ) : null}
        {step === 'email' ? (
          <>
            <Field
              label="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              placeholder="tu@correo.com"
            />
            {error ? <Text>{error}</Text> : null}
            <Button disabled={busy || !email.trim()} onPress={() => void sendCode()}>
              <Text>{busy ? 'Enviando…' : 'Enviar código'}</Text>
            </Button>
            <Button variant="ghost" onPress={() => setStep('method')}>
              <Text>Atrás</Text>
            </Button>
          </>
        ) : null}
        {step === 'otp' ? (
          <>
            <Text variant="muted">Te enviamos un código de 6 dígitos a {email}.</Text>
            <Field
              label="Código"
              keyboardType="number-pad"
              value={code}
              onChangeText={setCode}
              placeholder="000000"
              maxLength={6}
            />
            {error ? <Text>{error}</Text> : null}
            <Button disabled={busy || code.trim().length !== 6} onPress={() => void verify()}>
              <Text>{busy ? 'Verificando…' : 'Verificar'}</Text>
            </Button>
            <Button variant="ghost" onPress={() => setStep('email')}>
              <Text>Cambiar email</Text>
            </Button>
          </>
        ) : null}
      </View>
    </BottomSheet>
  );
}
