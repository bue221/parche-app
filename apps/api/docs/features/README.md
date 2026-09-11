# Features del backend

Cada archivo de esta carpeta es **una unidad implementable** del [PRD](../prd.md). No hay backlog paralelo: si está en el producto, está aquí con contrato, datos, errores y aceptación.

## Quick path

1. Lee el PRD para el porqué.
2. Implementa en orden de dependencia (`F01` → `F02` → …). No saltes `F03`/`F04`/`F06`/`F11` si vas a tocar puerta o media.
3. Cierra el checklist de la feature antes de abrir la siguiente.

## Orden y dependencias

```
F01 runtime
 └─ F02 contrato HTTP
     ├─ F03 object store
     ├─ F04 sesión
     │    └─ F05 contraseña
     └─ F06 tenants y perfiles
          ├─ F07 venues y mapa
          ├─ F08 eventos
          │    ├─ F09 media imagen
          │    ├─ F10 audio
          │    ├─ F11 miembros (puerta / métricas)
          │    ├─ F12 artistas y lineup
          │    ├─ F15 tipos de tiquete
          │    │    ├─ F16 checkout
          │    │    ├─ F17 QR
          │    │    ├─ F18 transferencia
          │    │    └─ F19 check-in
          │    ├─ F20 métricas evento
          │    └─ F27 aprobación admin
          ├─ F13 follows
          ├─ F14 perfil me
          ├─ F21 métricas tenant
          ├─ F22 búsqueda
          ├─ F23 editorial
          ├─ F24 recomendaciones
          ├─ F25 clubes
          └─ F26 email
```

## Catálogo

| ID | Feature | Qué entrega |
|----|---------|-------------|
| [F01](F01-runtime.md) | Runtime Docker | Compose, api, worker, Postgres, Redis, broker, health |
| [F02](F02-http-contract.md) | Contrato HTTP | `/v1`, errores, logs, CORS, rate limit, OpenAPI |
| [F03](F03-object-store.md) | Object store | Puerto MinIO/FS/S3, presign, keys |
| [F04](F04-auth-session.md) | Auth y sesión | Register, login, refresh rotativo, logout, JWT |
| [F05](F05-password-recovery.md) | Recuperar contraseña | Forgot/reset con token de un uso |
| [F06](F06-tenants-profiles.md) | Tenants y perfiles | Colectivo, `attendee`/`artist`/`promoter`/`platform_admin` |
| [F07](F07-venues-maps.md) | Venues y mapa | lat/lng, address, bbox, GeoJSON, sin Google |
| [F08](F08-events-lifecycle.md) | Ciclo de vida de eventos | CRUD, estados, publicar, caché |
| [F09](F09-event-media.md) | Media de evento | Flyer, galería, thumbs, confirmación de asset |
| [F10](F10-event-audio.md) | Audio de evento | Tracks, preview, transcode |
| [F11](F11-event-members.md) | Miembros e invitaciones | Roles de evento, N personas en puerta, revocación |
| [F12](F12-artists-lineup.md) | Artistas y lineup | Perfil DJ, vincular a evento |
| [F13](F13-artist-follows.md) | Follows | Seguir artista |
| [F14](F14-user-profile.md) | Perfil personal | `GET/PATCH /me`, avatar |
| [F15](F15-ticket-types.md) | Tipos de tiquete | Precio, aforo, ventana de venta |
| [F16](F16-checkout-payments.md) | Checkout y pagos | Order, reserva, webhook, idempotencia |
| [F17](F17-ticket-qr.md) | Emisión QR | JWS de tiquete, clave distinta a sesión |
| [F18](F18-ticket-transfer.md) | Transferencia | Cesión, invalidar `jti` anterior |
| [F19](F19-door-checkin.md) | Check-in multi-scanner | Firma + SETNX + worker + live |
| [F20](F20-event-metrics.md) | Métricas de evento | Ventas, aforo, scans por persona |
| [F21](F21-tenant-metrics.md) | Métricas de tenant | Caja del colectivo |
| [F22](F22-event-search.md) | Búsqueda y filtros | q, fecha, género, artista, bbox |
| [F23](F23-editorial-posts.md) | Editorial / blog | Posts públicos de cultura techno |
| [F24](F24-recommendations.md) | Recomendaciones | Sugerencias por follows y géneros |
| [F25](F25-clubs-directory.md) | Directorio de clubes | Venues persistentes explorables |
| [F26](F26-transactional-email.md) | Email transaccional | Reset, invite, compra, digest admin |
| [F27](F27-platform-admin.md) | Admin de plataforma | Aprobar eventos, gestionar usuarios y roles |

## Cómo está escrita cada feature

| Sección | Para qué |
|---------|----------|
| Quick path | Orden de implementación |
| HTTP | Rutas, auth, bodies |
| Datos | Tablas y campos |
| Errores | Códigos al cliente + qué se loguea |
| Seguridad | Tokens, permisos, límites |
| Checklist | Hecho / no hecho |

## Historias RC → feature

| Historia | Feature |
|----------|---------|
| RC-001 Registro | F04, F06 |
| RC-002 Login | F04 |
| RC-003 Crear evento | F08, F07, F09 |
| RC-004 Lista | F08, F22 |
| RC-005 Detalle | F08, F09, F10, F12 |
| RC-006 Perfil artista | F12 |
| RC-007 Lineup | F12 |
| RC-008 Ver artista | F12 |
| RC-009 Follow | F13 |
| RC-010 Perfil personal | F14 |
| RC-011 Comprar | F15, F16 |
| RC-012 Mis tiquetes QR | F17 |
| RC-013 Check-in | F11, F19 |
| RC-014 Transfer | F18 |
| RC-015 Aprobación | F27 |
| RC-016 UI rápida | F02 (latencia/errores) |
| RC-017 Búsqueda | F22 |
| RC-018 Recomendaciones | F24 |
| RC-019 Blog | F23 |
| RC-020 Rendimiento API | F01, F19, caché F08 |
| RC-021 Contraseña | F05 |
| RC-022 Editar evento | F08 PATCH |
| RC-023 Clubes | F25 |
| RC-024 Gestión users | F27 |
| RC-025 Email | F26 |

## Checklist de carpeta

- [x] Toda historia RC-001–025 tiene dueño en una feature
- [x] Nada del PRD (media, mapa, RBAC, QR, métricas, email, clubes, admin) quedó “para después”
- [x] Cada feature nueva se enlaza **aquí** y en [docs/README.md](../README.md)

## Next step

Empieza por [F01](F01-runtime.md).
