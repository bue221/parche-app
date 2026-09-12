# FEAT-013: Editar perfil de artista

El productor o DJ arma su vitrina (bio, avatar, nombre de escena). No da permisos de caja.

| Campo | Valor |
|-------|-------|
| Sprint | 2 |
| RC | RC-006 |
| Permiso UI | Perfil `artist` o promoter creando artista |
| Pantallas | `ArtistEdit` |

## Quick path

1. Desde Parche, activar ficha (`POST /v1/me/profiles/artist`) o “Editar ficha” si ya existe.
2. Nombre de escena, bio, avatar.
3. `POST /v1/artists` o `PATCH /v1/artists/{id}` si ya existe.

## Pantallas

Formulario corto. Preview de cómo se ve en [FEAT-014](feat-014-artist-public.md).

Promoter puede crear ficha de artista no ligada a user (`user_id` opcional) para lineup de invitados.

## Flujo

Dueño edita; otro usuario `FORBIDDEN`.

## Estados

Vacío de bio permitido. Sin avatar: placeholder tipográfico (iniciales), no color.

## Contrato

`POST /v1/artists`, `PATCH /v1/artists/{id}`.

## Fuera de alcance

SoundCloud embed. Subida de discografía completa.

## Checklist

- [ ] Asistente sin perfil artist no edita fichas ajenas.
- [ ] Cambios salen en detalle de evento lineup.
- [ ] No abre métricas ni puerta.

## Relacionadas

[FEAT-014](feat-014-artist-public.md), [FEAT-015](feat-015-event-lineup.md)
