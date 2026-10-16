# Setup local

## 1. Clonar

```bash
git clone https://github.com/bue221/parche-app.git
cd parche-app
```

## 2. Variables de entorno

```bash
cp apps/api/.env.example apps/api/.env
cp apps/mobile/.env.example apps/mobile/.env
cp apps/web/.env.example apps/web/.env
```

Ajusta URLs si no usas los puertos por defecto (`8080` API, `3000` web, `8081` Expo web).

## 3. API (Go + Docker)

```bash
cd apps/api
COMPOSE_PARALLEL_LIMIT=1 docker compose up --build
```

Comprueba: `http://localhost:8080/v1/events`.

Cuentas demo (password `parche1234`): `ata@`, `promoter@`, `door@`, `metrics@`, `admin@`, `luna@` — todas `@parche.test`.

Si el build falla por disco o OOM, ver `apps/api/README.md` (prune de Docker, `COMPOSE_PARALLEL_LIMIT=1`).

## 4. Mobile (Expo)

```bash
cd apps/mobile
pnpm install
pnpm start
```

Requiere pnpm 12.3.4 (`packageManager` en su `package.json`).

## 5. Web (Next.js)

```bash
cd apps/web
pnpm install
pnpm dev
```

Abre `http://localhost:3000`. `API_URL` debe apuntar a la API local.

## Atajos desde la raíz

Tras instalar deps en cada app JS:

```bash
pnpm dev:api
pnpm dev:mobile
pnpm dev:web
```
