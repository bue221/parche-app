# Project rules

Product and engineering rules for Parche live in this folder. Agents and humans should read the relevant file here before changing that area.

| Doc | Use when |
|-----|----------|
| [product/prd.md](product/prd.md) | Product scope for the Expo app: personas, screens, sprint features, door/QR, IA |
| [features/README.md](features/README.md) | Index of atomic feature specs (screens and flows). Read the matching `feat-xxx` before building that slice |
| [ui/design.md](ui/design.md) | Building or restyling UI: light/dark tokens, type, radii, components, icons |
| [ui/ux.md](ui/ux.md) | Motion, cards, forms, feedback, shell hit targets |

### Feature specs

Do not implement a slice without its spec. Ticket issuance is [FEAT-023](features/feat-023-ticket-print.md) (print animation), not a fade-in QR.

| Doc | Feature |
|-----|---------|
| [features/feat-001-shell-navigation.md](features/feat-001-shell-navigation.md) | Shell y tabs |
| [features/feat-002-auth-register.md](features/feat-002-auth-register.md) | Registro |
| [features/feat-003-auth-login.md](features/feat-003-auth-login.md) | Login |
| [features/feat-004-auth-session.md](features/feat-004-auth-session.md) | Sesión refresh/logout |
| [features/feat-005-agenda.md](features/feat-005-agenda.md) | Agenda |
| [features/feat-006-explore-map.md](features/feat-006-explore-map.md) | Mapa explorar |
| [features/feat-007-event-detail.md](features/feat-007-event-detail.md) | Detalle evento |
| [features/feat-008-event-create.md](features/feat-008-event-create.md) | Crear evento |
| [features/feat-009-event-edit.md](features/feat-009-event-edit.md) | Editar evento |
| [features/feat-010-media-upload.md](features/feat-010-media-upload.md) | Media presign |
| [features/feat-011-map-pin.md](features/feat-011-map-pin.md) | Pin de publicación |
| [features/feat-012-profile-me.md](features/feat-012-profile-me.md) | Perfil personal |
| [features/feat-013-artist-edit.md](features/feat-013-artist-edit.md) | Editar artista |
| [features/feat-014-artist-public.md](features/feat-014-artist-public.md) | Artista público |
| [features/feat-015-event-lineup.md](features/feat-015-event-lineup.md) | Lineup |
| [features/feat-016-artist-follow.md](features/feat-016-artist-follow.md) | Follow |
| [features/feat-017-event-tracks.md](features/feat-017-event-tracks.md) | Audio del evento |
| [features/feat-018-event-members.md](features/feat-018-event-members.md) | Staff / miembros |
| [features/feat-019-invite-accept.md](features/feat-019-invite-accept.md) | Aceptar invitación |
| [features/feat-020-ticket-types.md](features/feat-020-ticket-types.md) | Tipos de tiquete |
| [features/feat-021-ticket-purchase.md](features/feat-021-ticket-purchase.md) | Compra |
| [features/feat-022-order-return.md](features/feat-022-order-return.md) | Vuelta de pago |
| [features/feat-023-ticket-print.md](features/feat-023-ticket-print.md) | Impresión animada del tiquete |
| [features/feat-024-ticket-wallet.md](features/feat-024-ticket-wallet.md) | Wallet |
| [features/feat-025-ticket-qr.md](features/feat-025-ticket-qr.md) | Mostrar QR |
| [features/feat-026-ticket-transfer.md](features/feat-026-ticket-transfer.md) | Transferir |
| [features/feat-027-operate-hub.md](features/feat-027-operate-hub.md) | Hub operar |
| [features/feat-028-door-scanner.md](features/feat-028-door-scanner.md) | Scanner puerta |
| [features/feat-029-door-live.md](features/feat-029-door-live.md) | Aforo en vivo |
| [features/feat-030-event-metrics.md](features/feat-030-event-metrics.md) | Métricas |
| [features/feat-031-admin-approval.md](features/feat-031-admin-approval.md) | Aprobación admin |
| [features/feat-032-search-filters.md](features/feat-032-search-filters.md) | Filtros |
| [features/feat-033-recommendations.md](features/feat-033-recommendations.md) | Recomendaciones |
| [features/feat-034-editorial-posts.md](features/feat-034-editorial-posts.md) | Editorial aplazado (blog web futuro) |
| [features/feat-035-deep-links.md](features/feat-035-deep-links.md) | Deep links |
| [features/feat-036-device-permissions.md](features/feat-036-device-permissions.md) | Permisos de dispositivo |

## How to add a rule doc

Required in the same change as the new file:

1. Put it under `docs/<area>/`.
2. Add a row to the table in this file.
3. Add a row to the index table in [AGENTS.md](../AGENTS.md).
