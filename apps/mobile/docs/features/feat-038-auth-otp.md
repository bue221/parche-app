# FEAT-038: Auth sheet y OTP

La compra y la cuenta piden identidad con un modal de página: email + código de 6 dígitos. No hay pantalla full-screen de OTP. El registro largo deja de bloquear el checkout.

| Campo | Valor |
|-------|-------|
| Sprint | 4 |
| RC | RC-001, RC-002 |
| Permiso UI | Público |
| Pantallas | `AuthSheet` (inline/modal), no `/auth/otp` |

## Quick path

1. Arranque sin sesión (tras onboarding) o CTA de cuenta / confirmar checkout abre el sheet.
2. Email → `POST /v1/auth/otp/request` (siempre 204).
3. Código → `POST /v1/auth/otp/verify` → sesión attendee (display name del local-part).
4. Checkout continúa en la misma pantalla. Luego sync [FEAT-037](feat-037-local-interest.md).

## Pantallas

Pasos: identidad (email + Google) → OTP. Modal de página dismissible (X, logo, Continuar, icono Google). No es un bottom sheet ni una ruta nueva. Password es “Otras opciones” hacia [FEAT-003](feat-003-auth-login.md). Google en [FEAT-039](feat-039-auth-google.md). Promoter sigue en [FEAT-002](feat-002-auth-register.md).

El invitado puede cerrar el modal y seguir en Explorar. Cuenta y checkout lo vuelven a abrir. Desktop web: card partido (banda `pitch-black` + form), Escape cierra. No se monta sobre `/auth/*` ni `/reset`.

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
- [ ] Sin sesión, el modal se ofrece al arrancar y se puede cerrar.

## Relacionadas

[FEAT-003](feat-003-auth-login.md), [FEAT-021](feat-021-ticket-purchase.md), [FEAT-041](feat-041-complete-profile.md)
