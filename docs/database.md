# Database setup

This project targets PostgreSQL 18.4 for local development.

Recommended local values:

```txt
Database: roark_system
Application user: roark
Password: choose your own local password
Port: 5432
```

Do not commit real passwords. Store them only in `apps/api/.env`.

## API environment

Create the API env file:

```bash
cp apps/api/.env.example apps/api/.env
```

Set your local password:

```env
DATABASE_URL="postgresql://roark:YOUR_PASSWORD@localhost:5432/roark_system?schema=public"
PORT=3000
```

## Windows setup with DBeaver

Use this path if PostgreSQL is installed on Windows and you prefer creating the
database manually.

1. Open DBeaver and connect as the PostgreSQL admin user, usually `postgres`.
2. Open a SQL editor connected to the default `postgres` database.
3. Create the application user:

```sql
CREATE ROLE roark WITH LOGIN PASSWORD 'YOUR_PASSWORD';
```

If the role already exists:

```sql
ALTER ROLE roark WITH LOGIN PASSWORD 'YOUR_PASSWORD';
```

4. Create the project database:

```sql
CREATE DATABASE roark_system OWNER roark;
```

If the database already exists:

```sql
ALTER DATABASE roark_system OWNER TO roark;
GRANT ALL PRIVILEGES ON DATABASE roark_system TO roark;
```

5. Connect DBeaver to `roark_system` and run:

```sql
ALTER SCHEMA public OWNER TO roark;
GRANT ALL ON SCHEMA public TO roark;
```

6. Update `apps/api/.env` with the same password.
7. Run migrations:

```bash
npm run db:migrate -w @roark/api
```

If the API runs from WSL but PostgreSQL runs on Windows, `localhost` may not
resolve to the Windows PostgreSQL server. The simplest development setup is to
run PostgreSQL in the same environment where you run the API.

## Linux or WSL setup

Use this path if PostgreSQL runs inside Linux/WSL.

Install PostgreSQL and the client:

```bash
sudo apt update
sudo apt install postgresql postgresql-client
sudo service postgresql start
```

Create the database and role:

```bash
sudo -u postgres psql
```

Then run:

```sql
CREATE ROLE roark WITH LOGIN PASSWORD 'YOUR_PASSWORD';
CREATE DATABASE roark_system OWNER roark;
ALTER ROLE roark CREATEDB;
\c roark_system
ALTER SCHEMA public OWNER TO roark;
GRANT ALL ON SCHEMA public TO roark;
```

Exit `psql`:

```sql
\q
```

Update `apps/api/.env`, then run migrations:

```bash
npm run db:migrate -w @roark/api
```

`ALTER ROLE roark CREATEDB` is needed for local development because
`prisma migrate dev` creates a temporary shadow database to validate migrations.

## Optional setup script

There is also a helper script for Linux/WSL environments with `psql` available:

```bash
ROARK_DB_PASSWORD="YOUR_PASSWORD" npm run db:setup
```

It creates or updates:

- role `roark`;
- database `roark_system`;
- schema ownership/privileges.
- local `CREATEDB` permission for Prisma shadow databases.

## Prisma migrations

Prisma owns the application database schema and migrations.

Common commands:

```bash
npm run db:generate -w @roark/api
npm run db:migrate -w @roark/api
npm run db:seed -w @roark/api
npm run db:studio -w @roark/api
```

The initial migration creates:

- `people`
- `tenants`

`people.dni` is unique. `tenants.personId` is unique and references
`people.id`, so a person can have one tenant profile for now.

## Seed data

The initial seed migrates the current hardcoded sample tenants into the database:

```bash
npm run db:seed -w @roark/api
```

The seed is idempotent and uses stable demo DNI values from `90000000` to
`90000006` because the old hardcoded frontend data does not include real DNI
values yet.

## Production notes

Do not use the local development permissions as-is in production.

Recommended production split:

- migration/deploy user: can run schema migrations;
- application user: can only read/write application data.

The application runtime user should not need `CREATEDB`.

In production, prefer:

```bash
npm run db:generate -w @roark/api
npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
```

`prisma migrate deploy` applies already-created migrations and does not use the
development shadow database workflow. It should be executed by a deployment
process or migration user with the minimum schema privileges required for the
release.

The API should run with a separate `DATABASE_URL` for the restricted application
user. That user should not be the database superuser and should not own more
databases than necessary.

## TODO

- Add `docker-compose.yml` with PostgreSQL for a fully reproducible local setup.
- Add a one-command setup flow that starts Postgres, waits for readiness, and
  runs Prisma migrations.
