# Base De Datos

## Bases y volumenes

| Entorno | Base | Volumen | Puerto host | Compose |
| --- | --- | --- | --- | --- |
| Produccion | `db_roark_prod` | `data_roark_prod` | `5432` | `docker-compose.yml` |
| Desarrollo | `db_roark_dev` | `data_roark_dev` | `5433` | `docker-compose.dev.yml` |

Ambas bases usan PostgreSQL 16 y credenciales actuales:

```text
POSTGRES_USER=admin
POSTGRES_PASSWORD=roark
```

Dentro de Docker, las APIs conectan al host de servicio `postgres:5432`. Desde el host:

```text
Produccion: postgresql://admin:roark@localhost:5432/db_roark_prod
Desarrollo: postgresql://admin:roark@localhost:5433/db_roark_dev
```

## Migraciones

Prisma maneja el schema desde `apps/api/prisma/schema.prisma` y `apps/api/prisma/migrations`.

Comandos habituales:

```bash
npm run db:generate -w @roark/api
npm run db:migrate -w @roark/api
npm run db:seed -w @roark/api
npm run db:studio -w @roark/api
```

En Docker dev, el API ejecuta al arrancar:

```bash
npm run db:generate -w @roark/api
cd apps/api && npx prisma migrate deploy
```

Eso aplica migraciones pendientes sobre `db_roark_dev`.

Para produccion, usar `migrate deploy`, no `migrate dev`:

```bash
docker compose exec -T api sh -c 'cd apps/api && npx prisma migrate deploy'
```

## Seed

El seed actual carga datos demo de personas, inquilinos, propietarios, propiedades y contratos.

Ejecutar seed en dev:

```bash
docker compose -f docker-compose.dev.yml exec -T api npm run db:seed -w @roark/api
```

Evitar correr seed en produccion salvo que sea intencional.

## Verificaciones

Base productiva:

```bash
docker compose exec -T postgres psql -U admin -d db_roark_prod -c 'select current_database();'
```

Base dev:

```bash
docker compose -f docker-compose.dev.yml exec -T postgres psql -U admin -d db_roark_dev -c 'select current_database();'
```

Conteos utiles en dev:

```bash
docker compose -f docker-compose.dev.yml exec -T postgres psql -U admin -d db_roark_dev -c 'select count(*) from people;'
docker compose -f docker-compose.dev.yml exec -T postgres psql -U admin -d db_roark_dev -c 'select count(*) from properties;'
docker compose -f docker-compose.dev.yml exec -T postgres psql -U admin -d db_roark_dev -c 'select count(*) from contracts;'
```

## Backups

Backup productivo:

```bash
docker compose exec -T postgres pg_dump -U admin -d db_roark_prod > backup_db_roark_prod.sql
```

Restore productivo desde un dump SQL:

```bash
docker compose exec -T postgres psql -U admin -d db_roark_prod < backup_db_roark_prod.sql
```

Backup dev:

```bash
docker compose -f docker-compose.dev.yml exec -T postgres pg_dump -U admin -d db_roark_dev > backup_db_roark_dev.sql
```

## Volumenes viejos

Estos volumenes quedaron como respaldo de la migracion de nombres:

- `postgres_docker_postgres_data`
- `roark-system-dev_postgres_dev_data`

No son usados por los compose actuales. Se pueden borrar manualmente cuando confirmes que `data_roark_prod` y `data_roark_dev` estan correctos y respaldados.
