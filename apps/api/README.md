# Parche API

API Go para eventos en vivo. En local corre con Docker Compose: API, worker, Postgres, Redis, NATS y MinIO.

Contratos y features: [`docs/README.md`](docs/README.md).

## Quick path

1. `cp .env.example .env` (solo si aún no tienes `.env`)
2. Compila **api** y **worker** en serie (misma imagen Go; en paralelo Docker Desktop suele quedarse sin RAM o disco):

```bash
COMPOSE_PARALLEL_LIMIT=1 docker compose up --build
```

3. Comprueba `http://localhost:8080/v1/events`. Con `APP_ENV=dev` el seed deja **Selva 04**, **Bodega Cerrada** y un calendario 2027 (Neon Garden, Acid Roof, Selva 05, etc.) con flyers neón regenerados al arrancar.

Cuentas demo (contraseña `parche1234`): `ata@`, `promoter@`, `door@`, `metrics@`, `admin@`, `luna@` — todas `@parche.test`.

## Si el build falla

| Síntoma | Qué hacer |
|---------|-----------|
| `no space left on device` en `go mod download` | El disco **virtual** de Docker está lleno (no el de macOS). Libera capas huérfanas: `docker container prune -f && docker image prune -f`. No borres volúmenes si quieres conservar Postgres. |
| `compile: signal: killed` al `go build` | Dos builds Go a la vez. Usa `COMPOSE_PARALLEL_LIMIT=1`. |
| `Docker Compose requires buildx plugin` | Aviso. El build clásico sigue funcionando. |

Tras un prune, vuelve a `COMPOSE_PARALLEL_LIMIT=1 docker compose up --build`.

## Licencia

PolyForm Noncommercial 1.0.0 — ver [`LICENSE`](../../LICENSE) en la raíz del monorepo. **Sin uso comercial por terceros** (el autor sí puede).
