# Project rules

Product and engineering rules for Parche web live in this folder. Agents and humans should read the relevant file here before changing that area.

| Doc | Use when |
|-----|----------|
| [ui/design.md](ui/design.md) | Building or restyling UI: light/dark tokens, type, radii, components |
| [features/feat-001-event-detail-seo.md](features/feat-001-event-detail-seo.md) | Public event detail pages: ISR, metadata, sitemap, CTA to the app |
| [features/feat-002-explore-seo.md](features/feat-002-explore-seo.md) | Public explore list + map: filters URL, ItemList JSON-LD, Leaflet |
| [features/feat-003-artists-legal.md](features/feat-003-artists-legal.md) | Artist pages, legal, store CTAs by env, improved 404 |

## How to add a rule doc

Required in the same change as the new file:

1. Put it under `docs/<area>/`.
2. Add a row to the table in this file.
3. Add a row to the index table in [AGENTS.md](../AGENTS.md).
