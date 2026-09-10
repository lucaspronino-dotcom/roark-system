# Desarrollo

## Docker con hot reload

Levantar el entorno dev completo:

```bash
docker compose -f docker-compose.dev.yml up -d --build
```

Servicios:

- `postgres`: PostgreSQL dev con base `db_roark_dev`, publicado en `localhost:5433`.
- `api`: Nest en watch mode, publicado en `localhost:3000`.
- `web`: Vite con hot reload, publicado en `localhost:5173` y proxyeado por Nginx como `http://dev.roark.uno`.

URLs utiles:

```text
http://dev.roark.uno
http://dev.roark.uno/api/health
http://localhost:5173
http://localhost:3000/health
```

El compose dev monta el repo como volumen y mantiene `node_modules` en un volumen Docker para no mezclar dependencias del host con las del contenedor.

## DNS dev

Para usar `dev.roark.uno`, el DNS debe tener:

```text
A dev.roark.uno 200.58.96.246
```

El host esta permitido en Vite desde `apps/web/vite.config.js`.

## Variables locales sin Docker

Si corres API/Web directamente con npm, estos archivos definen el entorno local:

```text
apps/api/.env
apps/web/.env
```

Valores esperados:

```env
DATABASE_URL="postgresql://admin:roark@localhost:5433/db_roark_dev"
PORT=3000
```

```env
VITE_API_URL="http://localhost:3000"
```

Comandos sin Docker para la app:

```bash
npm run dev:api
npm run dev:host -w @roark/web
```

Para que esto funcione, el Postgres dev debe estar arriba. La forma mas simple es dejar corriendo solo la DB dev con Docker:

```bash
docker compose -f docker-compose.dev.yml up -d postgres
```

## Seed dev

Cargar datos demo:

```bash
docker compose -f docker-compose.dev.yml exec -T api npm run db:seed -w @roark/api
```

El seed es idempotente: usa `upsert`, por lo que se puede correr mas de una vez sin duplicar las entidades principales.

## Logs y reinicio

```bash
docker compose -f docker-compose.dev.yml ps
docker compose -f docker-compose.dev.yml logs -f api web postgres
docker compose -f docker-compose.dev.yml restart api web
```

Apagar dev:

```bash
docker compose -f docker-compose.dev.yml down
```

Esto no apaga produccion porque el compose dev usa un nombre de proyecto separado: `roark-system-dev`.
