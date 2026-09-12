# FEAT-029: Aforo en vivo

Conteo de la noche para quien está en puerta o mira métricas. Sin PII de compradores.

| Campo | Valor |
|-------|-------|
| Sprint | 3 |
| RC | RC-013 |
| Permiso UI | `event.door.live` o `event.metrics.read` |
| Pantallas | Bloque en scanner + `DoorLive` opcional |

## Quick path

1. Con permiso, `GET /v1/events/{eventId}/door/live`.
2. Ver check-ins vs vendidos y últimos scans (resultado + hora + scanner, no email de comprador).
3. Poll suave mientras la pantalla de puerta está abierta.

## Pantallas

Números grandes Inter. `door` ve aforo, no ingresos. Lista “últimos” corta.

## Flujo

Números pueden venir de Redis vía API; no recalcular en el teléfono sumando scans locales (se desfasaría entre devices).

## Estados

Ceros al inicio. Error: último número + aviso stale.

## Contrato

GET door/live. Sin nombres de asistentes.

## Fuera de alcance

Mapa de asientos. Export CSV en app.

## Checklist

- [ ] Dos scanners incrementan el mismo contador.
- [ ] `door` no ve pesos.
- [ ] No lista compradores.

## Relacionadas

[FEAT-028](feat-028-door-scanner.md), [FEAT-030](feat-030-event-metrics.md)
