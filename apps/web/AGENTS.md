<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Parche web

This project uses **pnpm only**. Do not run `npm`, `yarn`, or `bun` for installs or scripts.

## Project rules live in `docs/`

Treat `docs/` as the source of truth for product, UI, and architecture rules. Read the matching file before changing that area.

**Always index new docs.** Any new or moved file under `docs/` must be linked in [docs/README.md](docs/README.md) and in the table below in the same change.

| Path | Covers |
|------|--------|
| [docs/README.md](docs/README.md) | Index of all project rule docs |
| [docs/ui/design.md](docs/ui/design.md) | Visual system: light/dark tokens, type, components |

## Stack

Next.js 16 App Router · React 19 · Tailwind v4 · TypeScript. Visual tokens match `app-frontend`. Landing is the only public indexed route.

## Do

- Use semantic color tokens for chrome (`bg-background`, `text-foreground`, `bg-primary`).
- Keep display type (Antonio / Foggy) for hero-scale headlines only.
- Put SEO metadata in `src/lib/seo.ts` and route `metadata` exports, not ad-hoc `<head>` tags.

## Don't

- Color on buttons, borders, or text (except `confirm` on success).
- Shadows or gradients on UI.
- Index `/sistema`.
