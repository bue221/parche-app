# FEAT-036: Permisos de dispositivo

Cámara y ubicación se piden en contexto, con copy en español, y un rechazo no tumba el resto de la app.

| Campo | Valor |
|-------|-------|
| Sprint | 1 (ubicación opcional); 3 (cámara) |
| RC | RC-013 (cámara) |
| Permiso UI | Flujos que lo necesitan |
| Pantallas | Pre-prompt in-app + settings |

## Quick path

1. **Antes** del diálogo del SO, una pantalla Parche explica para qué.
2. Sistema concede o niega.
3. Niega: CTA “Abrir ajustes” + alternativa (pin manual, no scanner).

## Pantallas / usos

| Permiso | Cuándo | Si niega |
|---------|--------|----------|
| Ubicación | Centrar mapa / atajo de pin | Mapa Bogotá / pin a mano |
| Cámara | [FEAT-028](feat-028-door-scanner.md) | No hay scan; no usar galería de fotos como QR feliz (opcional backlog) |

No pedir cámara al instalar. No pedir ubicación para ver Agenda.

## Flujo

Re-check al volver de settings. iOS/Android copy distinta solo si el SO lo exige; el pre-prompt es el mismo.

## Estados

Permanently denied: no loop del diálogo nativo.

## Contrato

APIs Expo Camera / Location. Nada de tracking de fondo.

## Fuera de alcance

Push (después). Contactos. Tracking ATT.

## Checklist

- [ ] Agenda funciona sin GPS.
- [ ] Scanner explica por qué cámara.
- [ ] Promoter publica pin sin GPS.

## Relacionadas

[FEAT-006](feat-006-explore-map.md), [FEAT-011](feat-011-map-pin.md), [FEAT-028](feat-028-door-scanner.md)
