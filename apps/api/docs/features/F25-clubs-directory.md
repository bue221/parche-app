# F25 Directorio de clubes

Venues persistentes (clubes, casas) explorables aparte de un evento suelto.

**Depends on:** F07  
**Unlocks:** RC-023  
**Stories:** RC-023

## Quick path

1. `venues.kind = club | other`. Promoter marca al crear.
2. `GET /v1/clubs` públicos con ≥1 published **o** `listed=true` (directorio, aunque no haya fecha).
3. Detalle: pin, address, próximos eventos.

## HTTP

| Método | Ruta | Auth |
|--------|------|------|
| GET | `/v1/clubs` | público; q, bbox |
| GET | `/v1/clubs/{id}` | público si listed |
| POST | `/v1/clubs` | promoter; crea venue kind=club listed |
| PATCH | `/v1/clubs/{id}` | tenant owner del venue |

`listed=false` por default hasta que haya un published, o el promoter lista explícito.

## Checklist

- [x] Mapa de clubes sin Google
- [x] Próximos eventos embebidos
- [x] No duplicar tabla: es vista sobre venues

## Next step

Explore tab “Clubes”.
