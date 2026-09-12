# Specs atómicas de la app

Cada archivo de esta carpeta es **una feature**: una responsabilidad, unas pantallas, un flujo feliz y sus bordes. No se implementa código desde aquí hasta que el spec se tome en un sprint.

Fuente de producto: [PRD](../product/prd.md). Visual: [design.md](../ui/design.md). API: [backend PRD](../../../backend/docs/prd.md).

## Cómo leer

1. Abre el spec por `FEAT-xxx`.
2. El **Quick path** es el único camino que debe existir el día uno de esa feature.
3. Si un paso vive en otro spec, se enlaza; no se duplica.

## Plantilla (no crear archivos fuera de este molde)

```markdown
# FEAT-xxx: <resultado>

<Un párrafo: quién, qué, por qué.>

| Campo | Valor |
|-------|-------|
| Sprint | |
| RC | |
| Permiso UI | |
| Pantallas | |

## Quick path
## Pantallas
## Flujo
## Estados
## Contrato
## Fuera de alcance
## Checklist
## Relacionadas
```

## Mapa de specs

| ID | Spec | Sprint |
|----|------|--------|
| FEAT-001 | [Shell y navegación](feat-001-shell-navigation.md) | 1 |
| FEAT-002 | [Registro](feat-002-auth-register.md) | 1 |
| FEAT-003 | [Inicio de sesión](feat-003-auth-login.md) | 1 |
| FEAT-004 | [Sesión (refresh / logout)](feat-004-auth-session.md) | 1 |
| FEAT-005 | [Agenda](feat-005-agenda.md) | 1 |
| FEAT-006 | [Explorar mapa](feat-006-explore-map.md) | 1 |
| FEAT-007 | [Detalle de evento](feat-007-event-detail.md) | 1 |
| FEAT-008 | [Crear evento](feat-008-event-create.md) | 1 |
| FEAT-009 | [Editar evento](feat-009-event-edit.md) | 1 |
| FEAT-010 | [Subida de media](feat-010-media-upload.md) | 1 |
| FEAT-011 | [Pin de mapa](feat-011-map-pin.md) | 1 |
| FEAT-012 | [Perfil personal](feat-012-profile-me.md) | 2 |
| FEAT-013 | [Editar perfil de artista](feat-013-artist-edit.md) | 2 |
| FEAT-014 | [Perfil público de artista](feat-014-artist-public.md) | 2 |
| FEAT-015 | [Lineup](feat-015-event-lineup.md) | 2 |
| FEAT-016 | [Seguir artista](feat-016-artist-follow.md) | 2 |
| FEAT-017 | [Tracks de audio](feat-017-event-tracks.md) | 2 |
| FEAT-018 | [Miembros del evento](feat-018-event-members.md) | 2 |
| FEAT-019 | [Aceptar invitación](feat-019-invite-accept.md) | 2 |
| FEAT-020 | [Tipos de tiquete](feat-020-ticket-types.md) | 3 |
| FEAT-021 | [Comprar tiquete](feat-021-ticket-purchase.md) | 3 |
| FEAT-022 | [Vuelta de pago](feat-022-order-return.md) | 3 |
| FEAT-023 | [Impresión animada del tiquete](feat-023-ticket-print.md) | 3 |
| FEAT-024 | [Wallet](feat-024-ticket-wallet.md) | 3 |
| FEAT-025 | [Mostrar QR](feat-025-ticket-qr.md) | 3 |
| FEAT-026 | [Transferir tiquete](feat-026-ticket-transfer.md) | 3 |
| FEAT-027 | [Hub operar](feat-027-operate-hub.md) | 3 |
| FEAT-028 | [Scanner de puerta](feat-028-door-scanner.md) | 3 |
| FEAT-029 | [Aforo en vivo](feat-029-door-live.md) | 3 |
| FEAT-030 | [Métricas de evento](feat-030-event-metrics.md) | 3 |
| FEAT-031 | [Aprobación admin](feat-031-admin-approval.md) | 3 |
| FEAT-032 | [Búsqueda y filtros](feat-032-search-filters.md) | 4 |
| FEAT-033 | [Recomendaciones](feat-033-recommendations.md) | 4 |
| FEAT-034 | [Editorial / posts](feat-034-editorial-posts.md) | aplazado (blog web) |
| FEAT-035 | [Deep links](feat-035-deep-links.md) | 1–3 |
| FEAT-036 | [Permisos de dispositivo](feat-036-device-permissions.md) | 1–3 |

**Impresión del tiquete:** no aparece el QR de golpe. Tras un pago `paid`, [FEAT-023](feat-023-ticket-print.md) reproduce una **impresora térmica**: el papel sale, el flyer se estampa, el QR se imprime al final. El wallet ([FEAT-024](feat-024-ticket-wallet.md)) guarda el resultado; no sustituye esa animación.
