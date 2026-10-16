# FEAT-014: Perfil público de artista

El asistente ve quién toca: bio, próximos eventos, follow.

| Campo | Valor |
|-------|-------|
| Sprint | 2 |
| RC | RC-008 |
| Permiso UI | Público |
| Pantallas | `ArtistPublic` |

## Quick path

1. Tap en artistas del evento o búsqueda.
2. Ver bio, avatar, lista de próximos eventos.
3. Evento tap → detalle. Follow → [FEAT-016](feat-016-artist-follow.md).

## Pantallas

Hero B/N. Lista de eventos reutiliza card de Explorar. Dueño ve CTA “editar”.

## Flujo

`GET /v1/artists/{id}`. 404: “No encontramos a este artista”. Auth opcional: el GET espera hidratación de sesión para no pedir dos veces.

## Estados

Sin eventos: “Sin eventos anunciados”.

## Contrato

Auth opcional. Follow requiere sesión.

## Fuera de alcance

Chat. Stats de seguidores públicas detalladas (número simple OK).

## Checklist

- [ ] Artistas del evento y esta pantalla muestran el mismo nombre/avatar.
- [ ] Invitado lee; follow pide cuenta.

## Relacionadas

[FEAT-015](feat-015-event-lineup.md), [FEAT-016](feat-016-artist-follow.md)
