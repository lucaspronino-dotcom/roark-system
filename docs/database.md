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

## Diagrama entidad-relación

Esquema de la rama `dev`, definido en [schema.prisma](../apps/api/prisma/schema.prisma), incluyendo usuarios y sesiones. Los nombres corresponden a las tablas de PostgreSQL.

`PK`: clave primaria. `FK`: clave foránea. `UK`: campo único. `||`: exactamente uno. `o|`: cero o uno. `o{`: cero o muchos.

```mermaid
erDiagram
    people ||--o| tenants : "puede ser"
    people ||--o| owners : "puede ser"
    properties ||--o{ property_owners : tiene
    owners ||--o{ property_owners : participa
    properties ||--o{ contracts : tiene
    tenants ||--o{ contracts : alquila
    owners ||--o{ contracts : firma
    contracts ||--o{ receipts : genera
    users ||--o{ sessions : inicia

    people {
        uuid id PK
        string firstName
        string lastName
        string dni UK "Opcional; NULL si se desconoce"
        string phone
        string email "Opcional"
        datetime createdAt
        datetime updatedAt
    }

    tenants {
        uuid id PK
        uuid personId FK, UK
        string rentalAddress
        datetime createdAt
        datetime updatedAt
    }

    owners {
        uuid id PK
        uuid personId FK, UK
        string address
        string city
        string transferAliasOrCbu "Opcional"
        datetime createdAt
        datetime updatedAt
    }

    properties {
        uuid id PK
        string folder
        string address
        string type
        string status
        string city
        datetime createdAt
        datetime updatedAt
    }

    property_owners {
        uuid id PK
        uuid propertyId FK
        uuid ownerId FK
        boolean isPrimary
        float participation
        float administration
        float commission
        datetime createdAt
        datetime updatedAt
    }

    contracts {
        uuid id PK
        string folder
        datetime startDate
        datetime endDate
        ContractStatus status "ACTIVE | EXPIRED"
        uuid propertyId FK
        uuid tenantId FK
        uuid ownerId FK
        json settings "Opcional"
        datetime createdAt
        datetime updatedAt
    }

    receipts {
        uuid id PK
        int number UK
        ReceiptKind kind "OWNER_SETTLEMENT | TENANT_SETTLEMENT"
        ReceiptOrigin origin "NATIVE | LEGACY"
        datetime date
        float total "Opcional en históricos"
        float paid "Opcional en históricos"
        float balance "Opcional en históricos"
        string personName
        uuid contractId FK
        string pdfBase64 "Opcional; histórico sin PDF original"
        json snapshot
        datetime createdAt
        datetime updatedAt
    }

    users {
        uuid id PK
        string username UK
        string passwordHash
        boolean active
        datetime createdAt
    }

    sessions {
        uuid id PK
        string tokenHash UK
        uuid userId FK
        datetime expiresAt
    }
```

Restricciones únicas compuestas:

- `properties(folder, address)` es un índice no único: admite inmuebles distintos con igual carpeta y dirección.
- `property_owners(propertyId, ownerId)`.

Los usuarios de acceso son independientes de las personas, propietarios e inquilinos. Consultar [Autenticación](authentication.md) para el funcionamiento de las sesiones.

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

## Migración desde el sistema anterior

Consultar [el relevamiento de BB_DD.ods](legacy-migration.md) para el inventario,
el mapeo inicial y las decisiones pendientes antes de importar datos reales.
