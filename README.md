# Roark System

Sistema web con frontend React/Vite, API NestJS y PostgreSQL.

## Entornos

- Produccion: `https://app.roark.uno`
- Desarrollo Docker: `http://dev.roark.uno` o `http://localhost:5173`
- API dev directa: `http://localhost:3000`

Cada entorno usa su propia base y volumen:

| Entorno | Base | Volumen | Puerto Postgres |
| --- | --- | --- | --- |
| Produccion | `db_roark_prod` | `data_roark_prod` | `5432` |
| Desarrollo | `db_roark_dev` | `data_roark_dev` | `5433` |

## Arranque Rapido

Produccion:

```bash
docker compose up -d
```

Desarrollo con hot reload:

```bash
docker compose -f docker-compose.dev.yml up -d --build
```

Seed de datos demo en desarrollo:

```bash
docker compose -f docker-compose.dev.yml exec -T api npm run db:seed -w @roark/api
```

Apagar solo desarrollo:

```bash
docker compose -f docker-compose.dev.yml down
```

## Documentacion

- [Desarrollo](docs/development.md): como correr hot reload, URLs, DNS dev y variables locales.
- [Produccion](docs/production.md): compose productivo, Nginx, certificados y verificaciones.
- [Base de datos](docs/database.md): bases, volumenes, migraciones, seed y backups.
- [Mantenimiento](docs/maintenance.md): limpieza de recursos viejos y comandos de diagnostico.

## Estructura Docker

- `docker-compose.yml`: stack productivo.
- `docker-compose.dev.yml`: stack dev separado, con `name: roark-system-dev`.
- `Dockerfile.api`: build productivo del API.
- `Dockerfile.nginx`: build productivo del frontend + Nginx.
- `Dockerfile.dev`: imagen Node para desarrollo con hot reload.

## DNS

Registros esperados:

```text
A app.roark.uno 200.58.96.246
A dev.roark.uno 200.58.96.246
A roark.uno 200.58.96.246
CNAME www.roark.uno roark.uno
```

`app.roark.uno` usa HTTPS. `dev.roark.uno` esta configurado por HTTP; para HTTPS en dev hay que emitir un certificado adicional.
