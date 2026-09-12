# FEAT-003: Inicio de sesión

Quien ya tiene cuenta entra a sus funciones (wallet, follows, eventos propios) con un mensaje de error que no filtra emails.

| Campo | Valor |
|-------|-------|
| Sprint | 1 |
| RC | RC-002 |
| Permiso UI | Público |
| Pantallas | `Login` |

## Quick path

1. Email + contraseña.
2. `POST /v1/auth/login`.
3. Entra al tab que intentaba o a Agenda.

## Pantallas

Formulario mínimo. Enlace a registro. Sin “¿olvidaste?” hasta backlog.

## Flujo

Login → persistir refresh → hidratar `me` + memberships → aplicar [FEAT-001](feat-001-shell-navigation.md).

Deep link pendiente (invite, evento, pago) se retoma después del login ([FEAT-035](feat-035-deep-links.md)).

## Estados

| Estado | UI |
|--------|-----|
| Credenciales | Mensaje genérico (“No pudimos entrar”) |
| Rate limit | Espera; no culpar al email |

## Contrato

`POST /v1/auth/login` → access + refresh.

## Fuera de alcance

Biometría como único factor (puede llegar después sobre la misma sesión). Reset de clave.

## Checklist

- [ ] Fallo no dice si el email existe.
- [ ] Éxito no muestra tokens.
- [ ] Vuelta al destino previo si lo había.

## Relacionadas

[FEAT-002](feat-002-auth-register.md), [FEAT-004](feat-004-auth-session.md)
