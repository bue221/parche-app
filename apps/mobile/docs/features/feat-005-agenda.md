# FEAT-005: Explorar (listado + mapa)

El asistente ve los próximos eventos foto-first. En teléfono: SearchBar, chips con icono, rieles horizontales y un grid de catalog cards. En **web desktop** el home es un catálogo Airbnb: cápsula Buscar + Fechas, chips de género con icono, grid que llena la página y un FAB centrado **Mostrar mapa**. El tab se llama **Explorar**; la ruta sigue siendo `/`. No hay título de página en el tab. Eventos ya finalizados no salen en esta lista; siguen en Operar (consulta) y por deep link.

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
| Hero (phone) | SearchBar pill (abre filtros) + chips **fijos** bajo la safe band: no scrollan con la lista. Chips con icono: Todo + Hoy / Finde / Este mes + géneros. El riel es full-bleed: el primer chip alinea con el SearchBar y el resto se asoma hasta el borde de la pantalla. Todo limpia fecha y género (no el `q`). Sin `PageHeader`. `Screen stickyHeader`. |
| Hero (desktop web) | Cápsula Airbnb: **Buscar** (input vivo) + **Fechas** (calendario rango, “Cualquier fecha”) + recuento `N eventos en Bogotá` (o `· filtrado`). Debajo, chips de **categoría** (icono sobre label, underline `foreground` al seleccionar): Todo + géneros. Todo solo limpia el género; las fechas viven en la cápsula. Sticky. |
| Rieles | Phone: `SectionRail` + `EventCard` catalog: foto cuadrada, título y venue · fecha debajo. **2 cards + peek** (~168px), full-bleed como los chips. Orden: **Esta noche**, **Para ti**, un riel por género si no hay filtro de género. Chevron aplica el filtro del riel; Para ti no lleva flecha. Si el riel no tiene eventos, se queda el título + `EmptyState` compacto (línea, no un pozo de 168px). **Desktop no tiene rieles**: los chips filtran el grid. |
| Lista | Phone: título “Todos los eventos” + grid 2 columnas. Desktop: sin título de sección; el grid **llena la página** (`minmax(260px, 1fr)`). Vacío del grid no sustituye a los rieles en phone. |
| Guardar | Corazón 44px en el flyer (listing); no abre el detalle. En desktop el corazón va en una pastilla blanca. Funciona sin sesión ([FEAT-037](feat-037-local-interest.md)). |
| Pull-to-refresh | Invalida lista local |
| Promoter | CTA **Crear evento** compacto bajo el SearchBar / cápsula; no es el home de Operar |
| FAB Toggle | Phone: FAB 56px bottom-right sobre el tab bar, “Mapa” / “Lista”. Web: pastilla del sitio (min 48px, icono 16, **Mostrar mapa** / **Mostrar lista**), centrada, `position: fixed`. |
| Modo Mapa | Al tap FAB: OsmMap. Phone: full-bleed + MapSheet. Desktop: split catálogo ~60% + mapa ~40%; el FAB queda sobre el mapa. Mismos filtros que lista. Ver [FEAT-006](feat-006-explore-map.md). |
| Wide/Desktop | Lista primero (grid 4 cols). FAB abre el split. Tap en card abre el detalle. Pin del mapa muestra preview con flyer + **Ver boletas**. |

Rail **Esta noche**: same-day, badge “Esta noche”, countdown a `startsAt` (aurora). Vacío: el riel se queda con “Nada esta noche”. Chips usan `FadeSlideIn` / `PressScale`. Sprint 4: [FEAT-033](feat-033-recommendations.md) (“Para ti”) encima del grid, no en lugar de Esta noche.

## Flujo

`GET /v1/events` cursor + `limit` ≤ 50. Filtros vivos en [FEAT-032](feat-032-search-filters.md).

## Estados

| Estado | Copy |
|--------|------|
| Vacío | Grid: “Aún no hay eventos”. Esta noche: “Nada esta noche”. Para ti: [FEAT-033](feat-033-recommendations.md). |
| Error | Reintentar |
| Página siguiente | Footer de carga; no duplicar ids |

## Contrato

`GET /v1/events?from=&cursor=&limit=`. Auth opcional.

## Fuera de alcance

Crear evento (CTA solo si `promoter`, va a [FEAT-008](feat-008-event-create.md)).

## Checklist

- [ ] Flyer + fecha visibles sin entrar al detalle.
- [ ] Invitado puede leer la lista.
- [ ] Refresh no deja eventos publicados hace un minuto fuera si el API ya los trae.
- [ ] Promoter sigue viendo Crear evento.
- [ ] FAB toggle alterna entre lista y mapa.
- [ ] En desktop/wide, la lista llena la página; el FAB “Mostrar mapa” abre el split.

## Relacionadas

[FEAT-006](feat-006-explore-map.md), [FEAT-007](feat-007-event-detail.md), [FEAT-033](feat-033-recommendations.md), [FEAT-037](feat-037-local-interest.md)
