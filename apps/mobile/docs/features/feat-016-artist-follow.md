# FEAT-016: Seguir artista

El asistente sigue DJs para enterarse de fechas. No es un feed social de posts.

| Campo | Valor |
|-------|-------|
| Sprint | 2 |
| RC | RC-009 |
| Permiso UI | `attendee` autenticado |
| Pantallas | Botón en perfil artista; lista en Parche |

## Quick path

1. En perfil público, Seguir.
2. `POST /v1/artists/{id}/follow`.
3. Parche → following → mismos artistas.

Dejar de seguir: `DELETE` mismo recurso.

## Pantallas

Botón outlined / filled según estado. Lista `GET /v1/me/following`.

## Flujo

Sin sesión: login y retorno al perfil, luego no auto-follow mágico salvo que el usuario pulse de nuevo (KISS: no seguir implícito post-login).

## Estados

Vacío following: “Todavía no sigues a nadie”.

## Contrato

Solo attendee (o perfil attendee). Idempotencia: seguir dos veces = seguido.

## Fuera de alcance

Notificaciones push por follow (después). Recomendaciones (033).

## Checklist

- [ ] Estado del botón coincide con el API al reabrir.
- [ ] Lista y botón no divergen.

## Relacionadas

[FEAT-014](feat-014-artist-public.md), [FEAT-033](feat-033-recommendations.md)
