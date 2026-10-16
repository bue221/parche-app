# Guía de contribución

## Principios

1. **Una app por PR** cuando sea posible (mobile *o* api *o* web).
2. Cada app es independiente: instala y prueba en su carpeta.
3. Docs de feature indexadas en el `AGENTS.md` / `docs/README.md` de esa app.
4. Conventional Commits en inglés: `feat(api): …`, `fix(mobile): …`, `docs: …`, `ci: …`.

## Flujo

```bash
git checkout -b feat/mobile-foo
# editar apps/mobile/...
cd apps/mobile && pnpm lint && pnpm test
git push -u origin HEAD
# abrir PR hacia main
```

## CI

Workflows en `.github/workflows/` corren lint/test **solo si cambian** archivos de esa app.

## Secretos

Nunca commits de `.env`. Usa `.env.example`. No pegues tokens en issues/PRs.

## Documentación

Edita `docs/*.md` en el repo y haz commit/PR. Eso es la “wiki” del proyecto.

GitHub Wiki no está disponible en repos **privados** con plan Free. Con Pro/Team (o repo público) puedes usar `pnpm wiki:publish` / `scripts/publish-wiki.sh`.
