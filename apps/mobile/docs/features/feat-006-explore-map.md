# FEAT-006: Mapa

El mapa muestra pines de eventos publicados. Teselas OSM + MapLibre. El usuario descubre por geografía, no por Google. El tab se llama **Mapa**; la ruta sigue siendo `/explore`.

| Campo | Valor |
|-------|-------|
| Sprint | 1 (pines); 4 bbox/filtros |
| RC | RC-004, RC-017 |
| Permiso UI | Público |
| Pantallas | Tab `Mapa` |

## Quick path

1. Abrir Mapa: mapa con pines `lat`/`lng` de la API.
2. Tap pin → bottom sheet con card listing.
3. Tap sheet → [FEAT-007](feat-007-event-detail.md).

## Pantallas

| Pieza | Regla |
|-------|-------|
| Mapa | Leaflet en WebView + OSM + `leaflet.markercluster` (CDN). Cluster con recuento; tap = zoom. Cero SDK Google/Mapbox de producto |
| Lista/mapa | SearchBar flotante. Pin abre `BottomSheet`. Wide web: lista al lado |
| Ubicación usuario | Opcional ([FEAT-036](feat-036-device-permissions.md)); no bloquea pines |

## Flujo

Misma fuente que Explorar: `GET /v1/events`. Sprint 4: `min_lat`, `min_lng`, `max_lat`, `max_lng` al mover el viewport.

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
