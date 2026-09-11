# Produccion

## Arquitectura

```text
https://app.roark.uno
-> nginx container :443
-> frontend estatico compilado desde apps/web
-> /api -> api container :3000
-> postgres container del compose del proyecto
```

Servicios en `docker-compose.yml`:

- `postgres`: base `db_roark_prod`, volumen `data_roark_prod`, puerto host `5432`.
- `api`: API Nest compilada, interna en Docker.
- `nginx`: sirve el frontend compilado y proxya `/api`.
- `certbot`: renueva certificados Let's Encrypt.

El frontend productivo no usa Vite. `docker/nginx/Dockerfile` compila `apps/web` y copia `apps/web/dist` a Nginx.

## Levantar o actualizar

```bash
cd ~/dev/roark-system
docker compose config
docker compose build
docker compose run --rm --no-deps nginx nginx -t
docker compose up -d --remove-orphans
```

## Verificaciones

```bash
docker compose ps
docker compose logs --tail=80 nginx api postgres certbot
curl -I http://app.roark.uno/
curl -I https://app.roark.uno/
curl https://app.roark.uno/api/health
echo | openssl s_client -servername app.roark.uno -connect app.roark.uno:443 2>/dev/null | openssl x509 -noout -subject -issuer -dates
```

Resultado esperado:

- HTTP redirige a HTTPS.
- HTTPS devuelve el HTML compilado del frontend.
- `/api/health` devuelve `{"ok":true,"service":"roark-api"}`.
- El certificado corresponde a `app.roark.uno`.

## Certificado inicial

El stack usa Let's Encrypt con certificados persistidos en el volumen `roark-system_letsencrypt`. Si hay que emitir desde cero para `app.roark.uno`:

```bash
docker compose stop certbot
docker compose run --rm --entrypoint sh certbot -c 'rm -rf /etc/letsencrypt/live/app.roark.uno /etc/letsencrypt/archive/app.roark.uno /etc/letsencrypt/renewal/app.roark.uno.conf && certbot certonly --webroot --webroot-path /var/www/certbot -d app.roark.uno --register-unsafely-without-email --agree-tos --no-eff-email --non-interactive'
docker compose exec -T nginx nginx -s reload
docker compose up -d certbot
```

`dev.roark.uno` esta configurado por HTTP. Para servir dev por HTTPS hay que emitir un certificado adicional y agregar un bloque `listen 443 ssl` para ese host.

## DNS

Registros esperados:

```text
A app.roark.uno 200.58.96.246
A dev.roark.uno 200.58.96.246
A roark.uno 200.58.96.246
CNAME www.roark.uno roark.uno
```

## Systemd viejo

Antes esta app estaba publicada con systemd usando `npm run dev:host -w @roark/web` y `npm run dev:api`. Si esos servicios todavia existen, conviene dejarlos apagados para no publicar puertos de desarrollo por fuera de Docker:

```bash
sudo systemctl disable --now roark-web roark-api
```
