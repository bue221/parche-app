# Backend / API

Código: [`apps/api`](../apps/api).

## Stack

- Go 1.26, módulo `github.com/parche-app/backend`
- Postgres, Redis, NATS JetStream, MinIO
- Binario único: `parche-api serve` | `parche-api worker`
- Contrato: `apps/api/openapi.yaml`

## Comandos

```bash
cd apps/api
cp .env.example .env
COMPOSE_PARALLEL_LIMIT=1 docker compose up --build

# Sin Docker (deps ya arriba):
go build -o .bin/parche-api ./cmd/parche-api
go test ./...
go vet ./...
```

## Docs internas

- [`apps/api/docs/README.md`](../apps/api/docs/README.md)
- Features `F01`… en `apps/api/docs/features/`
- PRD: `apps/api/docs/prd.md`
- Agentes: `apps/api/AGENTS.md`

## Env

Ver `apps/api/.env.example` (JWT, object store, Mercado Pago, CORS, email). No subas `.env` real.
