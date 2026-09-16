# FEAT-005: Explorar (listado)

El asistente ve las próximas fechas como un grid foto-first: imagen 4:5, día y venue debajo. Es el home de producto. El tab se llama **Explorar**; la ruta sigue siendo `/`.

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
| Hero | Título Inter “Explorar” + lead “Fechas cerca” + SearchBar + chips de día/género |
| Lista | Card listing 16px, foto 4:5, fecha, nombre, venue; lift suave |
| Pull-to-refresh | Invalida lista local |
| Promoter | CTA **Crear fecha** en el header; no es el home de Operar |

Rail **Esta noche**: eventos same-day con countdown a `startsAt` (aurora). Chips Hoy/Finde/Mes usan `FadeSlideIn` / `PressScale`. Sprint 4: [FEAT-033](feat-033-recommendations.md) (“Para ti”) encima de la lista, no en lugar de Esta noche.

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

[FEAT-006](feat-006-explore-map.md), [FEAT-007](feat-007-event-detail.md)
