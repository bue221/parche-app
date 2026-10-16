# Parche — Wiki

Bienvenido al wiki del monorepo **parche-app**.

Parche conecta gente con la escena electrónica en vivo: descubrir, comprar, entrar por QR y operar puerta/promoción — con origen académico en Prácticas de Ingeniería (Universidad Central, 2026).

## Apps (código)

| App | Carpeta | Rol |
|-----|---------|-----|
| [App móvil](Mobile) | `apps/mobile` | Expo — producto principal |
| [Backend / API](Backend-API) | `apps/api` | Go — contratos `/v1` |
| [Web](Web) | `apps/web` | Next.js — landing, SEO, fichas públicas |

## Producto y prácticas

| Página | Contenido |
|--------|-----------|
| [Producto y problema](Producto) | Contexto, problema, justificación, objetivos |
| [Metodología y sprints](Metodologia-Sprints) | Ágil, RC-001…025, roadmap |
| [Arquitectura](Architecture) | Stack, QR, multi-tenancy, diagramas |
| [Estado del arte](Estado-del-arte) | RA, Dice, Xceed, referentes |
| [Análisis y conclusiones](Analisis-Conclusiones) | Visión estratégica |
| [Bibliografía](Bibliografia) | Fuentes del documento académico |

## Guías de ingeniería

- [Setup local](Setup-local)
- [Despliegue](Deployment)
- [Guía de contribución](Contributing)
- [Licencia](Licencia) — PolyForm Noncommercial (sin uso comercial)

## Fuente

Edita Markdown en [`docs/`](https://github.com/bue221/parche-app/tree/main/docs) y publica con `pnpm wiki:publish`.
