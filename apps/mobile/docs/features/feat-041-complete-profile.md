# FEAT-041: Completar perfil (post-compra)

Nombre, teléfono y avatar se piden después de tener valor (una boleta), no antes de pagar. Todo es opcional y skippable.

| Campo | Valor |
|-------|-------|
| Sprint | 4 |
| RC | RC-010 |
| Permiso UI | Access |
| Pantallas | `/parche/completar-perfil` |

## Quick path

1. Tras un pago `paid` y la impresión, el wallet puede mostrar un prompt suave.
2. El usuario completa o salta. El QR no espera este paso.
3. `PATCH /v1/me` + avatar como en [FEAT-012](feat-012-profile-me.md).

## Pantallas

Campos opcionales. CTA “Más tarde” vuelve a Cuenta o Boletas.

## Flujo

No es requisito de checkout. Promoter register sigue pidiendo nombre en [FEAT-002](feat-002-auth-register.md).

## Contrato

`PATCH /v1/me`, `POST /v1/me/avatar`.

## Fuera de alcance

Forzar teléfono para transferencias (sigue las reglas actuales de 026).

## Checklist

- [ ] Skip no bloquea el QR.
- [ ] Invitado no ve esta ruta (auth).

## Relacionadas

[FEAT-012](feat-012-profile-me.md), [FEAT-021](feat-021-ticket-purchase.md)
