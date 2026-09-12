# FEAT-031: Aprobación de eventos

El platform admin revisa publicaciones. El promoter ve el estado, no aprueba las suyas.

| Campo | Valor |
|-------|-------|
| Sprint | 3 |
| RC | RC-015 |
| Permiso UI | `platform_admin` |
| Pantallas | `AdminEventQueue`, estados en detalle promoter |

## Quick path

1. Admin abre cola desde Parche.
2. Ve flyer, datos, pin.
3. `POST /v1/admin/events/{id}/approve` o `reject`.
4. Promoter: badges en Operar/detalle (`en revisión` / `publicado` / `rechazado`).

## Pantallas

Cola simple. Rechazo: motivo corto opcional si el API lo acepta; si no, solo reject.

Público: solo `publicado` entra a Agenda/mapa.

## Flujo

No admin ≠ no ven la cola. Promoter no llama approve.

## Estados

Vacío: “Nada por revisar”.

## Contrato

Rutas admin del PRD backend.

## Fuera de alcance

Moderación de artistas. Ban de usuarios (RC-024).

## Checklist

- [ ] Evento no aprobado no sale en Agenda pública.
- [ ] Promoter lee el estado.
- [ ] Admin no sustituye el scanner del evento.

## Relacionadas

[FEAT-007](feat-007-event-detail.md), [FEAT-008](feat-008-event-create.md)
