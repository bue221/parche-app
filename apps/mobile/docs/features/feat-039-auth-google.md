# FEAT-039: Login con Google

Quien elige Google entra (o crea attendee) con un ID token. En iOS el botón se oculta hasta Sign in with Apple (guideline 4.8).

| Campo | Valor |
|-------|-------|
| Sprint | 4 |
| RC | RC-002 |
| Permiso UI | Público (Android + web de desarrollo) |
| Pantallas | Botón en `AuthSheet` |

## Quick path

1. Tap Google (si hay `EXPO_PUBLIC_GOOGLE_CLIENT_ID` y plataforma ≠ iOS).
2. `expo-auth-session` obtiene `id_token`.
3. `POST /v1/auth/oauth` `{ "provider": "google", "id_token" }`.
4. Sesión + sync [FEAT-037](feat-037-local-interest.md).

## Pantallas

Si falta client id, el botón no se renderiza. Cancelar el picker no muestra error agresivo.

## Flujo

Si el email ya tiene cuenta, se vincula `auth_identities`. Native build; no Expo Go.

## Contrato

`POST /v1/auth/oauth`. 401 si el token no verifica. Mismo `sessionBody` que login.

## Fuera de alcance

Apple. Facebook. Vincular Google desde ajustes de una sesión ya abierta (puede reusar el mismo endpoint más adelante).

## Checklist

- [ ] iOS no muestra Google.
- [ ] Android/web ocultan el botón sin env.
- [ ] id_token no se loguea.

## Relacionadas

[FEAT-038](feat-038-auth-otp.md)
