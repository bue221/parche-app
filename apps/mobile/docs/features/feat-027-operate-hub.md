# FEAT-027: Hub operar

Punto de entrada para quien tiene membresías: listado de eventos, y al entrar, la mesa de ese evento (editar, puerta, métricas, equipo). No es un admin global. La densidad cambia según el rol de evento, no según un skin.

| Campo | Valor |
|-------|-------|
| Sprint | 2–3 |
| RC | RC-003, RC-013, RC-015 |
| Permiso UI | ≥1 membership `active` o perfil promoter |
| Pantallas | Tab `Operar`; mesa `/event/[id]/operate` |

## Quick path

1. Ver eventos donde el user es owner/manager/door/metrics, agrupados por urgencia: esta semana, más adelante, borradores y finalizados.
2. Filtrar con el buscador (nombre, venue, barrio) o los chips de grupo, sin salir del hub. Título + buscador + chips quedan fijos al hacer scroll.
3. Tap en la card abre la mesa de ese evento. El listing no lleva Editar ni Más.
4. En la mesa: una primaria según el rol; el resto visible como filas. “Ver ficha pública” aparte.
5. Promoter: FAB fijo **Crear evento** ([FEAT-008](feat-008-event-create.md)), sobre el tab bar.

## Pantallas

Hub: `EventCard` listing (foto-first) en **grilla de 2 columnas**. El `PageHeader` **Operar**, el buscador y los chips de grupo viven en `Screen stickyHeader` (no scrollean). Grupos por trabajo, no por un dump de publicados:

| Grupo | Qué entra | Orden |
|-------|-----------|--------|
| Esta semana | Publicados que empiezan en 7 días (o ya empezaron y no han cerrado) | Fecha asc |
| Más adelante | Publicados con fecha más lejana | Fecha asc |
| Borradores | Draft / en revisión / rechazado, aún no finalizados | Fecha asc |
| Finalizados | `eventHasEnded` | Fecha desc |

Chips: **Todos** + un chip por grupo con conteo. Tap filtra el catálogo. Buscador (nombre, venue, barrio, género, rol). No inventar un tercer layout de card. HubCard deja de ser el default de eventos. Tap = mesa. Chip de rol bajo la card; en borradores también el status. Door-only: badge **Esta noche** en la próxima puerta. Promoter: `CreateEventFab` bottom-right, `bg-primary`, hit ≥56px, fijo sobre el tab bar (en wide, 24px del borde).

| Densidad | Cómo se siente |
|----------|----------------|
| Host (owner/manager) | Catalog cards, FAB Crear evento, “Continuar setup” al entrar si el draft está incompleto |
| Puerta | Misma grilla; el próximo evento lleva badge Esta noche. Al entrar, primaria Puerta |
| Métricas | Listing; al entrar, primaria Métricas |
| Vacío promoter | “Crea tu primer evento” + CTA crear |
| Vacío door | “Cuando te inviten, escaneas aquí” |
| Vacío metrics | “Sin eventos con números todavía” |
| Sin sesión | `GuestPanel` Entrar (el tab suele estar oculto) |

Mesa `/event/[id]/operate`: **no es el detalle público**. Nombre + flyer chico + rol/status. La primaria sale del **rol de esa membresía**:

| Rol | Primaria |
|-----|----------|
| owner / manager | Continuar setup (draft incompleto) o Editar |
| door | Puerta |
| metrics | Métricas |

Resto visible (filas, no sheet “Más”): Artistas, Tracks, Etapas, Equipo, Puerta, Aforo, Métricas, según permiso atómico. CTA outline “Ver ficha pública” → [FEAT-007](feat-007-event-detail.md).

**Evento finalizado** (`eventHasEnded`): tag Finalizado + aviso de consulta. Sin Continuar setup, Editar ni Puerta. Primaria = Métricas (Aforo si el rol es door). Artistas, tracks, etapas y equipo quedan en solo lectura. Aforo y métricas siguen abiertos para no perder el archivo de esa noche.

Si el user es promoter y también door, Operar se siente host (listings). Door-only ve scanner como primaria al entrar; si el evento ya pasó, ve Aforo.

Chips de rol localizados: Owner / Manager / Puerta / Métricas. Status con `statusLabel`.

## Flujo

`GET /v1/me/memberships`. Vacío promoter sin eventos: CTA crear. Vacío door sin events: no debería verse el tab (revocados filtrados). Badge: evento de membresía que empieza hoy **o** `GET /v1/me/invites` pending. Punto danger en `TabBarItem` (nativo y web compact).

Sin permiso en la mesa: redirige a la ficha pública.

## Estados

Carga: skeleton. Error: reintentar.

## Contrato

Memberships resumidas en `me` + endpoint memberships. UI autoriza por permiso atómico. `buildEventStaffActions` arma primaria + filas; `canOperateEvent` decide si hay mesa.

## Fuera de alcance

Dashboard de todos los tenants. Billing (`tenant.billing.read` futuro). Rediseño interno de puerta/métricas/etapas.

## Checklist

- [ ] `door` no ve “ingresos” ni editar como primaria.
- [ ] Eventos ajenos no listan.
- [ ] Tab oculto sin membresía ni promoter.
- [ ] Hub no muestra Editar/Más en las cards.
- [ ] Promoter ve FAB Crear evento; door/metrics no.
- [ ] Mesa y ficha pública no mezclan comprar con escanear.
- [ ] Eventos se agrupan en Esta semana / Más adelante / Borradores / Finalizados.
- [ ] Título, buscador y chips quedan fijos al scrollear Operar.
- [ ] El buscador filtra el hub sin salir de Operar.
- [ ] Evento finalizado: mesa en consulta, sin editar ni escanear.

## Relacionadas

[FEAT-001](feat-001-shell-navigation.md), [FEAT-007](feat-007-event-detail.md), [FEAT-008](feat-008-event-create.md), [FEAT-028](feat-028-door-scanner.md), [FEAT-030](feat-030-event-metrics.md)
