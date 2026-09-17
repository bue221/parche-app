# FEAT-005: Explorar (listado)

El asistente ve las próximas fechas foto-first: SearchBar, chips con icono, rieles horizontales y un grid 4:5 debajo. Es el home de producto. El tab se llama **Explorar**; la ruta sigue siendo `/`. No hay título de página en el tab.

| Campo | Valor |
|-------|-------|
| Sprint | 1 |
| RC | RC-004 |
| Permiso UI | Público (opcional Bearer) |
| Pantallas | Tab `Explorar` (`index`) |

## Quick path

1. Abrir Explorar.
2. Scroll de eventos próximos con flyer.
3. Tap → [FEAT-007](feat-007-event-detail.md).

## Pantallas

| Zona | Regla |
|------|-------|
| Hero | SearchBar pill (abre filtros). Chips con icono: Todo + Hoy / Finde / Este mes + géneros. El riel es full-bleed: el primer chip alinea con el SearchBar y el resto se asoma hasta el borde de la pantalla. Todo limpia fecha y género (no el `q`). Sin `PageHeader`. |
| Rieles | `SectionRail` + `EventCard` overlay compacto: **2 cards + peek** (~168px), full-bleed como los chips. Orden: **Esta noche**, **Para ti**, un riel por género si no hay filtro de género. Chevron aplica el filtro del riel; Para ti no lleva flecha. |
| Lista | Título “Todas las fechas” + grid listing 4:5 overlay en **2 columnas** en teléfono. Los rieles recortan; el grid es la agenda completa. |
| Guardar | Corazón 44px en el flyer (listing); no abre el detalle. Funciona sin sesión ([FEAT-037](feat-037-local-interest.md)). |
| Pull-to-refresh | Invalida lista local |
| Promoter | CTA **Crear fecha** compacto bajo el SearchBar; no es el home de Operar |

Rail **Esta noche**: same-day, badge “Esta noche”, countdown a `startsAt` (aurora). Chips usan `FadeSlideIn` / `PressScale`. Sprint 4: [FEAT-033](feat-033-recommendations.md) (“Para ti”) encima del grid, no en lugar de Esta noche.

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

Mapa (tab Mapa). Crear evento (CTA solo si `promoter`, va a [FEAT-008](feat-008-event-create.md)).

## Checklist

- [ ] Flyer + fecha visibles sin entrar al detalle.
- [ ] Invitado puede leer la lista.
- [ ] Refresh no deja eventos publicados hace un minuto fuera si el API ya los trae.
- [ ] Promoter sigue viendo Crear fecha.

## Relacionadas

[FEAT-006](feat-006-explore-map.md), [FEAT-007](feat-007-event-detail.md), [FEAT-033](feat-033-recommendations.md), [FEAT-037](feat-037-local-interest.md)
