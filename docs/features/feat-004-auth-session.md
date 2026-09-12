# FEAT-004: Sesión (refresh y logout)

La sesión dura con access corto y refresh rotativo. El QR del tiquete **no** usa estas claves.

| Campo | Valor |
|-------|-------|
| Sprint | 1 |
| RC | RC-002, RC-021 (logout; reset fuera) |
| Permiso UI | Autenticado |
| Pantallas | Invisible + `Parche` (salir) |

## Quick path

1. Access en memoria (10–15 min).
2. Al 401 de access: `POST /v1/auth/refresh` con rotación.
3. Salir: `POST /v1/auth/logout` y borrar refresh local.

## Pantallas

No hay pantalla de “sesión”. El botón Salir vive en [FEAT-012](feat-012-profile-me.md). Si la familia se revoca (refresh reusado), modal único: volver a [FEAT-003](feat-003-auth-login.md).

## Flujo

| Evento | Acción |
|--------|--------|
| App foreground | Refresh si el access está por vencer |
| Refresh OK | Nuevo par; el usado no se reenvía |
| Refresh fail / reuse | Limpiar store; login |
| Logout | Revocar familia en API + local |

## Estados

Fallo de red en refresh: un reintento; **no** borrar el refresh. Solo 401/reuse limpia store y pide login. No loop infinito.

## Contrato

`POST /v1/auth/refresh`, `POST /v1/auth/logout`. Refresh en SecureStore nativo. Web: cookie httpOnly, sin persistir el token en `localStorage`. Nunca loguear Authorization ni refresh.

## Fuera de alcance

Meter permisos de todos los eventos en el JWT. Ticket QR ([FEAT-023](feat-023-ticket-print.md) / [FEAT-025](feat-025-ticket-qr.md)).

## Checklist

- [x] Access no se persiste como único secreto en AsyncStorage en claro.
- [x] Logout deja de mostrar Tiquetes/Operar.
- [x] Reuso de refresh = sesión muerta.

## Relacionadas

[FEAT-001](feat-001-shell-navigation.md), [FEAT-025](feat-025-ticket-qr.md)
