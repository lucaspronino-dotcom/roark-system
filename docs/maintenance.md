# Mantenimiento

## Estado general

```bash
docker ps
docker compose ps
docker compose -f docker-compose.dev.yml ps
```

## Logs

Produccion:

```bash
docker compose logs --tail=120 nginx api postgres certbot
```

Desarrollo:

```bash
docker compose -f docker-compose.dev.yml logs --tail=120 api web postgres
```

## Health checks

Produccion:

```bash
curl https://app.roark.uno/api/health
```

Desarrollo:

```bash
curl http://dev.roark.uno/api/health
curl http://localhost:3000/health
```

## Redes Docker

- `roark_app`: red productiva interna entre Nginx, API prod y Postgres prod.
- `roark_dev`: red compartida entre Nginx productivo y servicios dev para publicar `dev.roark.uno`.

Crear la red dev si falta:

```bash
docker network create roark_dev
```

## Limpieza segura

Listar volumenes:

```bash
docker volume ls
```

Volumenes activos esperados:

- `data_roark_prod`
- `data_roark_dev`
- `roark-system_letsencrypt`
- `roark-system_certbot_webroot`
- `roark-system-dev_node_modules`

Volumenes viejos que quedaron como respaldo y no deberian estar montados por los compose actuales:

- `postgres_docker_postgres_data`
- `roark-system-dev_postgres_dev_data`

Antes de borrar cualquier volumen, hacer backup. Para borrar un volumen viejo manualmente:

```bash
docker volume rm NOMBRE_DEL_VOLUMEN
```

No usar `docker volume prune` en este servidor salvo que estes seguro de que no hay otros proyectos con volumenes sin montar.

## Rebuild

Produccion:

```bash
docker compose build
docker compose up -d
```

Desarrollo:

```bash
docker compose -f docker-compose.dev.yml up -d --build
```
