# FEAT-030: Métricas de evento

El promoter/manager/metrics ve ventas y puerta en agregado. No es el scanner.

| Campo | Valor |
|-------|-------|
| Sprint | 3 (evento); 4 tenant |
| RC | — (PRD backend métricas) |
| Permiso UI | `event.metrics.read` |
| Pantallas | `EventMetrics` |

## Quick path

1. Operar → métricas del evento.
2. `GET /v1/events/{id}/metrics`.
3. Leer: vendidos/reservados/disponibles por tipo, ingresos brutos, check-ins vs vendidos, no-show, scans por `scanner_user_id`, serie por hora.

## Pantallas

Tablas y cifras B/N. Sin gráficos de colores. `metrics` no tiene CTA de cámara.

Sprint 4: `GET /v1/tenants/{id}/metrics` para owner del colectivo, pantalla aparte `TenantMetrics`.

## Flujo

`FORBIDDEN` para `door`. Refresh manual.

## Estados

Sin ventas: ceros honestos, no empty genérico de Agenda.

## Contrato

Agregados, no PII.

## Fuera de alcance

Excel. Filtro por comprador. Billing.

## Checklist

- [ ] `door` no entra.
- [ ] `metrics` no abre scanner.
- [ ] Scans por persona no exponen tiquetes individuales.

## Relacionadas

[FEAT-027](feat-027-operate-hub.md), [FEAT-029](feat-029-door-live.md)
