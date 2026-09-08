# Agent conventions

Reglas para humanos y agentes que tocan el repo. El índice canónico está en [`AGENTS.md`](https://github.com/bue221/parche-app/blob/main/AGENTS.md).

## Quick path

1. Antes de código Expo: [SDK 57 docs](https://docs.expo.dev/versions/v57.0.0/).
2. Antes de UI: [`docs/ui/design.md`](https://github.com/bue221/parche-app/blob/main/docs/ui/design.md).
3. Instalar y correr solo con **pnpm**.

## Docs

Cualquier archivo nuevo o movido bajo `docs/` debe indexarse **en el mismo cambio** en:

- `docs/README.md`
- la tabla de `AGENTS.md`

No dejar docs huérfanos.

## Commits

Convencional, en inglés, presente: `type(scope): Subject` (sin punto final). Ejemplo: `feat(home): Add gig-flyer hero`.

## Checklist

- [ ] No se usó npm/yarn/bun
- [ ] Docs nuevas están en ambos índices
- [ ] UI sigue tokens semánticos

## Next step

Volver a [Home](Home) o clonar y seguir [Getting started](Getting-Started).
