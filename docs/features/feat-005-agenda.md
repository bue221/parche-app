# FEAT-005: Agenda

El asistente ve las próximas fechas como un grid foto-first: imagen 4:5, día y venue debajo. Es el home de producto.

| Campo | Valor |
|-------|-------|
| Sprint | 1 |
| RC | RC-004 |
| Permiso UI | Público (opcional Bearer) |
| Pantallas | Tab `Agenda` |

## Quick path

1. Abrir Agenda.
2. Scroll de eventos próximos con flyer.
3. Tap → [FEAT-007](feat-007-event-detail.md).

## Pantallas

| Zona | Regla |
|------|-------|
| Hero | Título Inter + SearchBar + chips de día/género |
| Lista | Card listing 16px, foto 4:5, fecha, nombre, venue; lift suave |
| Pull-to-refresh | Invalida lista local |

Sprint 4: bloque de [FEAT-033](feat-033-recommendations.md) encima de la lista, no en lugar de ella.

## Flujo

`GET /v1/events` cursor + `limit` ≤ 50. Filtros vivos en [FEAT-032](feat-032-search-filters.md).

## Estados

| Estado | Copy |
|--------|------|
| Vacío | “Aún no hay fechas” |
| Error | Reintentar |
| Página siguiente | Footer de carga; no duplicar ids |

## Contrato

`GET /v1/events?from=&cursor=&limit=`. Auth opcional.

## Fuera de alcance

Mapa (Explorar). Crear evento (CTA solo si `promoter`, va a [FEAT-008](feat-008-event-create.md)).

## Checklist

- [ ] Flyer + fecha visibles sin entrar al detalle.
- [ ] Invitado puede leer la lista.
- [ ] Refresh no deja eventos publicados hace un minuto fuera si el API ya los trae.

## Relacionadas

[FEAT-006](feat-006-explore-map.md), [FEAT-007](feat-007-event-detail.md)
