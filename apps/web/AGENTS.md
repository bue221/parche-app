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
| [docs/features/feat-001-event-detail-seo.md](docs/features/feat-001-event-detail-seo.md) | Public event pages (ISR, metadata, CTA to the app) |
| [docs/features/feat-002-explore-seo.md](docs/features/feat-002-explore-seo.md) | Public explore list + map (URL filters, ItemList, Leaflet) |
| [docs/features/feat-003-artists-legal.md](docs/features/feat-003-artists-legal.md) | Artists SEO, legal pages, env store CTAs, 404 |

## Stack

Next.js 16 App Router · React 19 · Tailwind v4 · TypeScript. Visual tokens match `app-frontend`. Indexed routes: landing, `/explorar`, `/explorar/{hub}`, `/eventos/{slug}`, `/artistas/{id}`, `/legal/*` (published). Do not index `/sistema`.

## Do

- Use semantic color tokens for chrome (`bg-background`, `text-foreground`, `bg-primary`, `bg-surface`).
- Keep display type (Inter bold, mixed case) for hero-scale headlines. Antonio is for stamps only.
- Put SEO metadata in `src/lib/seo.ts` and route `metadata` exports, not ad-hoc `<head>` tags.

## Don't

- Wash the page in aurora. Pigment marks the keyword, live, and brand sparks.
- Use volt/`confirm` as the default button or idle chip.
- Index `/sistema`.
