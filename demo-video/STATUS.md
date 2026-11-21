# Demo video status

## Final
`demo-video/parche-demo.mp4` — títulos + roles + **música de fondo** (bed sintético propio en `assets/bg-bed.m4a`). Regrabado 2026-11-07 con sesión estable (cookie loopback + no logout al dismiss).

## Regenerar
```bash
cd demo-video
# opcional: regrabar roles
node record-role.mjs cliente|promotor|door|admin
./assemble.sh   # concat + bed @ ~18%
```

## Fixes relevantes
- AuthSheet no se muestra logueado
- Cookie refresh sin Secure en localhost + refresh JSON en loopback
- Door demo en Motor Sur (seed Selva ya terminó)
- `dismissAuthSheet` usa `Cerrar` exacto (no pisa «Cerrar sesión»)
