# Roark System

Sistema web con API y frontend en workspaces npm.

## Levantar el entorno local

1. Levantar PostgreSQL:

```bash
cd ~/dev/postgres_docker
docker compose up -d
```

2. Levantar la API:

```bash
cd ~/dev/roark-system
npm run dev:api
```

3. En otra terminal, levantar el frontend:

```bash
cd ~/dev/roark-system
npm run dev:host -w @roark/web
```

El frontend usa `VITE_API_URL` desde `apps/web/.env`. Hoy apunta a
`http://roark.uno:3000`; si entras por IP y falla alguna llamada a la API,
cambialo a `http://200.58.96.246:3000` y reinicia Vite.

## Base de datos

La guia completa de configuracion, migraciones y seed esta en
[`docs/database.md`](docs/database.md).
