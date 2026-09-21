# F06 Tenants y perfiles de plataforma

Un usuario puede ser asistente y DJ a la vez. El **promoter** es dueño de un **tenant** (colectivo). El **platform_admin** opera Parche, no la puerta del evento.

**Depends on:** F04  
**Unlocks:** F08, F11, F21, F27  
**Stories:** RC-001 (rol inicial), RC-024 (gestión de usuarios/roles)

## Quick path

1. Tablas `tenants`, `user_profiles`, `tenant_members`.
2. Register promoter crea tenant + membership `owner`. Un asistente puede volverse organizer después con `POST /v1/me/profiles/promoter` (nombre del colectivo + tenant).
3. Endpoints para añadir perfil `artist` y para admin de plataforma asignar `platform_admin`.

## Perfiles

| profile | Cómo se obtiene |
|---------|-----------------|
| `attendee` | Default en todo register |
| `promoter` | Register `profile=promoter`, `POST /v1/me/profiles/promoter`, o promoción admin |
| `artist` | `POST /v1/me/profiles/artist` (crea fila artist en F12 o marca perfil) |
| `platform_admin` | Solo otro admin o seed; nunca self-serve |

## Datos

`tenants`: id, slug, name, currency (`COP`), status  
`tenant_members`: tenant_id, user_id, role (`owner` \| `staff`), unique (tenant, user)  
`user_profiles`: user_id, profile, unique (user, profile)

Un promoter `owner` de tenant crea eventos de ese tenant. Un user puede ser owner de **un** tenant en MVP (simplifica billing F21). Segundo colectivo = segundo user o se relaja después **dentro de este mismo modelo** permitiendo N tenants: **decisión: N tenants por user vía `tenant_members`**.

## HTTP

### `GET /v1/me` (extiende F04)

`profiles[]`, `tenants[]` `{ id, name, role }`.

### `POST /v1/me/profiles/artist`

Access. 204. Idempotente. No crea el documento público del artista (F12 `POST /v1/artists`).

### `POST /v1/me/profiles/promoter`

Access. Body `{ "name": "Pez Alado" }`. 200 tenant + membership owner. Idempotente: si ya hay tenant, lo devuelve sin crear otro.

### `POST /v1/tenants`

Access + perfil promoter. Body `{ "name": "Pez Alado" }`. 201 tenant + membership owner.

### `GET /v1/tenants/{id}`

Miembro del tenant.

### `PATCH /v1/tenants/{id}`

Solo `owner`. Nombre, currency.

### `GET /v1/tenants/{id}/members`

Owner. Lista miembros del colectivo (no confundir con F11 event_members).

### `POST /v1/tenants/{id}/members`

Owner invita user_id o email como `staff` del tenant (puede crear eventos del tenant). Reusa flujo invite F11/F26.

### `DELETE /v1/tenants/{id}/members/{userId}`

Owner. No puede borrarse el último owner.

## Platform admin (creación de perfil)

Cubierto en [F27](F27-platform-admin.md). Aquí: middleware `RequireProfile("platform_admin")`.

## Errores

| Caso | code |
|------|------|
| Crear evento sin tenant | `FORBIDDEN` |
| Último owner se sale | `CONFLICT` |
| Self-assign admin | `FORBIDDEN` |

## Checklist

- [x] Promoter register deja tenant usable
- [x] Attendee puede volverse organizer (`POST /v1/me/profiles/promoter`)
- [x] Attendee no crea eventos
- [x] Artist profile no da métricas
- [x] N members de tenant
- [x] platform_admin no se autoasigna

## Next step

[F08 eventos](F08-events-lifecycle.md), [F07 mapa](F07-venues-maps.md).
