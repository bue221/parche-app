# Guía de contribución

## Licencia

Al abrir un PR aceptas que tus aportes se publiquen bajo **PolyForm Noncommercial 1.0.0** (mismas condiciones que el resto del monorepo): código visible, **sin uso comercial**. Ver [Licencia](Licencia).

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

## Documentación / Wiki

1. Edita `docs/*.md` en el repo.
2. Publica al GitHub Wiki: `pnpm wiki:publish` (o el workflow `wiki.yml`).

La primera vez, GitHub exige crear una página en la UI ([wiki](https://github.com/bue221/parche-app/wiki) → Create the first page); después el remoto `.wiki.git` acepta pushes.
