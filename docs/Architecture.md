# Arquitectura

## Vista general

```mermaid
flowchart TB
  subgraph presentation [Presentation]
    M[Expo mobile]
    W[Next.js web]
  end

  subgraph application [Application]
    API[HTTP API :8080]
    WK[NATS worker]
  end

  subgraph infrastructure [Infrastructure]
    PG[(Postgres)]
    RD[(Redis)]
    NA[[NATS JetStream]]
    S3[(MinIO / S3)]
    MH[Mailhog / SMTP]
  end

  M --> API
  W --> API
  API --> PG
  API --> RD
  API --> S3
  API --> NA
  API --> MH
  WK --> NA
  WK --> PG
  WK --> S3
```

## Límites

- **mobile / web**: UI y sesión; no hablan con Postgres directo.
- **api**: auth JWT, eventos, pagos (fake / Mercado Pago), media firmada, tickets.
- **worker**: jobs async (media, emails, expiry, recs).

## Contratos

OpenAPI: `apps/api/openapi.yaml`. Features API: `apps/api/docs/features/`. Features mobile/web: `apps/*/docs/features/`.

## Monorepo (simple)

Historiales de tres repos unidos con `git filter-repo` bajo `apps/{mobile,api,web}`.

No hay workspace compartido: cada app instala y corre sola. La raíz solo tiene docs, CI path-filtered y scripts atajo.
