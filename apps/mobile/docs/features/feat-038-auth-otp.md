# FEAT-038: Auth sheet y OTP

La compra y la cuenta piden identidad con un bottom sheet: email + código de 6 dígitos. No hay pantalla full-screen de OTP. El registro largo deja de bloquear el checkout.

| Campo | Valor |
|-------|-------|
| Sprint | 4 |
| RC | RC-001, RC-002 |
| Permiso UI | Público |
| Pantallas | `AuthSheet` (inline/modal), no `/auth/otp` |

## Quick path

1. CTA de cuenta o confirmar checkout sin sesión abre el sheet.
2. Email → `POST /v1/auth/otp/request` (siempre 204).
3. Código → `POST /v1/auth/otp/verify` → sesión attendee (display name del local-part).
4. Checkout continúa en la misma pantalla. Luego sync [FEAT-037](feat-037-local-interest.md).

## Pantallas

Pasos: método → email → OTP. Password es “Otras opciones” hacia [FEAT-003](feat-003-auth-login.md). Google en [FEAT-039](feat-039-auth-google.md). Promoter sigue en [FEAT-002](feat-002-auth-register.md).

## Flujo

Cuenta OTP: `password_hash` null, perfil `attendee`. Login por password de esas cuentas falla genérico. Rate limit del API; UI muestra espera si 429.

## Estados

Código inválido o vencido: “No pudimos verificar el código”. No decir si el email existe.

## Contrato

`POST /v1/auth/otp/request` `{ "email" }`, `POST /v1/auth/otp/verify` `{ "email", "code" }` → misma session body que login.

## Fuera de alcance

Apple Sign In. Magic link HTTP. Order anónimo sin `users.id`.

## Checklist

- [ ] Checkout no redirige a `/auth/register`.
- [ ] Sheet no es una ruta nueva.
- [ ] OTP no se loguea en cliente.

## Relacionadas

[FEAT-003](feat-003-auth-login.md), [FEAT-021](feat-021-ticket-purchase.md), [FEAT-041](feat-041-complete-profile.md)
