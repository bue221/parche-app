# F27 Admin de plataforma

Operación Parche: aprobar eventos, desactivar users, asignar `platform_admin`, métricas globales y broadcasts (F26).

**Depends on:** F06, F08, F26  
**Unlocks:** RC-015, RC-024, RC-025  
**Stories:** RC-015, RC-024, RC-025

## Quick path

1. Seed primer admin (env `BOOTSTRAP_ADMIN_EMAIL` en migrate).
2. Rutas `/v1/admin/*` con perfil `platform_admin`.
3. Aprobar/rechazar cola `pending_review`.
4. Gestión de users: status, perfiles.

## HTTP

### Eventos

| Método | Ruta | Efecto |
|--------|------|--------|
| GET | `/v1/admin/events?status=pending_review` | cola |
| POST | `/v1/admin/events/{id}/approve` | `published`, invalidar caché, job follows email |
| POST | `/v1/admin/events/{id}/reject` | body `{ "reason": "…" }` → `rejected`; email promoter |

### Users (RC-024)

| Método | Ruta | Efecto |
|--------|------|--------|
| GET | `/v1/admin/users?q=` | busca email/nombre |
| GET | `/v1/admin/users/{id}` | perfiles, tenants, status |
| POST | `/v1/admin/users/{id}/disable` | status disabled; revoca sesiones (epoch++) |
| POST | `/v1/admin/users/{id}/enable` | |
| POST | `/v1/admin/users/{id}/profiles` | `{ "profile": "platform_admin"\|"promoter", "op": "add"\|"remove" }` |

No disable del último platform_admin.

### Métricas globales

`GET /v1/admin/metrics` counts: users, events published, GMV 30d.

### Broadcasts

Ver F26 `POST /v1/admin/broadcasts`.

## Seguridad

- Audit log tabla `admin_audit`: admin_id, action, target, ts, payload redacted.
- 2FA no en MVP de código: documentar que el admin usa password fuerte + epoch; **incluido:** rate limit más duro en `/v1/admin/*`.
- Admin **no** tiene `event.door.scan` implícito.

## Checklist

- [x] Approve publica y cache drop
- [x] Reject con reason
- [x] Disable user tumba refresh
- [x] Audit de cada acción
- [x] Bootstrap email

Admin uses a strong password plus `session_epoch` (no 2FA in MVP). `/v1/admin/*` is rate-limited harder than public list; broadcasts tighter still.

## Next step

Catálogo F01–F27 cerrado; F28–F30 amplían auth liviana y saves.
