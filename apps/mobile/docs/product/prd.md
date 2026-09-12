# PRD: app-frontend de Parche

Parche es la plataforma que unifica la escena techno (Bogotá primero): eventos, artistas y tiquetería en un solo sistema. Este documento define **qué debe construir la app Expo** (`app-frontend`) para asistentes, artistas, promoters y staff de puerta. Consume la API REST del [PRD de backend](../../../backend/docs/prd.md). La fuente de producto es *Proyecto Parche — Práctica de Ingeniería IV* (2026) y las decisiones de este repo.

**Decisiones:**

- Canal principal: **Expo 57** (iOS, Android; web solo para desarrollo, no sustituye a `web-frontend`).
- La web Next.js cubre landing/SEO y lectura pública; **compra, QR, puerta y métricas viven en la app**.
- UI: consumer foto-first sobre chrome B/N ([sistema visual](../ui/design.md)). El verde `confirm` solo en pantallas de éxito (pago, check-in aprobado).
- Mapas: **MapLibre + OSM**. Sin Google Maps, Places ni Mapbox como dependencia de producto.
- Sesión (access + refresh) y token de tiquete (QR) son **familias distintas**; la app nunca usa el access del asistente para escanear.
- Varias personas operan el mismo evento: la UI se filtra por **membresía + permiso**, no por un rol global.

## Quick path

1. Arrancar con `pnpm start` (solo pnpm). Hoy hay tabs Home / Explore de plantilla; el producto reemplaza esa UI.
2. Sprint 1: cuenta, agenda, detalle de evento, mapa con pin, CRUD de organizador (flyer + coordenadas).
3. Sprint 2: perfiles, lineup, follows, audio de referencia, invitaciones de staff.
4. Sprint 3: compra, wallet de QR, scanner multi-dispositivo, métricas de evento, cola de aprobación (admin).

## Problema que resuelve

La escena está dispersa (Facebook, chats, flyers). La app es el **cliente de uso diario**: descubrir fiestas, seguir talento, comprar sin reventa opaca, y operar la puerta con varios scanners a la vez.

| Actor | Dolor hoy | Qué hace la app |
|-------|-----------|-----------------|
| Asistente | No hay una agenda única; tiquetes en screenshots | Explora, compra, muestra QR, transfiere |
| Artista / DJ | Poca vitrina local | Perfil, lineup, seguidores |
| Promoter | Publicar y controlar aforo a mano | Publica, invita staff, ve ventas y puerta |
| Staff de puerta | Un login compartido; doble ingreso | Cada quien escanea con su cuenta |
| Platform admin | Calidad desigual de publicaciones | Aprueba o rechaza eventos |

## Relación con el resto del sistema

```
App Expo (este repo)
        │ HTTPS REST /v1  Authorization: Bearer <access>
        ▼
   API Go ── Redis (check-in, membership) ── Postgres
        └── ObjectStore (flyers, galería, audio, avatares)
```

| Superficie | Repo | Qué no hace la app |
|------------|------|---------------------|
| App | `app-frontend` | SEO, landing de campañas |
| Web | `web-frontend` | Tiquetería completa, cámara de puerta, wallet nativo |
| API | `backend` | UI; el cliente no firma QR ni hace `SETNX` |

Errores de API (`VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `CONFLICT`, `GONE`) se muestran en español, cortos. El `request_id` no se enseña al usuario; sí se puede copiar en un flujo de soporte.

## Identidades en la UI

Un usuario **no** es “el staff”. Perfil de plataforma ≠ membresía de un evento.

### Perfiles de plataforma

| Perfil | Pantallas que se desbloquean | Qué no ve |
|--------|------------------------------|-----------|
| `attendee` | Explorar, detalle, compra, mis tiquetes, follows, perfil | Métricas, scanner, editor de evento |
| `artist` | Perfil público de artista, edición de bio/avatar | Caja ni puerta salvo membresía |
| `promoter` | Crear/editar eventos del tenant, invitaciones, métricas de *sus* eventos | Eventos de otros tenants |
| `platform_admin` | Cola de aprobación | No sustituye al promoter en puerta |

Se puede ser asistente + artista. El promoter invita al resto.

### Membresía por evento (chrome contextual)

Tras `GET /v1/me` y `GET /v1/me/memberships`, la app muestra **acciones por evento**, no un único “modo organizador” global.

| Rol de evento | Qué muestra la app en ese evento |
|---------------|----------------------------------|
| `owner` | Editar, media, lineup, invitaciones, tipos de tiquete, métricas, acceso a puerta |
| `manager` | Editar, media, métricas, invitar `door`; no borrar ni transferir ownership |
| `door` | Scanner + aforo en vivo; **sin** ingresos ni PII de compradores |
| `metrics` | Dashboard de solo lectura; **sin** cámara de check-in |

La UI autoriza por **permiso atómico** (mismo contrato que el backend). Si el API responde `FORBIDDEN`, se oculta o se deshabilita la acción y se explica por qué.

| Permiso | Superficie en app |
|---------|-------------------|
| `event.write` | Formulario de evento, flyer, pin, galería |
| `event.publish` | Enviar a revisión / publicar |
| `event.members.manage` | Lista e invitaciones de staff |
| `event.metrics.read` | Dashboard |
| `event.door.scan` | Cámara / check-in |
| `event.door.live` | Contador y últimos scans |
| `event.tickets.manage` | Tipos de tiquete y aforo |

Revocar membresía: el access JWT **sigue vivo**, pero la app deja de mostrar puerta/métricas en cuanto falle el API o se refresque membresía. No cachear permisos como fuente de verdad más allá de una sesión corta.

## Arquitectura de información

Navegación objetivo (reemplaza Home/Explore de plantilla):

| Tab / stack | Quién | Contenido |
|-------------|-------|-----------|
| **Agenda** | Todos (lectura pública parcial) | Próximos eventos, hero tipo flyer |
| **Explorar** | Todos | Mapa + lista; filtros en Sprint 4 |
| **Tiquetes** | `attendee` autenticado | Wallet QR; vacío si no hay compras |
| **Parche** (yo) | Autenticado | Perfil, follows, membresías, salir |
| **Operar** (o entrada desde detalle) | Quien tenga membresía | Mis eventos, puerta, métricas |

Flujos fuera de tabs: auth, detalle de evento, detalle de artista, checkout, scanner a pantalla completa, invitación profunda (`/invites/{token}`).

Invitados pueden ver agenda y detalle público. Compra, QR, follows, crear evento y puerta piden cuenta.

## Funcionalidades por sprint

### Sprint 1 — MVP: cuenta, agenda, mapa, publicación

Objetivo: una agenda centralizada y un promoter que publica con flyer y pin.

| ID | Historia | Comportamiento en app |
|----|----------|------------------------|
| RC-001 | Registro | Email + contraseña; perfil inicial `attendee` o `promoter`. Validación en cliente + códigos del API. No revelar si el email ya existe (mismo mensaje genérico que login). |
| RC-002 | Login | Access en memoria; refresh en almacenamiento seguro nativo (`SecureStore`). Refresh al expirar el access (10–15 min). Logout revoca familia. |
| RC-003 | Crear evento | Nombre, fecha, descripción, venue (texto), **pin en mapa** (`lat`/`lng` obligatorio al publicar), flyer vía presign (`POST /v1/uploads` → PUT → confirmar asset). |
| RC-004 | Lista de eventos | Cursor + limit; flyer, fecha, venue. Caché de lista no debe mostrar eventos stale tras pull-to-refresh. |
| RC-005 | Detalle | Flyer, copy, mapa estático/interactivo del pin, lineup cuando exista. CTA según rol: comprar / editar / escanear. |
| RC-022 | Editar evento | `PATCH` con `event.write`. Mismo formulario que crear. |

**Mapa:** MapLibre GL + teselas OSM. El promoter **suelta el pin**; geocoding (Nominatim/Photon) es opcional. Listados y detalle usan `lat`/`lng` del API. Sin SDK de Google.

**Media:** no subir al bucket abierto. Flujo: presign (TTL corto) → PUT con `Content-Type` fijo → `POST` assets. Límites: imagen 8 MB (jpeg/png/webp). Estados de UI: eligiendo, subiendo, error, listo.

**Auth en dispositivo:**

| Token | Dónde | No hacer |
|-------|-------|----------|
| Access | memoria | No en AsyncStorage en claro como único store |
| Refresh | SecureStore (nativo) | No loguear ni mandar a crash reports |
| Ticket QR | wallet local + API | No es el access JWT |

Reuso de refresh rotado: tratar como sesión invalidada; volver a login.

### Sprint 2 — Comunidad: artistas, audio, staff

| ID | Historia | Comportamiento en app |
|----|----------|------------------------|
| RC-006 | Perfil de artista | Crear/editar bio, avatar (`kind: avatar`), enlaces mínimos. Visible en público. |
| RC-007 | Lineup | Owner/manager asocia/quita artistas al evento. Orden visible en detalle. |
| RC-008 | Ver artista | Trayectoria corta + próximos eventos. |
| RC-009 | Follow | Solo autenticado; lista en `GET /v1/me/following`. |
| RC-010 | Perfil personal | Nombre, foto; `PATCH /v1/me`. |

**Audio de referencia:** `PUT /v1/events/{id}/tracks`. Preview corto (mpeg/ogg/wav, 20 MB). Reproducción in-app; URL de corta vida, no hotlink en UI webview genérica.

**Invitaciones (no es un RC académico; es decisión de repo):** el owner/manager invita por email o usuario + rol (`door` / `manager` / `metrics`). El invitado abre deep link, entra con su cuenta (o se registra) y acepta. **Prohibido** un login compartido de “la puerta”. Lista de miembros con estado `pending` / `active` / `revoked`.

### Sprint 3 — Tiquetes, QR, puerta, métricas, aprobación

| ID | Historia | Comportamiento en app |
|----|----------|------------------------|
| RC-011 | Comprar | Elige `ticket_type` → order `pending` → abre pasarela → vuelve a la app. Reserva visible como “pendiente”; si falla o expira, se libera aforo y se explica. |
| RC-012 | Mis tiquetes | Lista `valid` / `used` / `transferred`. QR = **token firmado**, no UUID crudo. Brillo alto, modo offline corto si el token ya está en dispositivo (validación real es en puerta). |
| RC-013 | Check-in | Staff con `event.door.scan`. Cámara → `POST /v1/events/{eventId}/check-in` con ticket token + access **del scanner**. Varios dispositivos a la vez. |
| RC-014 | Transferir | Dueño elige usuario destino; el QR anterior deja de valer. Confirmación explícita. |
| RC-015 | Aprobación | `platform_admin`: cola, aprobar/rechazar. El promoter ve estado `en revisión` / `publicado` / `rechazado`. |

**Resultados de scan (pantalla a prueba de sol, una palabra + color de semáforo; verde solo `confirm` en aprobado):**

| Código API | UI |
|------------|-----|
| `approved` | Pasa — pantalla `confirm` |
| `duplicate` | Ya usado |
| `invalid` | Código inválido |
| `wrong_event` | Otro evento |
| `expired` | Vencido |
| `forbidden` | Sin permiso de puerta |

Aforo en vivo (`GET .../door/live`): contador y últimos scans **sin** datos de comprador más allá de lo necesario para operar. Un `door` no ve ingresos. Un `metrics` no abre la cámara.

**Métricas de evento** (`event.metrics.read`): vendidos / reservados / disponibles por tipo; ingresos brutos (si hay precio); check-ins vs vendidos; no-show; scans por persona de puerta; serie por hora en la noche. Agregados, no PII.

### Sprint 4 — Descubrimiento y experiencia

| ID | Historia | Comportamiento en app |
|----|----------|------------------------|
| RC-016 | UI/UX | Pulido de navegación, vacíos, errores, accesibilidad (contraste del flyer B/N, tamaños de toque). |
| RC-017 | Búsqueda y filtros | Fecha, subgénero, artista, texto `q`; bbox del mapa si el API lo expone. |
| RC-018 | Recomendaciones | `GET /v1/me/recommendations` en Agenda; vacío honesto si no hay señales. |
| RC-019 | Posts / editorial | Aplazado: no hay lectura en la app. Blog futuro en `web-frontend` sobre `GET /v1/posts`. |
| RC-020 | Rendimiento percibido | Listas virtualizadas, flyers con tamaño adecuado, check-in sin spinner largo (el cuello es la puerta, no el listado). |

Métricas de tenant (`GET /v1/tenants/{id}/metrics`): owner del colectivo; no mezclar con el dashboard de un solo evento.

## Flujos críticos (cliente)

### Compra

1. Asistente autenticado elige tipo y cantidad.
2. App crea order; muestra “reservado” y abre pasarela.
3. Al volver, consulta `GET /v1/orders/{id}` hasta `paid` / `failed` / `expired` (no inventar `valid` en local).
4. Wallet muestra QR solo si el tiquete está `valid`.

Errores de red: no doble-tap de compra; el API es idempotente en webhook, el cliente debe serlo en el botón.

### Puerta (varios scanners)

1. Staff elige el evento de su membresía `door` (o `owner`/`manager` con permiso de scan).
2. Pantalla inmersiva: cámara + aforo.
3. Cada frame útil envía el token del QR; la app **no** decide approved/duplicate en local.
4. Feedback inmediato según código; el mismo QR no “pasa” dos veces aunque dos teléfonos escaneen juntos.

Sin permiso: no abrir cámara. Tras revocación: el siguiente scan falla `forbidden` y se sale del modo puerta.

### Deep links

| Ruta lógica | Uso |
|-------------|-----|
| Evento | Compartir flyer / abrir detalle |
| Artista | Perfil público |
| Invitación | Aceptar membresía |
| Retorno de pago | Cerrar pasarela y refrescar order |

## Estados de UI (obligatorios)

Cada flujo de red tiene: **carga**, **vacío**, **error recuperable**, **éxito**. Mensajes de usuario en español. No fallar en silencio.

| Flujo | Vacío | Error típico |
|-------|-------|----------------|
| Agenda | “Aún no hay fechas” | Reintentar listado |
| Wallet | “No tienes tiquetes” + CTA explorar | Pago pendiente / fallido |
| Puerta | “Apunta al QR” | Cámara denegada (ajustes del SO) |
| Métricas | Ceros honestos antes de ventas | `FORBIDDEN` si no es staff |
| Follows | “Todavía no sigues a nadie” | — |

Permisos de SO: cámara (scanner), opcional ubicación (centrar mapa; el pin del evento **no** depende del GPS del asistente).

## Fuera de alcance (ahora)

- Sustituir Expo por la web Next o por React + Supabase + Netlify.
- Tiquetería completa en `web-frontend`.
- Emails masivos, directorio de clubes (RC-023–025).
- Reset de contraseña (RC-021) hasta backlog.
- Motor de recomendaciones antes de Sprint 4.
- Transcodificación avanzada de audio.
- Un login compartido para toda la puerta.
- Google Maps u otro SDK propietario de mapas.
- CMS de noticias con editor rico en la app.

## Mapeo sprint → entregable de app

| Sprint | Historias | App |
|--------|-----------|-----|
| 1 MVP | RC-001–005, RC-022 | Auth seguro, agenda, detalle, mapa OSM, crear/editar evento + flyer |
| 2 Comunidad | RC-006–010 | Artistas, lineup, follows, perfil, tracks, invitaciones de miembros |
| 3 Transacciones | RC-011–015 | Orders, wallet QR, scanner multi-dispositivo, métricas de evento, cola admin |
| 4 Experiencia | RC-016–020 | Filtros/mapa bbox, recomendaciones, pulido UX (editorial aplazado a web) |
| Backlog | RC-021, RC-023–025 | Reset password, clubes, panel global de usuarios, email |

## Checklist de aceptación

- [ ] Registro y login; access corto + refresh en almacenamiento seguro; logout cierra la familia.
- [ ] Invitado ve agenda y detalle; no compra ni escanea.
- [ ] Promoter crea evento con flyer, pin OSM y texto; el detalle público lo muestra.
- [ ] El mapa no usa Google Maps; solo coordenadas de la API + MapLibre/OSM.
- [ ] Artista tiene perfil; asistente sigue y ve lineup en el evento.
- [ ] Compra `paid` abre la impresión térmica del tiquete ([FEAT-023](../features/feat-023-ticket-print.md)) antes del wallet; el QR es el token firmado; transferir invalida el QR anterior.
- [ ] Dos usuarios `door` escanean a la vez; el mismo QR no entra dos veces; UI de `duplicate` vs `approved`.
- [ ] Un `door` no ve ingresos ni edita el evento; `metrics` ve dashboard y no abre cámara.
- [ ] Revocar miembro: deja de poder escanear aunque el JWT de sesión siga válido.
- [ ] Admin aprueba/rechaza; promoter ve el estado.
- [ ] Chrome B/N según `docs/ui/design.md`; `confirm` solo en éxito de pago o check-in.
- [ ] Errores de API en español; sin tokens en logs de cliente.
- [ ] Docs de producto de este archivo coinciden con pantallas reales al cerrar cada sprint.

## Next step

Specs atómicas de pantallas y flujos: [docs/features](../features/README.md). Implementar por `FEAT-xxx`, sin saltarse [FEAT-023](../features/feat-023-ticket-print.md) en la emisión. El primer código de producto sustituye las tabs de plantilla (FEAT-001 + 005 + 006 + auth).
