# F24 Recomendaciones

Sugerencias de eventos published según follows, géneros de compras/follows y cercanía opcional.

**Depends on:** F13, F16, F22, F07  
**Unlocks:** RC-018  
**Stories:** RC-018

## Quick path

1. Tabla `event_recommendations` materializada **o** query en vivo. **Decisión: job cada 15 min** escribe top 50 por user; cold start = eventos populares + mismos géneros.
2. `GET /v1/me/recommendations`.

## Señal (explícita, no ML opaco)

Score = `3 * upcoming_event_of_followed_artist` + `2 * genre_overlap` + `1 * same_city_bbox` − `5 * already_bought`.

Sin datos: top published por `sold_count` 7 días.

## HTTP

### `GET /v1/me/recommendations`

Access. `{ "events": [ { evento público resumido, "reason": "follow"|"genre"|"popular" } ] }` máx 20.

### `GET /v1/events/{id}/similar`

Público. Mismo algoritmo sin user (genre + lineup).

Worker `recs.refresh` subject cron.

## Checklist

- [ ] User nuevo recibe popular
- [ ] Follow DJ → su fecha aparece
- [ ] Evento comprado no se sugiere como “ir”
- [ ] Job en worker F01

## Next step

Home Expo usa este GET.
