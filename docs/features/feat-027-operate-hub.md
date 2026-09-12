# FEAT-027: Hub operar

Punto de entrada para quien tiene membresías: mis eventos, puerta, métricas, equipo. No es un admin global. La densidad cambia según el rol de evento, no según un skin.

| Campo | Valor |
|-------|-------|
| Sprint | 2–3 |
| RC | RC-003, RC-013, RC-015 |
| Permiso UI | ≥1 membership `active` o perfil promoter |
| Pantallas | Tab `Operar` |

## Quick path

1. Ver fechas donde el user es owner/manager/door/metrics.
2. Una acción primaria por fecha; el resto en sheet “Más”.
3. Promoter: CTA crear ([FEAT-008](feat-008-event-create.md)).

## Pantallas

`EventCard` listing (foto-first) + un CTA. No inventar un tercer layout. HubCard deja de ser el default de fechas.

| Densidad | Cómo se siente |
|----------|----------------|
| Host (owner/manager) | Listings grandes, CTA Crear, “Continuar setup” si el draft está incompleto |
| Puerta | Hero de la próxima fecha + CTA Puerta; el resto en `row` |
| Métricas | Listing con CTA Métricas |
| Vacío promoter | “Crea tu primera fecha” |
| Vacío door | “Cuando te inviten, escaneas aquí” |
| Vacío metrics | “Sin fechas con números todavía” |

La primaria sale del **rol de esa membresía**:

| Rol | Primaria |
|-----|----------|
| owner / manager | Continuar setup (draft incompleto) o Editar |
| door | Puerta |
| metrics | Métricas |

Overflow (sheet): Detalle, Lineup, Tracks, Tipos, Equipo, Aforo, y lo que el permiso atómico permita. Lineup y tracks ya no viven solo en el detalle.

Si el user es promoter y también door, Operar se siente host (listings). Door-only ve scanner-first.

Chips de rol localizados: Owner / Manager / Puerta / Métricas. Status con `statusLabel`.

## Flujo

`GET /v1/me/memberships`. Vacío promoter sin eventos: CTA crear. Vacío door sin events: no debería verse el tab (revocados filtrados).

## Estados

Carga: skeleton. Error: reintentar.

## Contrato

Memberships resumidas en `me` + endpoint memberships. UI autoriza por permiso atómico.

## Fuera de alcance

Dashboard de todos los tenants. Billing (`tenant.billing.read` futuro). Rediseño interno de puerta/métricas/tipos.

## Checklist

- [ ] `door` no ve “ingresos” ni editar como primaria.
- [ ] Eventos ajenos no listan.
- [ ] Tab oculto sin membresía ni promoter.
- [ ] Detalle y Operar comparten `EventStaffActions`.

## Relacionadas

[FEAT-001](feat-001-shell-navigation.md), [FEAT-008](feat-008-event-create.md), [FEAT-028](feat-028-door-scanner.md), [FEAT-030](feat-030-event-metrics.md)
