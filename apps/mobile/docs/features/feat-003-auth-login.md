# FEAT-003: Inicio de sesión

Quien ya tiene cuenta entra a sus funciones (wallet, follows, eventos propios) con un mensaje de error que no filtra emails.

| Campo | Valor |
|-------|-------|
| Sprint | 1 |
| RC | RC-002 |
| Permiso UI | Público |
| Pantallas | `Login`, `/reset` |

## Quick path

1. “Otras opciones” del AuthSheet, o ruta `/auth/login` (cuentas con clave).
2. Email + contraseña → `POST /v1/auth/login`.
3. Entra al destino pendiente (deep link) o a Explorar. Dispara sync [FEAT-037](feat-037-local-interest.md).

El camino de compra es [FEAT-038](feat-038-auth-otp.md), no esta pantalla.

Olvidé la clave: enlace a `/reset` → `POST /v1/auth/password/forgot`. El mail abre `/reset?token=` → `POST /v1/auth/password/reset` (siempre 204; no enumerar cuentas). Desde Parche, [FEAT-012](feat-012-profile-me.md) pide el mismo enlace con el email de la sesión.

## Pantallas

Formulario mínimo en modal dismissible. Enlace a registro promoter. `pendingPath` solo para invites, orders y QR. Compra y follow ya no redirigen aquí.

## Flujo

Login → persistir refresh → hidratar `me` + memberships → aplicar [FEAT-001](feat-001-shell-navigation.md).

Deep link pendiente (invite, evento, pago) se retoma después del login ([FEAT-035](feat-035-deep-links.md)).

## Estados

| Estado | UI |
|--------|-----|
| Credenciales | Mensaje genérico (“No pudimos entrar”) |
| Rate limit | Espera; no culpar al email |

## Contrato

`POST /v1/auth/login` → access + refresh. `POST /v1/auth/password/forgot`, `POST /v1/auth/password/reset`.

## Fuera de alcance

Biometría como único factor (puede llegar después sobre la misma sesión).

## Checklist

- [ ] Fallo no dice si el email existe.
- [ ] Éxito no muestra tokens.
- [ ] Vuelta al destino previo si lo había.

## Relacionadas

[FEAT-002](feat-002-auth-register.md), [FEAT-004](feat-004-auth-session.md), [FEAT-012](feat-012-profile-me.md)
