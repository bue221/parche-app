# CLAUDE.md — apps/api

Go API + worker. Trabaja **solo aquí** (`cd apps/api`).

```bash
COMPOSE_PARALLEL_LIMIT=1 docker compose up --build
go test ./...
go vet ./...
go build -o .bin/parche-api ./cmd/parche-api
```

Lee `AGENTS.md` y `docs/features/` antes de cambiar contratos. Módulo: `github.com/parche-app/backend`. No commits de `.env`.
