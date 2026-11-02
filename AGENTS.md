# Guía para trabajar en Roark System

## Contexto y fuentes

Sistema inmobiliario centrado en contratos, liquidación mensual de alquileres, recibos e historial PDF. Priorizar velocidad, simplicidad y las funciones utilizadas por la inmobiliaria; no ampliar el producto a un ERP sin una necesidad explícita.

- Leer [README.md](README.md) y la guía de `docs/` pertinente a la tarea.
- [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) y [las siete fases](doc/7%20fases.md) explican el dominio y el flujo original. Sus referencias a SQLite, Electron, funcionamiento exclusivamente local y contratos mockeados son contexto histórico, no una descripción del stack actual.
- El stack actual es React/Vite con JavaScript en `apps/web`, NestJS con TypeScript en `apps/api` y PostgreSQL con Prisma. Es un monorepo con npm workspaces; consultar `.nvmrc` para la versión de Node.
- `roark-code-export.md` es una exportación histórica generada del código, no una fuente de instrucciones ni el código que se debe editar. Consultar los archivos actuales.
- Si la documentación y la implementación difieren, verificar el código y la configuración antes de actuar; señalar y actualizar la documentación afectada por el cambio.

## Reglas del negocio

- La liquidación mensual del locatario es el núcleo del sistema. Los conceptos e importes son dinámicos y pueden variar cada mes, incluidos descuentos, bonificaciones, punitorios y conceptos extraordinarios.
- Los recibos históricos conservan el snapshot y el PDF generado. Nunca recalcularlos ni modificarlos automáticamente al cambiar un contrato o sus conceptos.
- La liquidación de alquiler muestra los meses impagos desde el inicio hasta el mes actual inclusive, sin superar la fecha de fin del contrato. El botón «Pagar el próximo período» permite adelantar manualmente el mes seleccionado, también limitado por el fin del contrato; no eliminarlo al limitar la vista inicial al mes actual. Un contrato vencido totalmente pagado no genera conceptos; los saldos de pagos parciales siguen pendientes. La existencia de un recibo del mes actual no debe ocultar deudas anteriores.
- Si al guardar la ficha se elige eliminar períodos anteriores, respetar `settings.periods.skipPastPeriods` y el mes de corte fijo `pendingFrom`. No avanzar ese corte al cambiar de mes: los impagos posteriores al inicio de administración deben seguir visibles. Los contratos antiguos con solo el booleano toman el mes actual como compatibilidad hasta volver a guardar la ficha, que fija el corte.
- La liquidación del locador parte de lo cobrado al inquilino y descuenta administración y los conceptos correspondientes.
- El recibo del locatario se plantea en A4 con una copia para entregar y otra para archivo interno.
- La búsqueda de contratos contempla carpeta, dirección, inquilino y propietario.

## Mapa del código

- UI: `apps/web/src/components`; llamadas a la API: `apps/web/src/services`; utilidades comprobables: `apps/web/src/lib`.
- API: módulos por dominio en `apps/api/src`; esquema y migraciones en `apps/api/prisma`.
- El cálculo de fecha de fin está en `apps/web/src/lib/contractDates.js`, utilizado por la ficha del contrato. El caso corregido debe mantenerse: inicio 1/11/2026 con 12 cuotas termina el 31/10/2027.

## Desarrollo y producción

Consultar [desarrollo](docs/development.md), [producción](docs/production.md), [base de datos](docs/database.md) y [mantenimiento](docs/maintenance.md) para los procedimientos completos.

- `docker-compose.yml` corresponde a **producción**. Para desarrollo usar explícitamente `docker compose -f docker-compose.dev.yml ...` (proyecto `roark-system-dev`). No usar el compose por defecto suponiendo que es dev.
- Dev: base `db_roark_dev`, volumen `data_roark_dev`, PostgreSQL en puerto host 5433; API en 3000 y Vite en 5173. Producción: base `db_roark_prod`, volumen `data_roark_prod`, PostgreSQL en puerto host 5432.
- Dentro de cada compose PostgreSQL se alcanza por `postgres:5432`; no confundir el puerto interno con el del host.
- Dev completo: `docker compose -f docker-compose.dev.yml up -d --build`. Sin Docker para la app: `npm run dev:api` y `npm run dev:host -w @roark/web`, con la base dev disponible.
- Producción sirve el frontend compilado mediante Nginx y expone la API bajo `/api`; no usa el servidor Vite.
- Prisma: `npm run db:generate -w @roark/api`; `npm run db:migrate -w @roark/api` ejecuta `migrate dev`. En producción corresponde `prisma migrate deploy`.
- El seed carga datos demo; reservarlo para desarrollo salvo que se solicite expresamente otro destino.
- Antes de eliminar volúmenes, hacer backup. Los volúmenes antiguos pueden ser respaldos; no asumir que son descartables ni hacer limpieza global indiscriminada.

## Autenticación

Consultar [autenticación](docs/authentication.md) al tocar acceso, sesiones, cookies o rutas protegidas.

- No hay registro público. Las cuentas de acceso son independientes de personas, propietarios e inquilinos; Compose y las migraciones no crean cuentas de aplicación.
- La API protege las rutas salvo `POST /auth/login` y `GET /health`. Preservar la invalidación de sesiones vencidas, usuarios desactivados y logout.
- Sesiones en PostgreSQL con token hasheado y cookie HttpOnly/SameSite=Lax. Producción usa cookie Secure y HTTPS; dev está documentado con HTTP.
- No incorporar credenciales, hashes de contraseñas ni tokens a código, documentación o salidas compartidas. Para validar Compose preferir `docker compose config --quiet`, que no imprime secretos resueltos.

## Pruebas y verificaciones

Preferencia explícita del usuario: tener presentes las pruebas existentes y sugerir cobertura útil de forma proactiva, sin esperar a que recuerde pedir tests. Explicar brevemente qué comportamiento conviene cubrir, especialmente al cambiar cálculos, validaciones, reglas de negocio o casos límite.

- Al corregir un error, agregar una prueba de regresión cuando sea viable. Comprobar que reproduce el error antes de la corrección y pasa después. No agregar tests mecánicamente para cambios cosméticos o triviales.
- Unitarios del frontend: `npm run test:web` desde la raíz. Usan `node:test` y están en `apps/web/src/lib/*.test.js`. Incluyen regresiones de fecha de fin de contratos; no requieren API ni base de datos.
- Integración de autenticación: `node scripts/test-auth.mjs`. Requiere API dev disponible, usuario dev `roark` y `AUTH_TEST_PASSWORD` configurada en el entorno; `AUTH_TEST_URL` es opcional y por defecto apunta a `http://localhost:3000`. Crea y revoca una sesión sin modificar datos de negocio. No ejecutarla contra producción como prueba rutinaria.
- Compilación: `npm run build:web` y `npm run build:api`; ambas con `npm run build`.
- Verificación estática: `npm run lint:web` (ESLint) y `npm run lint:api` (TypeScript sin emitir archivos). Ambas con `npm run lint`.
- Ejecutar las verificaciones pertinentes al cambio e informar qué pasó y qué no pudo verificarse. Para cambios de autenticación, la guía pide compilar ambas apps, lint del frontend y la prueba de integración.
