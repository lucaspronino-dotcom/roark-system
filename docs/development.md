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

Los servicios `postgres`, `api` y `web` usan `restart: unless-stopped`: se
reinician automáticamente si fallan o se reinicia Docker/el servidor. Si se
detienen explícitamente, permanecen apagados hasta volver a iniciarlos.

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

## Ordenamiento del listado de contratos

Los seis encabezados permiten alternar ascendente/descendente; inicialmente se
ordena por carpeta ascendente. Cobros ordena por nombre de inquilino y Liquidación
por nombre de propietario. En móvil se usa el selector de columna y dirección.
La búsqueda conserva el orden elegido. Los contratos con valores iguales se mantienen
separados, en el orden relativo recibido; las filas usan el ID del contrato como clave.

`apps/web/src/lib/contractSorting.js` concentra las claves admitidas y la comparación
local: carpetas con orden natural (2 antes que 10), fechas `día/mes/año`, texto español
sin diferencias por mayúsculas/acentos, y valores vacíos o fechas inválidas al final.
No modifica el arreglo de origen. Las pruebas están en `contractSorting.test.js`.

Para migrar a ordenamiento de backend, `ContractsTable` admite:

- `sort`: estado controlado `{ field, direction }` (o `null` para no ordenar).
- `onSortChange(nextSort)`: notifica los cambios al contenedor.
- `sortingMode="server"`: presenta los datos sin ordenarlos localmente.

El modo actual es `client`, con estado interno si no se proporciona `sort`.
En una implementación futura el contenedor deberá guardar el estado, consultar
`getContracts` al cambiarlo y pasar los resultados a la tabla. El servicio deberá
traducir las claves `folder`, `endDate`, `address`, `status`, `tenant`, `owner` y las
direcciones `asc`/`desc` a parámetros validados por la API. Hoy no se envían esos
parámetros ni existe ordenamiento nuevo en el backend. Los nombres de inquilino y
propietario requieren ordenar sus relaciones; las fechas deben usar el campo de
fecha real. Mantener la semántica de carpetas numéricas y valores vacíos, y usar un
desempate estable por ID si se incorpora paginación. En ese caso también habrá que
mover la búsqueda al servidor para filtrar el conjunto completo, no solo una página.

## Filtros del listado de contratos

El botón de filtros, arriba a la derecha de la tabla principal, abre un panel
lateral derecho. «Mostrar contratos vencidos» está activado por defecto; al
apagarlo se ocultan las filas con estado `Vencido`, también en las tarjetas móviles.
El filtro se combina con la búsqueda y conserva el orden elegido. Se aplica al
instante y no modifica contratos ni liquidaciones. El botón indica cuando hay un
filtro activo y «Restablecer» vuelve a mostrar todos los estados. El panel admite
Escape, clic fuera y cierre por botón, con foco controlado por Radix Dialog.
La selección vive en la tabla y vuelve al valor inicial si esta se desmonta.

`apps/web/src/lib/contractFilters.test.js` comprueba la combinación con la búsqueda,
la restauración del listado y la conservación del orden y los datos originales.
