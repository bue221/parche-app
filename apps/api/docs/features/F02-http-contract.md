# F02 Contrato HTTP

Todas las rutas de producto viven bajo `/v1`, hablan JSON, llevan `request_id` y fallan con el mismo sobre de error. App Expo y web Next.js no adivinan formatos.

**Depends on:** F01  
**Unlocks:** el resto de endpoints  
**Stories:** transversal (RC-016 UX de error, RC-020)

## Quick path

1. Middleware: `request_id` (header `X-Request-Id` o UUID nuevo).
2. Envelope de error único.
3. Paginación cursor. CORS y rate limit.
4. OpenAPI 3 en `backend/openapi.yaml` actualizado **en el mismo PR** que cada ruta nueva.

## HTTP transversal

| Regla | Valor |
|-------|--------|
| Prefijo producto | `/v1` |
| Content-Type | `application/json; charset=utf-8` |
| Auth | `Authorization: Bearer <access>` |
| Tiempo | ISO-8601 UTC |
| IDs | UUID v7 (o v4 si v7 no está); nunca int autoincrement público |
| Paginación | `?cursor=&limit=` default 20, máx 50 |

Error:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "La fecha de fin debe ser posterior al inicio",
  "request_id": "01J…",
  "details": [{ "field": "ends_at", "issue": "order" }]
}
```

`details` solo en validación. Nunca stack, SQL ni nombres de tablas.

## Códigos

| `code` | HTTP | Cuándo |
|--------|------|--------|
| `VALIDATION_ERROR` | 400 | Body/query inválido |
| `UNAUTHORIZED` | 401 | Sin token, token expirado o mal firmado |
| `FORBIDDEN` | 403 | Token ok, permiso insuficiente |
| `NOT_FOUND` | 404 | Recurso inexistente **o** no visible (no filtrar existencia de tiquetes ajenos: 404) |
| `CONFLICT` | 409 | Estado incompatible (doble scan, email tomado) |
| `GONE` | 410 | Token de reset/invite/QR vencido |
| `RATE_LIMITED` | 429 | `Retry-After` segundos |
| `NOT_READY` | 503 | `/ready` |
| `INTERNAL` | 500 | Bug; mensaje genérico al cliente |

Idempotencia: header `Idempotency-Key` obligatorio en `POST /v1/events/{id}/orders` (F16) y recomendado en uploads.

## Seguridad HTTP

| Tema | Decisión |
|------|----------|
| CORS | Allowlist `CORS_ORIGINS`. Métodos usados. Headers `Authorization`, `Content-Type`, `X-Request-Id`. Credenciales si cookie web. App nativa no usa CORS. |
| Rate limit | Redis. Login/register/refresh: 10 / 15 min / IP+email. Check-in: 30 / s / user. APIs públicas list: 60 / min / IP. |
| TLS | Terminación en edge. API asume `X-Forwarded-Proto`. |
| Headers | `X-Content-Type-Options: nosniff`, no cache en auth. |

## Logs

JSON por request: `request_id`, `method`, `path` (sin query secrets), `status`, `latency_ms`, `user_id` si hay. **Prohibido:** `Authorization`, refresh, body de QR, números de tarjeta.

Panic → 500 `INTERNAL` + log con stack.

## OpenAPI

- Un archivo versionado.
- Ejemplos de 200 y del error estándar.
- CI falla si las rutas Go no coinciden (o checklist humano hasta tener el linter).

## Checklist

- [ ] Toda ruta `/v1` usa el envelope
- [ ] 401 vs 403 vs 404 documentados y testeados
- [ ] Rate limit en login y check-in
- [ ] CORS no es `*`
- [ ] OpenAPI en el repo

## Next step

[F03 object store](F03-object-store.md) y [F04 sesión](F04-auth-session.md) en paralelo tras F02.
