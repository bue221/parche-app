# F08 Ciclo de vida de eventos

El promoter crea, edita y manda a revisión un evento. El asistente lista y abre el detalle. Estados claros; listado público cacheado.

**Depends on:** F04, F06, F07  
**Unlocks:** F09–F12, F15, F27  
**Stories:** RC-003, RC-004, RC-005, RC-015, RC-022

## Quick path

1. CRUD `events` con tenant_id, venue, fechas, descripción, género(s).
2. Estados: `draft` → `pending_review` → `published` | `rejected` → `cancelled` | `archived`.
3. Creador queda `event_members.role=owner` (F11).
4. Caché Redis del listado público; invalidar al publicar/editar flyer/pin.

## Datos

`events`:

| Campo | Notas |
|-------|--------|
| tenant_id | obligatorio |
| title, slug | slug único por tenant |
| description | markdown o texto plano (plano en MVP, markdown sanitizado ok) |
| starts_at, ends_at | ends > starts |
| venue_id | F07 |
| status | enum arriba |
| flyer_asset_id | F09 |
| genres | text[] (p. ej. `techno`, `acid`, `rave`) |
| age_policy | opcional texto |
| created_by | user_id |

Índices: `(status, starts_at)`, `tenant_id`, GiST/coords vía venue.

## HTTP

### `POST /v1/events`

Auth: promoter + tenant membership. Body título, fechas, venue_id o pin inline (crea venue), description, genres. Status inicial `draft`. 201.

### `PATCH /v1/events/{id}`

Permiso `event.write`. No cambia tenant. Si `published`, ciertos campos (fecha, venue) dejan `pending_review` de nuevo **o** quedan editables: **decisión: published permite PATCH de description/media; cambio de fecha/venue → `pending_review`**.

### `POST /v1/events/{id}/submit`

`event.publish`. draft|rejected → `pending_review`. Exige pin, título, fechas, flyer (F09). 204.

### `POST /v1/events/{id}/cancel`

Owner. published → `cancelled`. Reembolso: fuera de pasarela auto; marcar tickets `cancelled` (F16/F17) y job email.

### `GET /v1/events`

Público. Solo `published` (y starts_at futuro + 12h de margen para “en curso”). Paginación cursor `starts_at,id`. Filtros en F22; sin query = agenda.

Caché: key `events:list:` + hash query, TTL 30s. Invalidar prefix al cambiar evento published.

Flyer en submit: F09. F08 exige pin/venue; sin pin → `VALIDATION_ERROR`.

### `GET /v1/events/{id}`

Público si published/cancelled (cancelled visible). Draft solo miembros. 404 si draft y no miembro (no filtrar existencia a extraños: 404).

### `GET /v1/tenants/{id}/events`

Miembro tenant: todos los estados.

Aprobación admin: [F27](F27-platform-admin.md).

## Errores

| Caso | code |
|------|------|
| Submit sin flyer/pin | `VALIDATION_ERROR` |
| Attendee POST event | `FORBIDDEN` |
| ends_at < starts_at | `VALIDATION_ERROR` |

## Checklist

- [x] Draft invisible en listado público
- [x] PATCH funciona (RC-022)
- [x] Submit exige mapa y flyer (F09)
- [x] Cancel oculta venta y deja detalle
- [x] Caché se invalida

## Next step

[F09](F09-event-media.md), [F11](F11-event-members.md).
