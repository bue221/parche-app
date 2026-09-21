# FEAT-006: Mapa (modo en Explorar)

El mapa muestra pines de eventos publicados. Teselas OSM Humanitarian (HOT) + Leaflet, saturadas. El usuario descubre por geografía, no por Google. El mapa ahora vive dentro del tab **Explorar** como modo alternativo activado por FAB toggle; ya no tiene tab propio.

| Campo | Valor |
|-------|-------|
| Sprint | 1 (pines); 4 bbox/filtros |
| RC | RC-004, RC-017 |
| Permiso UI | Público |
| Pantallas | Modo mapa en Tab `Explorar` (`index`) |

## Quick path

1. En Explorar, tap FAB "Mapa" para activar modo mapa.
2. Overview de Bogotá (zoom ≤ 11) con pills; la lista queda colapsada en sheet.
3. Chips/filtros compartidos con lista. Tap pin abre peek; tap card → [FEAT-007](feat-007-event-detail.md).
4. FAB "Lista" o bajar el sheet vuelve a la lista.

## Pantallas

| Pieza | Regla |
|-------|-------|
| Mapa | Leaflet en WebView + teselas OSM Humanitarian (sin grayscale, saturadas). Full-bleed, `rounded-[24px]` alineado al sheet. Cluster con recuento; tap = zoom. Cero SDK Google/Mapbox de producto |
| Pines | Pill blanca con fecha (`Hoy` / `18 sep`) y punto de género (neon / volt / amber). Seleccionado = fill aurora |
| Lista/mapa | SearchBar + chips + botón filtros **fijos** (no scrollan). Chips full-bleed hasta el borde. Sheet de 3 posiciones: colapsado (asa + recuento), peek (~50% con catalog cards en **2 columnas**), expandido. FAB "Lista" para volver a modo lista. Wide web: el split **no es permanente** — FAB “Mostrar mapa” abre catálogo + mapa (~40%); “Mostrar lista” vuelve al grid. Pin del mapa abre preview con flyer + **Ver boletas**. |
| Ubicación usuario | Opcional ([FEAT-036](feat-036-device-permissions.md)); no bloquea pines |

## Flujo

Misma fuente y filtros que lista (`GET /v1/events`, `scope=agenda`). Sprint 4: `min_lat`, `min_lng`, `max_lat`, `max_lng` al mover el viewport.

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
- [ ] FAB toggle sincroniza estado con lista.
- [ ] En desktop el mapa solo aparece tras “Mostrar mapa”.
- [ ] Filtros compartidos entre lista y mapa.

## Relacionadas

[FEAT-005](feat-005-agenda.md), [FEAT-011](feat-011-map-pin.md), [FEAT-032](feat-032-search-filters.md)
