# F29 Auth Google

ID token de Google crea o entra un attendee y deja una fila en `auth_identities`. Apple queda fuera.

**Depends on:** F04, F28  
**Unlocks:** botón Google en la app (Android/web)  
**Stories:** RC-002

## Quick path

1. Tabla `auth_identities (user_id, provider, subject)`.
2. `POST /v1/auth/oauth` `{ "provider": "google", "id_token" }`.
3. Verificar `aud` = `GOOGLE_OAUTH_CLIENT_ID`, `email_verified`, `iss`.
4. Email existente: vincular identidad. Nuevo: attendee passwordless.

## HTTP

200 session body F04. 401 si el token no verifica. `provider` distinto de `google` → 400.

## Seguridad

- No loguear id_token.
- Client id por env. Si falta, el endpoint responde 503 o 400 `VALIDATION_ERROR` en `id_token`.

## Checklist

- [ ] Verifier fake en tests
- [ ] Link a user existente por email
- [ ] User nuevo sin password_hash

## Next step

[F30](F30-event-saves.md)
