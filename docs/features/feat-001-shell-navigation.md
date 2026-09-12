# FEAT-001: Shell y navegación

La app reemplaza las tabs de plantilla por un chrome de producto: el asistente vive en agenda y mapa; tiquetes y operación aparecen según cuenta y membresía.

| Campo | Valor |
|-------|-------|
| Sprint | 1 (tabs base); 2–3 amplían visibilidad |
| RC | RC-016 (criterio de navegación fluida) |
| Permiso UI | Tabs condicionales, no un rol global |
| Pantallas | Tab bar + stacks modales |

## Quick path

1. Abrir la app autenticado o no.
2. Ver **Agenda** y **Explorar**.
3. Si hay sesión: **Tiquetes** y **Parche**. Si hay alguna membresía activa: **Operar**.

## Pantallas

| Pieza | Contenido |
|-------|-----------|
| Tab Agenda | [FEAT-005](feat-005-agenda.md) |
| Tab Explorar | [FEAT-006](feat-006-explore-map.md) |
| Tab Tiquetes | [FEAT-024](feat-024-ticket-wallet.md); oculta sin sesión |
| Tab Parche | [FEAT-012](feat-012-profile-me.md); login si invitado |
| Tab Operar | [FEAT-027](feat-027-operate-hub.md); solo membresías |
| Stacks | Auth, detalle evento/artista, checkout, impresión, scanner, invite |

## Flujo

- Invitado: Agenda + Explorar; CTA de cuenta al comprar, seguir o crear.
- Tras login, el tab seleccionado se conserva si sigue existiendo.
- Acciones de un evento (editar, escanear, métricas) salen del **detalle** o de Operar, nunca de un “modo admin” global.

## Estados

| Estado | UI |
|--------|-----|
| Cargando membresías | Tabs públicas; Operar aparece al resolver |
| Sin membresías | Operar no existe |
| Revocación | Operar desaparece al refrescar; stacks de puerta se cierran |

## Contrato

`GET /v1/me`, `GET /v1/me/memberships`. No cachear permisos como verdad más de una sesión corta.

## Fuera de alcance

Drawer hamburguesa. Navegación de la web Next. Personalización de tabs por el usuario.

## Checklist

- [ ] Invitado no ve Tiquetes ni Operar.
- [ ] Staff de un solo evento ve Operar; no ve métricas de otros tenants.
- [ ] Chrome B/N; tab bar con tokens semánticos.

## Relacionadas

[FEAT-004](feat-004-auth-session.md), [FEAT-027](feat-027-operate-hub.md), [FEAT-035](feat-035-deep-links.md)
