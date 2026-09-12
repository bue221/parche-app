# F04 Auth y sesión

El usuario se registra, entra y permanece con **access JWT corto** y **refresh rotativo**. Los permisos de evento **no** van en el JWT: se resuelven por ruta (F11).

**Depends on:** F02, F06 (tenant/perfil al registrar promoter; se puede stubear tenant en el mismo PR)  
**Unlocks:** todo lo autenticado; F05  
**Stories:** RC-001, RC-002

## Quick path

1. Tablas `users`, `refresh_tokens`.
2. Register + login + refresh + logout + `GET /v1/me`.
3. Access 10–15 min; refresh 14 días; hash SHA-256 (o Argon2id) del refresh en DB, **nunca** el valor plano.
4. Reuso de refresh rotado → revocar familia.

## HTTP

### `POST /v1/auth/register`

```json
{
  "email": "a@b.co",
  "password": "mín 10 chars, no solo numérico",
  "display_name": "…",
  "profile": "attendee" | "promoter"
}
```

- Email normalizado (trim, lower). Único.
- Password: Argon2id. Nunca log.
- `attendee`: sin tenant.
- `promoter`: crea `tenants` (F06) y perfil promoter + attendee (puede comprar).
- 201: mismos tokens que login + user público.
- 409 `CONFLICT` si email existe. Mensaje: “No se pudo registrar” **igual** que otros fallos de negocio para no enumerar? Decisión: 409 con “Ese correo ya está registrado” es UX peor para enumeración. Usar **mismo mensaje genérico** que login fallido en 400/401, y 201 solo si ok. Implementación: 409 interno logueado; cliente ve `CONFLICT` + “No se pudo completar el registro”. Preferir no revelar: entonces 201 nunca, 400 genérico. **Decisión de producto:** 409 explícito (“Ese correo ya tiene cuenta”) porque es app de comunidad y el login genérico ya cubre enumeración en `/login`. Register sí puede ser explícito.

### `POST /v1/auth/login`

```json
{ "email": "…", "password": "…" }
```

Fallo: 401 `UNAUTHORIZED` “Correo o contraseña incorrectos” (siempre el mismo). Rate limit F02. User `disabled` → 403 `FORBIDDEN`.

200:

```json
{
  "access_token": "<jwt>",
  "access_expires_at": "…",
  "refresh_token": "<opaque>",
  "refresh_expires_at": "…",
  "user": { "id": "…", "email": "…", "display_name": "…", "profiles": ["attendee"] }
}
```

### `POST /v1/auth/refresh`

Body `{ "refresh_token": "…" }` (nativo). Web manda cookie httpOnly `refresh` (`Path=/v1/auth`) con `credentials`; si el request trae `Origin`, el JSON **omite** `refresh_token`. Cookie-only refresh/logout exigen `Origin` (o `Referer`) en `CORS_ORIGINS`.

- Hash lookup. Si revoked o expired → 401.
- Si `replaced_by` ya existe (reuso) → revocar **family_id** completo, 401.
- Sino: emitir access + refresh nuevo; marcar el viejo `revoked_at`, `replaced_by`.

### `POST /v1/auth/logout`

Revoca la familia del refresh enviado. 204. Idempotente si ya estaba revocado.

### `GET /v1/me`

Access. Incluye `profiles`, `tenant` si promoter, `memberships` resumidas (F11: event_id, role, status=active). Sin tokens.

## Access JWT

| Claim | Valor |
|-------|--------|
| `sub` | user id |
| `jti` | unique |
| `iat` `exp` | 10–15 min |
| `iss` | `parche-api` |
| `epoch` | `users.session_epoch` (F05; middleware rejects stale access) |

Algoritmo: **EdDSA o RS256** preferido; HS256 aceptable en MVP si el secret ≥ 32 bytes crypto-random. **No** incluir roles de evento. Opcional `profiles` array (cambia poco).

Clave: `JWT_ACCESS_SECRET` o par; **distinta** de `TICKET_SIGNING_KEY` y de `JWT_REFRESH_SECRET`.

## Datos

`users`: id, email, password_hash, display_name, status (`active`/`disabled`), created_at  
`refresh_tokens`: id, user_id, family_id, token_hash, expires_at, revoked_at, replaced_by, user_agent, created_at

## Seguridad

- Access en memoria app; web: cookie httpOnly `refresh` (no localStorage del token). Nativo: SecureStore.
- Logout en todos los dispositivos: `DELETE /v1/me/sessions` (revoca todas las familias **y** sube `session_epoch` para invalidar access de inmediato). **Incluido aquí**, no después.

### `DELETE /v1/me/sessions`

Access. Revoca todos los refresh del user y hace bump de `session_epoch`. 204. Fuerza re-login.

### `GET /v1/me/sessions`

Lista sesiones (id, created, user_agent, current). Sin hashes.

## Errores

| Caso | code |
|------|------|
| Password corta | `VALIDATION_ERROR` |
| Login malo | `UNAUTHORIZED` |
| Refresh reusado | `UNAUTHORIZED` + log `refresh_reuse` |
| User disabled | `FORBIDDEN` |

## Checklist

- [x] Access < 15 min
- [x] Refresh no se guarda en claro
- [x] Reuso tumba la familia
- [x] Logout y logout-all
- [x] Logs sin passwords ni JWT
- [x] Tests de login genérico y refresh rotation

## Next step

[F05 contraseña](F05-password-recovery.md), [F06 perfiles](F06-tenants-profiles.md).
