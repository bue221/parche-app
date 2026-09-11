# PRD: backend de Parche

Parche es la plataforma que unifica la escena techno (Bogotá primero): eventos, artistas y tiquetería en un solo sistema. Este documento define **qué debe construir el backend** para servir a la app Expo (`app-frontend`) y a la web Next.js (`web-frontend`). La fuente de producto es el documento académico *Proyecto Parche — Práctica de Ingeniería IV* (2026), más las decisiones de producto de este repo.

**Decisiones:**

- API REST en Go, PostgreSQL compartido (multi-tenant por columna), Redis, worker + cola, Docker.
- **Varias personas** pueden operar la puerta y ver métricas del mismo evento; el acceso es por membresía + permiso, no por un único rol global.
- Media (flyers, galería, audio) pasa por un **puerto de almacenamiento** local/MinIO que se cambia a S3 sin tocar handlers.
- Mapas con coordenadas propias + OSM/MapLibre. **No** Google Maps ni otro SDK propietario como dependencia.
- Tokens de sesión y tokens de tiquete (QR) usan **claves y ciclos de vida distintos**.

## Quick path

1. Levantar Compose: API, worker, Postgres, Redis, broker, object store local (MinIO o disco).
2. Auth (`register` / `login` / `refresh`) con access corto + refresh rotativo.
3. MVP (Sprint 1): cuenta, eventos con flyer + pin en mapa, CRUD de organizador.
4. Diseñar desde el día uno: RBAC por evento, QR (firma + Redis `SETNX`), `ObjectStore`.

## Problema que resuelve

La escena está dispersa: eventos viven en Facebook, hay poca visibilidad para talento nuevo, y la puerta no tiene un control de aforo fiable. El backend es el **punto único de verdad** para:

- Publicar y descubrir eventos (flyer, audio de referencia, ubicación).
- Perfiles de artistas y seguimiento.
- Compra, transferencia y validación de tiquetes (pico en puerta, **varios scanners**).
- Métricas para promoter/admin (ventas, ingresos, aforo).
- Aislamiento entre organizadores sin fragmentar la base.

## Quién consume la API

| Cliente | Repo | Uso de la API |
|---------|------|----------------|
| App móvil | `app-frontend` (Expo 57) | Cuenta, agenda, mapa, perfiles, compra, QR, puerta, métricas |
| Web | `web-frontend` (Next.js) | Landing/SEO; lectura pública; no tiquetería completa |
| Workers | `backend` | Check-in persistido, webhooks, jobs de media |

## Identidades, perfiles y permisos

Un usuario **no** es “el staff”. En una noche hay varios ingresos: dueño del parche, promoter, y dos o tres en la puerta. El modelo separa **perfil de plataforma** (qué tipo de cuenta eres) de **membresía de evento** (qué puedes hacer *en este evento*).

### Perfiles de plataforma (`users` + `user_profiles`)

| Perfil | Quién | Qué no implica |
|--------|-------|----------------|
| `attendee` | Asistente | No ve métricas ni escanea |
| `artist` | Productor / DJ | Perfil público; no opera caja salvo membresía |
| `promoter` | Organizador / colectivo (dueño del tenant) | Crea eventos; invita staff; ve métricas de *sus* eventos |
| `platform_admin` | Operación Parche | Aprueba eventos, soporta tenants; no sustituye al promoter en puerta |

Un usuario puede tener más de un perfil (asistente + artista). El promoter del tenant es el que invita al resto.

### Membresía por evento (`event_members`)

Varias filas por evento. Cada miembro tiene un **rol de evento** que es un paquete de permisos.

| Rol de evento | Permisos típicos |
|---------------|------------------|
| `owner` | Todo el evento (editar, media, lineup, invitaciones, métricas, puerta, tipos de tiquete) |
| `manager` | Editar evento y media, métricas, invitar `door`; no borrar el evento ni transferir ownership |
| `door` | Check-in QR, ver aforo en vivo de *ese* evento; **sin** ventas ni PII de compradores más allá de lo necesario para la puerta |
| `metrics` | Solo lectura de dashboard (ventas, check-ins); no escanea |

Permisos atómicos (el código autoriza *estos*, no el nombre del rol):

| Permiso | Uso |
|---------|-----|
| `event.read` | Ver detalle (ya cubierto si es público) |
| `event.write` | Crear/editar evento, flyers, audio, mapa |
| `event.publish` | Enviar a revisión / publicar |
| `event.members.manage` | Invitar, cambiar rol, revocar |
| `event.metrics.read` | Dashboard |
| `event.door.scan` | `POST .../check-in` |
| `event.door.live` | Conteo en vivo, últimos scans |
| `event.tickets.manage` | Tipos de tiquete y aforo |
| `tenant.billing.read` | (futuro) caja del colectivo |

Reglas:

- El **owner** del evento (promoter del tenant o quien cree el evento) puede invitar N personas a `door` / `manager` / `metrics`.
- Revocar membresía invalida de inmediato el permiso (el access JWT **no** lleva la lista completa de eventos; el API resuelve membresía en Redis/Postgres).
- Check-in concurrente: varios `door` escanean a la vez; el anti doble-uso es por `ticket_id` en Redis, no por “quién escaneó”.
- `ticket_scan_logs` guarda `scanner_user_id` para auditoría y métricas por persona.

### Invitaciones

`POST /v1/events/{id}/members` con email o `user_id` + rol. Estados: `pending` / `active` / `revoked`. El invitado acepta con cuenta existente o registro. No compartir un solo login de “la puerta”.

## Fuera de alcance (no es producto)

- Una base de datos por bar u organizador.
- Sustituir Expo/Next por React + Supabase + Netlify.
- Geocoding obligatorio en servidor (el pin lo pone el cliente en OSM).
- SDK de Google Maps / Places como dependencia.

Clubos, email, recomendaciones, transcode de preview, admin y reset de clave **sí están especificados** en [features/](features/README.md) (F05, F10, F23–F27). No hay backlog paralelo.

## Stack y Docker

| Servicio Compose | Tecnología | Para qué |
|------------------|------------|----------|
| `api` | Go (HTTP) | Gateway y lógica; picos de QR |
| `worker` | Go | Persistencia async, webhooks, jobs de media |
| `postgres` | PostgreSQL | Fuente de verdad |
| `redis` | Redis | Caché; `SETNX`; set de memberships de puerta |
| `broker` | NATS o RabbitMQ | Desacoplar respuesta de escritura |
| `media` | MinIO (S3 API) en dev | Flyers, galería, audio; prod = AWS S3 |

Contrato local:

- `docker-compose.yml` en `backend/` con perfil `dev`.
- `.env.example`: `DATABASE_URL`, `REDIS_URL`, `BROKER_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `TICKET_SIGNING_KEY`, `OBJECT_STORE_*`, `PAYMENT_WEBHOOK_SECRET`.
- `api` y `worker` misma imagen, distinto `CMD`.
- Solo `api` publica puerto (`8080`). Postgres/Redis/broker/MinIO no salen a internet en prod.
- `GET /health` y `GET /ready` (Postgres + Redis + object store ping).

### Capas de despliegue

```
App Expo / Web Next.js
        │ HTTPS REST
        ▼
   API Gateway / load balancer
        ▼
   api (Go) ── SETNX / membership cache ── Redis
        │ ── eventos ── broker ── worker ── Postgres
        │ ── ObjectStore port ── MinIO (dev) o S3 (prod)
        └── Postgres (fuente de verdad)
```

## Media: local ahora, S3 después

Los handlers **no** hablan con el disco ni con el SDK de AWS. Hablan con un puerto:

```
ObjectStore
  PutPresign(key, contentType, maxBytes) → { url, headers, expires }
  GetPublicURL(key) → string   // o GetPresign para audio no público
  Delete(key)
  Exists(key)
```

| Entorno | Driver | Notas |
|---------|--------|--------|
| Dev / CI | MinIO en Compose (API S3) | Mismo código que prod |
| Fallback local | filesystem bajo `./data/media` | Solo si MinIO no está; mismas keys |
| Prod | AWS S3 + CloudFront opcional | Cambio de env: `OBJECT_STORE_DRIVER=s3` |

Convenciones de key: `{tenant_id}/{event_id}/{kind}/{uuid}.{ext}`  
`kind`: `flyer` | `gallery` | `avatar` | `audio`.

Límites (rechazo en `POST /v1/uploads`, no en el bucket abierto):

| Kind | MIME | Tamaño máx. |
|------|------|-------------|
| flyer / gallery / avatar | `image/jpeg`, `image/png`, `image/webp` | 8 MB |
| audio | `audio/mpeg`, `audio/ogg`, `audio/wav` | 20 MB (preview); fuente mayor queda backlog |

Tras el PUT, el cliente confirma `POST /v1/assets` con `key` + `kind`. El API verifica que el objeto existe, el prefix coincide con el tenant, y guarda metadatos (`bytes`, `content_type`, `duration_ms` si audio). URLs públicas de flyer en listados; audio por URL de corta vida o path autenticado para no hotlinkear.

El worker puede generar un thumbnail de flyer más adelante sin cambiar el contrato.

## Mapas sin Google (ni vendor lock)

El backend **guarda geodata**, no tiles ni una API de mapas de terceros.

| Campo en `events` / `venues` | Uso |
|------------------------------|-----|
| `venue_name`, `address_text` | Lectura humana |
| `lat`, `lng` (WGS84) | Pin obligatorio al publicar |
| `geojson` opcional | Contorno de venue (futuro) |

Clientes (Expo y web): **MapLibre GL** + teselas OSM (o teselas propias más adelante). Geocodificación en el dispositivo o Nominatim/Photon **opcional**; el promoter puede soltar el pin. Cero SDK de Google Maps, Google Places o Mapbox como requisito de producto.

`GET /v1/events` y detalle incluyen `lat`/`lng` para el mapa de explorar. Búsqueda por bbox: `?min_lat=&min_lng=&max_lat=&max_lng=` (Sprint 4 si hace falta).

## Modelo de datos (mínimo)

Una sola base. `tenant_id` indexado. No un esquema por tenant.

| Entidad | Responsabilidad |
|---------|-----------------|
| `users` | Cuenta; estado |
| `user_profiles` | Perfiles de plataforma (varios por user) |
| `tenants` | Colectivo / promoter |
| `event_members` | user + event + rol + estado |
| `event_invites` | Invitación pendiente |
| `artists` | Perfil público DJ; `user_id` opcional |
| `venues` | Nombre, address, lat/lng (reutilizable) |
| `events` | Fecha, descripción, estado, `tenant_id`, `venue_id`, flyer principal |
| `assets` | key, kind, mime, bytes, owner (`event` / `user` / `artist`) |
| `event_tracks` | Canciones/audios de referencia del evento (orden, asset_id, título) |
| `event_artists` | Lineup |
| `artist_follows` | Follow |
| `ticket_types` | Precio, aforo, ventana de venta |
| `orders` | `pending` / `paid` / `failed` / `expired` |
| `tickets` | `reserved` / `valid` / `used` / `transferred` / `cancelled` |
| `payment_transactions` | Idempotencia webhook |
| `ticket_scan_logs` | Auditoría: ticket, event, scanner_user_id, resultado, ts |
| `refresh_tokens` | Hash del refresh, familia, revoked_at |
| `event_recommendations` | Sprint 4 |

Errores de persistencia: transacción en compra/reserva; webhook idempotente. Logs con `request_id`; el cliente ve códigos (`VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `CONFLICT`, `GONE`).

## Contrato HTTP

Prefijo `/v1`. JSON UTF-8. Auth: `Authorization: Bearer <access_token>`. Errores:

```json
{ "code": "FORBIDDEN", "message": "No tienes permiso de puerta en este evento", "request_id": "…" }
```

Paginación: `cursor` + `limit` (máx. 50). Filtros de eventos: `from`, `to`, `genre`, `artist_id`, `q`, bbox.

### Salud

| Método | Ruta | Auth | Notas |
|--------|------|------|--------|
| GET | `/health` | no | Proceso vivo |
| GET | `/ready` | no | Postgres + Redis + store |

### Auth y cuenta (RC-001, RC-002, RC-010, RC-021)

| Método | Ruta | Auth | Sprint |
|--------|------|------|--------|
| POST | `/v1/auth/register` | no | 1 |
| POST | `/v1/auth/login` | no | 1 |
| POST | `/v1/auth/refresh` | refresh | 1 |
| POST | `/v1/auth/logout` | refresh | 1 |
| POST | `/v1/auth/password/forgot` | no | backlog |
| POST | `/v1/auth/password/reset` | no | backlog |
| GET | `/v1/me` | access | 1 |
| PATCH | `/v1/me` | access | 2 |
| GET | `/v1/me/memberships` | access | 2 |

Registro: perfil inicial `attendee` o `promoter`. Login: mensaje genérico (no revelar si el email existe). `GET /v1/me` devuelve perfiles + membresías activas resumidas (sin secretos).

### Eventos (RC-003–005, RC-007, RC-015, RC-017, RC-022)

| Método | Ruta | Auth | Sprint |
|--------|------|------|--------|
| GET | `/v1/events` | opcional | 1 |
| GET | `/v1/events/{id}` | opcional | 1 |
| POST | `/v1/events` | `promoter` + tenant | 1 |
| PATCH | `/v1/events/{id}` | `event.write` | 1 |
| POST | `/v1/events/{id}/artists` | `event.write` | 2 |
| DELETE | `/v1/events/{id}/artists/{artistId}` | `event.write` | 2 |
| POST | `/v1/admin/events/{id}/approve` | `platform_admin` | 3 |
| POST | `/v1/admin/events/{id}/reject` | `platform_admin` | 3 |

Caché Redis en listados públicos. Invalidar al publicar o cambiar flyer/ubicación.

### Miembros del evento (varios en puerta)

| Método | Ruta | Permiso | Sprint |
|--------|------|---------|--------|
| GET | `/v1/events/{id}/members` | `event.members.manage` o `owner` | 2 |
| POST | `/v1/events/{id}/members` | `event.members.manage` | 2 |
| PATCH | `/v1/events/{id}/members/{userId}` | `event.members.manage` | 2 |
| DELETE | `/v1/events/{id}/members/{userId}` | `event.members.manage` | 2 |
| POST | `/v1/invites/{token}/accept` | access | 2 |

### Media y tracks

| Método | Ruta | Permiso | Sprint |
|--------|------|---------|--------|
| POST | `/v1/uploads` | autenticado; scope en body | 1 |
| POST | `/v1/events/{id}/assets` | `event.write` | 1 |
| DELETE | `/v1/events/{id}/assets/{assetId}` | `event.write` | 1 |
| PUT | `/v1/events/{id}/tracks` | `event.write` | 2 |

`POST /v1/uploads` body: `{ "kind": "flyer"|"gallery"|"audio"|"avatar", "content_type", "byte_size", "event_id"? }` → presign. Sin `event_id` solo avatar propio.

### Artistas y social (RC-006–009)

| Método | Ruta | Auth | Sprint |
|--------|------|------|--------|
| POST | `/v1/artists` | artist o promoter | 2 |
| GET | `/v1/artists/{id}` | opcional | 2 |
| PATCH | `/v1/artists/{id}` | dueño | 2 |
| POST | `/v1/artists/{id}/follow` | attendee | 2 |
| DELETE | `/v1/artists/{id}/follow` | attendee | 2 |
| GET | `/v1/me/following` | access | 2 |

### Tiquetes y pagos (RC-011–014)

| Método | Ruta | Auth | Sprint |
|--------|------|------|--------|
| POST | `/v1/events/{id}/orders` | attendee | 3 |
| GET | `/v1/orders/{id}` | dueño | 3 |
| POST | `/v1/payments/webhook` | firma pasarela | 3 |
| GET | `/v1/me/tickets` | attendee | 3 |
| POST | `/v1/tickets/{id}/transfer` | dueño | 3 |

Flujo de compra: order `pending` + ticket `reserved` → URL pasarela → webhook → ticket `valid` + **token QR firmado** (no un id plano). Reserva se libera si el pago falla o expira.

### Check-in QR (RC-013)

| Método | Ruta | Permiso | Sprint |
|--------|------|---------|--------|
| POST | `/v1/events/{eventId}/check-in` | `event.door.scan` | 3 |
| GET | `/v1/events/{eventId}/door/live` | `event.door.live` o `event.metrics.read` | 3 |

Hot path **sin** Postgres:

1. Verificar firma del **ticket token** en memoria (`ticket_id`, `event_id`, `jti`, `exp`).
2. Autorizar al scanner por membresía `event.door.scan` (cache Redis de members).
3. Confirmar `event_id` del token = evento de la ruta.
4. `SETNX` por tiquete: alta → `approved`; ya existía → `duplicate`.
5. Publicar `ticket.used` con `scanner_user_id`; worker escribe `used` + `ticket_scan_logs`.

Respuestas: `approved` | `duplicate` | `invalid` | `wrong_event` | `expired` | `forbidden`. Varios scanners en paralelo; el ganador es el primer `SETNX`.

### Métricas (promoter / manager / metrics)

| Método | Ruta | Permiso | Sprint |
|--------|------|---------|--------|
| GET | `/v1/events/{id}/metrics` | `event.metrics.read` | 3 |
| GET | `/v1/tenants/{id}/metrics` | owner del tenant | 4 |

Payload mínimo del evento (agregados, no PII de compradores):

- Vendidos / reservados / disponibles por `ticket_type`.
- Ingresos brutos (si hay precio; moneda del tenant).
- Check-ins vs vendidos; tasa de no-show.
- Scans por `scanner_user_id` (quién cubrió la puerta).
- Serie temporal gruesa (por hora) en la noche del evento.

Números de puerta pueden leerse de Redis (contadores incrementados en el check-in); conciliación con Postgres en el worker.

### Contenido y recomendaciones (RC-018, RC-019)

| Método | Ruta | Auth | Sprint |
|--------|------|------|--------|
| GET | `/v1/posts` | opcional | 4 |
| GET | `/v1/me/recommendations` | attendee | 4 |

## Seguridad de tokens

Dos familias de criptografía. Mezclarlas es un bug.

| Token | Vida | Dónde vive | Firma |
|-------|------|------------|--------|
| Access JWT | 10–15 min | memoria del cliente | `JWT_ACCESS_SECRET` (o par RS256) |
| Refresh | ~7–30 días | httpOnly en web si aplica; storage seguro en nativo | opaco o JWT; **solo el hash** en `refresh_tokens` |
| Ticket QR | ventana del evento + margen | payload del QR | `TICKET_SIGNING_KEY` distinto |

Access JWT claims: `sub` (user_id), `tenant_ids` liviano opcional, `jti`, `iat`, `exp`. **No** meter permisos de todos los eventos (el set cambia al invitar/revocar). El API carga membresía por `event_id` de la ruta.

Refresh:

- Rotación en cada `POST /v1/auth/refresh`: el usado se revoca, se emite uno nuevo de la misma familia.
- Reuso de un refresh ya rotado: revocar **toda** la familia (robo detectado).
- Logout revoca la familia.
- Rate limit en login, refresh y check-in.

Ticket QR:

- Claims mínimos: `tid`, `eid`, `jti`, `exp`. Firmado (JWS). Nunca el UUID crudo como único secreto.
- Clave rotativa con `kid` en header; verificar contra JWKS interno o secretos versionados.
- Un tiquete transferido invalida el `jti` anterior (denylist Redis hasta `exp`).
- El scanner autentica con **su** access token; el body lleva el ticket token. El access del asistente no autoriza a escanear.

Otras reglas:

- TLS en el edge. Secretos solo en env / gestor.
- Webhook de pago: firma + anti-replay por ventana e idempotency key.
- No loguear Authorization, refresh, ni payload QR. `request_id` sí.
- CORS explícito a orígenes de web; la app móvil no depende de CORS.
- Presign de upload: TTL corto (p. ej. 5 min), `Content-Type` fijo, key con prefix del tenant.

Capa API: mensajes cortos en español. Causa completa solo en log.

## Rendimiento

El cuello no es “cuántos bares” (20–200), sino **cientos de scans en minutos** con **varios dispositivos**:

- Agenda: Redis + Postgres.
- Check-in: Redis primero; Postgres después.
- Membership de puerta: cache por `event_id` (invalidar al invitar/revocar).
- Un Postgres; partición de `ticket_scan_logs` si crece.

## Mapeo sprint → features

El desglose fino está en [features/README.md](features/README.md). Orden sugerido:

| Sprint | Features |
|--------|----------|
| 1 | F01–F09, F11 (ACL mínima owner), F14 |
| 2 | F10, F12, F13, F11 invites, F07 bbox/geojson |
| 3 | F15–F20, F27 approve |
| 4 | F21–F26 |

RC-021–025 viven en F05, F08 PATCH, F25, F27, F26 — no en un cajón “después”.

## Checklist de aceptación

- [ ] `docker compose up` levanta api, worker, postgres, redis, broker y MinIO (o FS).
- [ ] Cambiar `OBJECT_STORE_DRIVER` a `s3` no exige reescribir handlers.
- [ ] Un promoter crea un evento con flyer, pin (`lat`/`lng`) y, en Sprint 2, audios; el detalle público los muestra.
- [ ] El mapa del cliente no usa Google Maps; consume coordenadas de la API.
- [ ] El promoter invita a dos usuarios `door`; ambos escanean a la vez; el mismo QR no entra dos veces.
- [ ] Un `door` no ve ingresos ni puede editar el evento; `metrics` ve dashboard y no escanea.
- [ ] Revocar un miembro deja de aceptar su check-in aunque el access JWT siga vivo.
- [ ] Access expira en minutos; refresh rota; reusar un refresh viejo tumba la familia.
- [ ] Ticket QR y sesión no comparten clave; logs sin tokens.
- [ ] OpenAPI coincide con estas tablas.

## Next step

Implementar [F01 Runtime](features/F01-runtime.md) y seguir el grafo de [features/README.md](features/README.md).
