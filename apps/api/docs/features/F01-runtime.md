# F01 Runtime Docker

El backend arranca como un stack reproducible: API Go, worker Go, PostgreSQL, Redis, broker y object store. Quien clona el repo levanta el mismo entorno que CI. Sin esto no hay health, migraciones ni sitio donde viven el resto de features.

**Depends on:** nada  
**Unlocks:** F02–F27  
**Stories:** infraestructura (RC-020)

## Quick path

1. `docker-compose.yml` en `backend/` con servicios `api`, `worker`, `postgres`, `redis`, `broker`, `minio`.
2. Misma imagen para `api` y `worker`; `CMD` distinto.
3. `.env.example` con todas las variables (sin secretos reales).
4. `GET /health` 200 con el proceso vivo; `GET /ready` 200 solo si Postgres, Redis y store responden.

## Scope

| Incluye | No incluye |
|---------|------------|
| Compose `dev`, red interna, volúmenes | Kubernetes / ECS (se documenta env, no el manifiesto) |
| Migraciones SQL al arrancar api (o job `migrate`) | Una DB por tenant |
| Puerto host solo `8080` (api) | Exponer Postgres/Redis/broker/MinIO a internet en prod |
| Perfil `dev` con MinIO | CDN de producción |

## Servicios

| Servicio | Imagen / binario | Puerto interno | Persistencia |
|----------|------------------|----------------|--------------|
| `api` | Go HTTP | 8080 | no |
| `worker` | Go consumer | ninguno | no |
| `postgres` | PostgreSQL 16+ | 5432 | volumen |
| `redis` | Redis 7+ | 6379 | volumen opcional (SETNX de puerta sí debe sobrevivir restart de api, no de Redis en prod: AOF/RDB) |
| `broker` | NATS JetStream **o** RabbitMQ | 4222 / 5672 | volumen (colas durables) |
| `minio` | MinIO | 9000 | volumen bucket `parche` |

Decisión de broker: **NATS JetStream** por defecto (menos piezas, subjects `ticket.used`, `payment.confirmed`, `email.send`, `media.process`). Si el equipo ya opera AMQP, RabbitMQ es aceptable; no ambos.

## Variables (`.env.example`)

| Variable | Uso |
|----------|-----|
| `DATABASE_URL` | Postgres |
| `REDIS_URL` | Redis |
| `BROKER_URL` | NATS/AMQP |
| `HTTP_ADDR` | `:8080` |
| `JWT_ACCESS_SECRET` | Sesión (F04) |
| `JWT_REFRESH_SECRET` | Refresh |
| `TICKET_SIGNING_KEY` | QR (F17) — **distinta** |
| `OBJECT_STORE_DRIVER` | `minio` \| `fs` \| `s3` |
| `OBJECT_STORE_*` | endpoint, bucket, keys, region |
| `PAYMENT_WEBHOOK_SECRET` | F16 |
| `SMTP_*` / `EMAIL_FROM` | F26 |
| `CORS_ORIGINS` | lista web |
| `LOG_LEVEL` | `info` |

## HTTP de esta feature

| Método | Ruta | Auth | 200 si |
|--------|------|------|--------|
| GET | `/health` | no | proceso up (no toca deps) |
| GET | `/ready` | no | ping Postgres + Redis + `ObjectStore.Exists` de un key sentinel o `List` bucket |

`/ready` 503 con `{ "code": "NOT_READY", "message": "…", "request_id" }` si falla una dep. No filtrar el error interno al cliente; sí al log.

## Worker

- Mismo binario: `parche-api serve` vs `parche-api worker`.
- Consume subjects: al inicio puede idle-loop; F09/F16/F19/F26 publican.
- ACK solo después de persistir; N reintentos + DLQ `parche.dlq`.
- Log: `subject`, `msg_id`, `request_id` si venía del api.

## Errores y logs

- Arranque: fatal si falta `DATABASE_URL` o secretos JWT.
- Logs JSON: `ts`, `level`, `msg`, `service` (`api`|`worker`).
- Sin passwords de conexión en log (redactar DSN).

## Checklist

- [x] `docker compose up` deja api escuchando en 8080
- [x] `/health` 200 con postgres caído; `/ready` 503
- [x] Worker arranca y se suscribe aunque la cola esté vacía
- [x] `.env.example` cubre la tabla de variables
- [x] Postgres y MinIO tienen volumen; restart no borra datos de dev
- [ ] CI puede correr compose (o postgres de servicio) y migraciones

## Next step

[F02 contrato HTTP](F02-http-contract.md).
