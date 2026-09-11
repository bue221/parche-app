# F05 Recuperar contraseña

Si olvidó la clave, recibe un enlace de un solo uso. No usa el access JWT. El correo sale por F26.

**Depends on:** F04, F26 (puede implementarse con adapter SMTP stub + contrato email listo)  
**Unlocks:** RC-021 cerrado  
**Stories:** RC-021

## Quick path

1. `POST /v1/auth/password/forgot` siempre 204.
2. Si el email existe y está `active`, crear token hash + job `email.send` template `password_reset`.
3. `POST /v1/auth/password/reset` con token + nueva password; revocar **todas** las familias refresh.

## HTTP

### `POST /v1/auth/password/forgot`

```json
{ "email": "…" }
```

204 siempre (no enumerar cuentas). Rate limit más estricto: 5 / hora / email+IP.

### `POST /v1/auth/password/reset`

```json
{ "token": "…", "password": "…" }
```

200 tokens de sesión nuevos (como login) o 204 + “inicia sesión”. Decisión: **204**, forzar login, para no entregar sesión a quien solo tiene el mail.

- Token TTL **30 minutos**, un uso.
- 410 `GONE` si expiró o ya se usó.
- 400 si password no cumple política F04.

## Datos

`password_reset_tokens`: user_id, token_hash, expires_at, used_at.

El token en el mail es random 32 bytes url-safe; DB guarda hash.

## Seguridad

- Mismo tiempo de respuesta con email existente o no (dummy work).
- Al reset: revocar refresh families + invalidar access por rotación de `token_version` en `users` (incrementar `users.session_epoch`; access JWT lleva `ver` o se valida epoch en cada request). **Incluir `session_epoch`** en F04/F05: el access debe incluir `epoch`; middleware rechaza epoch viejo.

## Email (F26)

Template `password_reset`: link `{APP_ORIGIN}/reset?token=`. Texto plano + html. Sin “tu password es”.

## Checklist

- [ ] Forgot siempre 204
- [ ] Token un uso / 30 min
- [ ] Reset tumba sesiones
- [ ] Access con epoch viejo es 401

## Next step

[F26](F26-transactional-email.md) si el mail aún es stub.
