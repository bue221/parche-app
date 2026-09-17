import { useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { router, type Href } from 'expo-router';
import { X } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/brand-mark';
import { Field } from '@/components/field';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { userMessage } from '@/data/errors';
import { debugLog } from '@/data/log';
import { syncLocalInterest } from '@/data/interest-sync';
import { useResolvedColorScheme, useTheme } from '@/hooks/use-theme';
import { THEME_VARS } from '@/lib/theme';
import { controlShadowStyle, controlTone, fieldChromeClassName } from '@/lib/control-chrome';
import { googleAuthEnabled, requestGoogleIdToken } from '@/lib/google-auth';

type Step = 'identity' | 'otp';

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
  const [step, setStep] = useState<Step>('identity');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [focused, setFocused] = useState(false);
  const google = googleAuthEnabled();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const scheme = useResolvedColorScheme();
  const tone = controlTone({ focused, error: Boolean(error) && step === 'identity' });
  const sheetTop = Platform.OS === 'ios' && !inline ? 8 : insets.top;

  function reset() {
    setStep('identity');
    setEmail('');
    setCode('');
    setError(null);
    setBusy(false);
    setFocused(false);
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
    const nextEmail = email.trim();
    if (!nextEmail) return;
    setBusy(true);
    setError(null);
    try {
      await api.auth.requestOtp(nextEmail);
      setEmail(nextEmail);
      setStep('otp');
    } catch (err) {
      debugLog('auth', 'otp request failed');
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
      debugLog('auth', 'otp verify failed');
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
      debugLog('auth', 'google sign-in failed');
      setError(userMessage(err) || 'No pudimos entrar con Google');
    } finally {
      setBusy(false);
    }
  }

  function openPasswordLogin() {
    close();
    router.push('/auth/login' as Href);
  }

  const form = (
    <View className="w-full max-w-md gap-ds-24 self-center px-ds-24 pb-ds-24">
      <View className="items-center gap-ds-16">
        <BrandMark size={56} onDark={scheme === 'dark'} />
        <Text variant="heading" className="text-center" style={{ fontSize: 26, lineHeight: 32 }}>
          {step === 'otp' ? 'Revisa tu correo' : 'Inicia sesión o regístrate'}
        </Text>
      </View>

      {step === 'identity' ? (
        <View className="gap-ds-16">
          <View className="gap-ds-8">
            <TextInput
              accessibilityLabel="Correo electrónico"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                if (error) setError(null);
              }}
              placeholder="Correo electrónico"
              placeholderTextColor={theme.textMuted}
              editable={!busy}
              returnKeyType="go"
              onSubmitEditing={() => void sendCode()}
              className={fieldChromeClassName(tone, 'min-h-14')}
              style={controlShadowStyle(tone)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
            />
            {error ? (
              <Text variant="helper" className="text-danger">
                {error}
              </Text>
            ) : null}
          </View>
          <Button disabled={busy || !email.trim()} onPress={() => void sendCode()}>
            <Text>{busy ? 'Enviando…' : 'Continuar'}</Text>
          </Button>
          {google ? (
            <>
              <View className="flex-row items-center gap-ds-12">
                <View className="h-px flex-1 bg-border" />
                <Text variant="muted">o</Text>
                <View className="h-px flex-1 bg-border" />
              </View>
              <View className="flex-row justify-center gap-ds-12">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={busy}
                  accessibilityLabel="Continuar con Google"
                  className="size-14"
                  onPress={() => void googleSignIn()}>
                  <GoogleMark />
                </Button>
              </View>
            </>
          ) : null}
          <Button variant="ghost" disabled={busy} onPress={openPasswordLogin}>
            <Text>Otras opciones</Text>
          </Button>
        </View>
      ) : (
        <View className="gap-ds-16">
          <Text variant="muted" className="text-center">
            Te enviamos un código de 6 dígitos a {email}.
          </Text>
          <Field
            label="Código"
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            value={code}
            onChangeText={(value) => {
              setCode(value);
              if (error) setError(null);
            }}
            placeholder="000000"
            maxLength={6}
            error={error ?? undefined}
          />
          <Button disabled={busy || code.trim().length !== 6} onPress={() => void verify()}>
            <Text>{busy ? 'Verificando…' : 'Verificar'}</Text>
          </Button>
          <Button
            variant="ghost"
            disabled={busy}
            onPress={() => {
              setStep('identity');
              setCode('');
              setError(null);
            }}>
            <Text>Cambiar email</Text>
          </Button>
        </View>
      )}
    </View>
  );

  const body = (
    <View
      className={inline || Platform.OS === 'web' ? 'absolute inset-0 z-[1800] bg-surface' : 'flex-1 bg-surface'}
      style={THEME_VARS[scheme]}>
      <View className="flex-1" style={{ paddingTop: sheetTop, paddingBottom: Math.max(insets.bottom, 16) }}>
        <View className="h-14 flex-row items-center justify-end px-ds-8">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar"
            hitSlop={8}
            onPress={close}
            className="size-11 items-center justify-center active:opacity-70">
            <X size={22} color={theme.text} strokeWidth={2} />
          </Pressable>
        </View>
        {Platform.OS === 'web' ? (
          <ScrollView
            style={{ flex: 1 }}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ flexGrow: 1, paddingTop: 48 }}
            showsVerticalScrollIndicator={false}>
            {form}
          </ScrollView>
        ) : (
          <KeyboardAwareScrollView
            style={{ flex: 1 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            contentContainerStyle={{ flexGrow: 1, paddingTop: 48 }}
            showsVerticalScrollIndicator={false}
            bottomOffset={24}>
            {form}
          </KeyboardAwareScrollView>
        )}
      </View>
    </View>
  );

  if (inline || Platform.OS === 'web') {
    if (!visible) return null;
    return body;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={close}>
      {body}
    </Modal>
  );
}

function GoogleMark({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" accessible={false}>
      <Path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.4-3.5z"
      />
      <Path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"
      />
      <Path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-1.7 13.5-4.7l-6.2-5.3C29.2 35.5 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <Path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.2-3.5 5.7-6.5 7.1l.1.1 6.2 5.3C36.6 41.6 44 36 44 24c0-1.3-.1-2.7-.4-3.5z"
      />
    </Svg>
  );
}
