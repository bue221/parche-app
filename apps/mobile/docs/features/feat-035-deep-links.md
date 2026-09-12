# FEAT-035: Deep links

Un link abre la pantalla correcta, con login en el medio si hace falta, sin perder el destino.

| Campo | Valor |
|-------|-------|
| Sprint | 1 (evento); 2 invite; 3 pago |
| RC | — |
| Permiso UI | Según destino |
| Pantallas | Ninguna propia; router |

## Quick path

1. Abrir URL / universal link.
2. Si el destino pide cuenta y no hay sesión: [FEAT-003](feat-003-auth-login.md) y retorno.
3. Empujar el stack correcto.

## Destinos

| Ruta lógica | Spec |
|-------------|------|
| Evento | [FEAT-007](feat-007-event-detail.md) |
| Artista | [FEAT-014](feat-014-artist-public.md) |
| Invite token | [FEAT-019](feat-019-invite-accept.md) |
| Return pago `order_id` | [FEAT-022](feat-022-order-return.md) |

## Flujo

Link inválido: Agenda + toast “No encontramos eso”. Cold start y app ya abierta se comportan igual.

## Estados

Token invite usado: copy, no crash.

## Contrato

Esquema a definir con Expo Linking; paths alineados a web cuando exista.

## Fuera de alcance

App Clips. QR de marketing distintos al ticket token.

## Checklist

- [ ] Pago return no abre el evento genérico.
- [ ] Invite no se traga si el user se registra en el camino.
- [ ] Ticket QR de puerta no es un deep link HTTP.

## Relacionadas

[FEAT-019](feat-019-invite-accept.md), [FEAT-022](feat-022-order-return.md)
