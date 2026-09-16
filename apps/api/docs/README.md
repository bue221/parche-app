# Project rules

Product and engineering rules for the Parche backend live in this folder. Agents and humans should read the relevant file here before changing that area.

| Doc | Use when |
|-----|----------|
| [prd.md](prd.md) | API, Docker, RBAC, media, maps, tokens — visión y contratos globales |
| [features/README.md](features/README.md) | Índice F01–F30: cada tarea del PRD como feature implementable |

## How to add a rule doc

Required in the same change as the new file:

1. Put it under `docs/<area>/` or `docs/` for top-level specs.
2. Add a row to the table in this file.
3. Add a row to the index table in [AGENTS.md](../AGENTS.md).
