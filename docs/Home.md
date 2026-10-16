# Parche — Wiki

Bienvenido al wiki del monorepo **parche-app**.

Parche conecta gente con eventos en vivo: descubrir, comprar, entrar por QR y operar puerta/promoción.

## Apps

| App | Carpeta | Rol |
|-----|---------|-----|
| [App móvil](Mobile.md) | `apps/mobile` | Expo — producto principal |
| [Backend / API](Backend-API.md) | `apps/api` | Go — contratos `/v1` |
| [Web](Web.md) | `apps/web` | Next.js — landing, SEO, fichas públicas |

## Guías

- [Arquitectura](Architecture.md)
- [Setup local](Setup-local.md)
- [Despliegue](Deployment.md)
- [Guía de contribución](Contributing.md)

## Fuente

Estas páginas viven en [`docs/`](https://github.com/bue221/parche-app/tree/main/docs) y se publican al [GitHub Wiki](https://github.com/bue221/parche-app/wiki) con `pnpm wiki:publish` o el workflow `wiki.yml`.
