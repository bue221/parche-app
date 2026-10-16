# CLAUDE.md — Parche (folder monorepo)

## Modelo

Un solo git, tres apps **autónomas**. No hay pnpm workspace ni Turborepo en la raíz.

| Path | Runtime | Cómo trabajar |
|------|---------|----------------|
| `apps/mobile` | Expo / Node | `cd apps/mobile && pnpm …` |
| `apps/api` | Go / Docker | `cd apps/api && go …` o Compose |
| `apps/web` | Next / Node | `cd apps/web && pnpm …` |

Los scripts del `package.json` raíz solo hacen `cd` / `pnpm --dir` / `docker compose`. No unifican dependencias.

## Comandos útiles

```bash
pnpm --dir apps/mobile start|lint|test
pnpm --dir apps/web dev|build|lint
cd apps/api && go test ./... && go vet ./...
COMPOSE_PARALLEL_LIMIT=1 docker compose --project-directory apps/api up --build
```

Docs: `docs/Home.md` → Wiki con `pnpm wiki:publish` (repo público).

## Arquitectura

- Mobile → `EXPO_PUBLIC_API_URL` → API `/v1`
- Web → `API_URL` (server) → API para ISR
- API módulo Go: `github.com/parche-app/backend` (nombre histórico; no renombrar a la ligera)
- Producto/UI: `apps/*/docs/` y wiki en `docs/`

## Convenciones

- Commits Conventional Commits en **inglés**, scope = `mobile` | `api` | `web` | `docs` | `ci`
- Solo pnpm dentro de mobile/web (cada uno con su `pnpm-lock.yaml`)
- Expo 57 docs versionadas; UI flyer B/N
- Secretos solo en `.env` local (gitignored)

## Licencia

**PolyForm Noncommercial 1.0.0** (`LICENSE`). Código público, **prohibido uso comercial**. No es licencia OSI Open Source. No sugieras relicenciar a MIT/Apache sin pedírselo al autor.

## Qué NO tocar

- Convertir esto en un workspace Node único o meter Go en npm
- Force-push reescribiendo el historial importado
- Commitear `.env`, tokens MP, JWT
- Cambiar `nodeLinker: hoisted` en `apps/mobile/pnpm-workspace.yaml` sin probar Metro
- Quitar o debilitar la restricción no comercial de `LICENSE`

## Flujo

1. Leer `apps/<app>/AGENTS.md` (y `CLAUDE.md` corto si existe).
2. Instalar y testear **solo esa app**.
3. Docs de feature en el mismo PR si aplica.

Ver también: `apps/mobile/CLAUDE.md`, `apps/web/CLAUDE.md`, `apps/api/CLAUDE.md`.
