# F13 Follows de artista

El asistente sigue DJs para enterarse de fechas (y alimentar F24).

**Depends on:** F04, F12  
**Unlocks:** F24, F26 digest opcional  
**Stories:** RC-009

## Quick path

1. `POST /v1/artists/{id}/follow` idempotente.
2. `DELETE` unfollow.
3. `GET /v1/me/following` paginado.
4. Contador `followers_count` en GET artist (denormalizado o COUNT).

## Datos

`artist_follows`: user_id, artist_id, created_at, PK compuesto.

## HTTP

| Método | Ruta | Auth | Resultado |
|--------|------|------|-----------|
| POST | `/v1/artists/{id}/follow` | access | 204; 404 si artist no existe |
| DELETE | `/v1/artists/{id}/follow` | access | 204 si no seguía |
| GET | `/v1/me/following` | access | lista artists + cursor |
| GET | `/v1/artists/{id}/followers` | dueño artist o admin | count + no lista PII pública de followers en MVP público: **solo count en GET artist**. Followers list: solo dueño. |

No notificar en tiempo real. F26 puede email “tu DJ publicó fecha” en job al pasar evento a published (incluido: subject `artist.followed_event_published`).

## Errores

Seguirse a uno mismo: permitido si el user es el artist (no harm). Artist inexistente: 404.

## Checklist

- [ ] Follow duplicado no 500
- [ ] Unfollow idempotente
- [ ] GET me/following
- [ ] Job opcional email al publish (F26)

## Next step

[F24](F24-recommendations.md).
