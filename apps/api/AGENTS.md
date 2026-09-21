# Parche backend

Treat `docs/` as the source of truth for product and architecture rules. Read the matching file before changing that area.

**Always index new docs.** Any new or moved file under `docs/` must be linked in [docs/README.md](docs/README.md) and in the table below in the same change.

| Path | Covers |
|------|--------|
| [docs/README.md](docs/README.md) | Index of all project rule docs |
| [docs/prd.md](docs/prd.md) | Product requirements: API, Docker, data, tokens |
| [docs/features/README.md](docs/features/README.md) | Feature specs F01–F30 (implementation units) |

## Stack

Go HTTP API · PostgreSQL · Redis · message broker (NATS or RabbitMQ) · Docker Compose for local and CI.

Local stack: [README.md](README.md). Build with `COMPOSE_PARALLEL_LIMIT=1` so api and worker are not compiled in parallel.

## Do

- Keep a single shared database with `tenant_id` isolation; do not create one database per organizer.
- Authorize door and metrics by **event membership + permission**, not a single global staff role. Several people can check in the same night.
- Store event coordinates (WGS84) and render maps with OSM/MapLibre. Do not require Google Maps.
- Talk to object storage through one `ObjectStore` port: local/MinIO in dev, S3 in prod.
- Talk to Mercado Pago through one `PaymentProvider` port (Checkout Pro `init_point`); keep the `fake` driver for tests.
- Serve QR check-in from in-memory signature verify + Redis `SETNX`; persist to Postgres asynchronously.
- Keep session JWTs short-lived and rotate refresh tokens; sign ticket QR with a **separate** key.
- Return user-facing errors in JSON (`code`, `message`); log request id and cause server-side.

## Don't

- Put ticket-validation writes on the request path to Postgres.
- Expose admin, metrics, or door endpoints without an event-scoped permission check.
- Bind map or media code to Google Maps, Mapbox-as-required, or a raw filesystem API that cannot swap to S3.
- Log access tokens, refresh tokens, or ticket QR payloads.
