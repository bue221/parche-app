# FEAT-037: Interés local (seguir y guardar sin cuenta)

El invitado puede seguir artistas y guardar fechas en el dispositivo. Al crear sesión, esos IDs se fusionan en la cuenta.

| Campo | Valor |
|-------|-------|
| Sprint | 4 |
| RC | RC-009 (ampliado) |
| Permiso UI | Público (local); sync con access |
| Pantallas | Detalle artista, detalle evento, tab Favoritos |

## Quick path

1. Sin sesión, Seguir o Guardar actualiza AsyncStorage de inmediato (optimistic).
2. No se abre login.
3. Tras OTP/Google/password, `POST /v1/me/sync` envía `artist_ids` y `event_ids`.
4. Éxito: se limpian los IDs ya sincronizados. Fallo: retry en el próximo boot; la sesión sigue.

## Pantallas

Botón Seguir en perfil de artista y trailing en lineup. Botón Guardar en detalle de evento. Colecciones en [FEAT-040](feat-040-saved-tab.md).

## Flujo

Store Zustand `parche.interest.v1`. Con sesión, Seguir/Guardar pega al API y también refleja local para la UI. Sync es idempotente; IDs desconocidos se ignoran.

## Estados

Offline: el local queda. Al reconectar, sync. No toast agresivo si el sync falla.

## Contrato

`POST /v1/artists/{id}/follow`, `DELETE` igual, `POST/DELETE /v1/events/{id}/save`, `POST /v1/me/sync`, `GET /v1/me/saved-events`, `GET /v1/me/following`.

## Fuera de alcance

Notificaciones push. Feed social.

## Checklist

- [ ] Seguir sin sesión no abre auth.
- [ ] Guardar sin sesión no abre auth.
- [ ] Primer login dispara sync una vez.

## Relacionadas

[FEAT-016](feat-016-artist-follow.md), [FEAT-038](feat-038-auth-otp.md), [FEAT-040](feat-040-saved-tab.md)
