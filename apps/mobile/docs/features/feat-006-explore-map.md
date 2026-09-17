# FEAT-006: Mapa

El mapa muestra pines de eventos publicados. Teselas OSM Humanitarian (HOT) + Leaflet, saturadas. El usuario descubre por geografía, no por Google. El tab se llama **Mapa**; la ruta sigue siendo `/explore`.

| Campo | Valor |
|-------|-------|
| Sprint | 1 (pines); 4 bbox/filtros |
| RC | RC-004, RC-017 |
| Permiso UI | Público |
| Pantallas | Tab `Mapa` |

## Quick path

1. Abrir Mapa: overview de Bogotá (zoom ≤ 11) con pills; la lista queda colapsada.
2. Chips/filtros del mapa no cambian Explorar. Tap pin abre peek; tap card → [FEAT-007](feat-007-event-detail.md).
3. El botón **Mapa** o bajar el sheet vuelve al mapa.

## Pantallas

| Pieza | Regla |
|-------|-------|
| Mapa | Leaflet en WebView + teselas OSM Humanitarian (sin grayscale, saturadas). Full-bleed, `rounded-[24px]` alineado al sheet. Cluster con recuento; tap = zoom. Cero SDK Google/Mapbox de producto |
| Pines | Pill blanca con fecha (`Hoy` / `18 sep`) y punto de género (neon / volt / amber). Seleccionado = fill aurora |
| Lista/mapa | SearchBar + chips + botón filtros. Chips full-bleed hasta el borde (igual que Explorar). Sheet de 3 posiciones: colapsado (asa + recuento), peek (~50% con cards overlay 4:5), expandido + botón **Mapa**. Wide web: lista al lado con el mismo overlay |
| Ubicación usuario | Opcional ([FEAT-036](feat-036-device-permissions.md)); no bloquea pines |

## Flujo

Misma fuente que Explorar (`GET /v1/events`) pero **filtros propios** (`scope=map`). Sprint 4: `min_lat`, `min_lng`, `max_lat`, `max_lng` al mover el viewport.

El pin de publicación es [FEAT-011](feat-011-map-pin.md), no esta pantalla.

## Estados

Sin eventos en vista: mapa vacío + copy (“vuelve a Explorar”). GPS denegado: mapa default Bogotá.

## Contrato

Eventos con `lat`/`lng` obligatorios si están publicados.

## Fuera de alcance

Rutas/navegación turn-by-turn. Geocoding de búsqueda de direcciones (excepto Nominatim opcional en pin de organizer).

## Checklist

- [ ] No hay dependencia Google Maps.
- [ ] Pin abre el evento correcto.
- [ ] Evento sin coords no se publica (regla de backend); la app no inventa coords.

## Relacionadas

[FEAT-005](feat-005-agenda.md), [FEAT-011](feat-011-map-pin.md), [FEAT-032](feat-032-search-filters.md)
