# Despliegue

Orientación actual (ajusta a tu infra):

| Superficie | Notas |
|------------|--------|
| **API** | Imagen Docker (`apps/api/Dockerfile`). En prod: Postgres, Redis, NATS, S3/MinIO, secretos JWT/MP. Ejemplo histórico de host: `api-parche.bue221.xyz`. |
| **Web** | Build `next build` / Vercel u otro Node host. `API_URL` y `MEDIA_HOSTS` de prod. |
| **Mobile** | EAS (`apps/mobile/eas.json`). Perfiles en el propio proyecto Expo. |

## Checklist pre-prod

- [ ] `.env` de prod fuera de git; rotar JWT / webhook secrets
- [ ] `CORS_ORIGINS` y `APP_ORIGIN` con dominios reales
- [ ] Mercado Pago: `PAYMENT_PROVIDER=mercadopago` + URLs de webhook/OAuth
- [ ] `OBJECT_STORE_PUBLIC_BASE_URL` / CDN
- [ ] Smoke: `GET /v1/events`, landing, login mobile

CI del monorepo solo valida lint/test por paths; el deploy queda en tus pipelines de cada superficie.
