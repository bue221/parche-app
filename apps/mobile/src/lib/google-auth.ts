import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

const CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '';

export function googleAuthEnabled(): boolean {
  return Boolean(CLIENT_ID) && Platform.OS !== 'ios';
}

export async function requestGoogleIdToken(): Promise<string | null> {
  if (!googleAuthEnabled()) {
    return null;
  }
  const redirectUri = AuthSession.makeRedirectUri();
  const discovery = await AuthSession.fetchDiscoveryAsync('https://accounts.google.com');
  const request = new AuthSession.AuthRequest({
    clientId: CLIENT_ID,
    redirectUri,
    responseType: AuthSession.ResponseType.IdToken,
    scopes: ['openid', 'email', 'profile'],
    extraParams: { nonce: String(Date.now()) },
  });
  const result = await request.promptAsync(discovery);
  if (result.type !== 'success') {
    return null;
  }
  const token = result.params.id_token;
  return token || null;
}
