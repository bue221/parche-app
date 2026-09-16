# F28 Auth OTP (passwordless)

Un asistente entra o se crea con email + código de 6 dígitos. No hay order anónimo: verify emite la misma sesión que login.

**Depends on:** F04, F26  
**Unlocks:** checkout sin registro largo  
**Stories:** RC-001, RC-002

## Quick path

1. `password_hash` nullable. OTP no inventa una clave.
2. `POST /v1/auth/otp/request` siempre 204. Mail `auth_otp`.
3. `POST /v1/auth/otp/verify` crea attendee (display_name del local-part) o entra.
4. Código hasheado, TTL 10 min, rate limit por email.

## HTTP

### `POST /v1/auth/otp/request`

```json
{ "email": "a@b.co" }
```

204 siempre si el email es válido (o 204 también si es inválido, tras validación mínima). No enumerar.

### `POST /v1/auth/otp/verify`

```json
{ "email": "a@b.co", "code": "123456" }
```

200/201 session body F04. 401 genérico si el código no sirve.

## Datos

`auth_otp_challenges`: email, code_hash, expires_at, attempts, created_at.

## Seguridad

- Nunca loguear el código plano.
- Login password de users con hash null → 401 genérico (mismo mensaje).
- Máx. 5 intentos por challenge.

## Checklist

- [ ] Request 204 no revela si el user existe
- [ ] Verify crea attendee sin password
- [ ] Tests de verify y password null

## Next step

[F29 Google](F29-auth-google.md)
