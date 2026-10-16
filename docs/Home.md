# Parche — Wiki

Bienvenido al wiki del monorepo **parche-app**.

Parche conecta gente con eventos en vivo: descubrir, comprar, entrar por QR y operar puerta/promoción.

## Apps

| App | Carpeta | Rol |
|-----|---------|-----|
| [App móvil](Mobile) | `apps/mobile` | Expo — producto principal |
| [Backend / API](Backend-API) | `apps/api` | Go — contratos `/v1` |
| [Web](Web) | `apps/web` | Next.js — landing, SEO, fichas públicas |

## Guías

- [Arquitectura](Architecture)
- [Setup local](Setup-local)
- [Despliegue](Deployment)
- [Guía de contribución](Contributing)

## Fuente

Estas páginas se editan en [`docs/`](https://github.com/bue221/parche-app/tree/main/docs) y se publican al [GitHub Wiki](https://github.com/bue221/parche-app/wiki) con `pnpm wiki:publish` (tras crear la primera página en la UI de GitHub una vez).
