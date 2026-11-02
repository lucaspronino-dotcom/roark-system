# Acceso al sistema

La app exige iniciar sesión con un usuario activo de la tabla `users`. No existe registro público. Las cuentas se administran manualmente en la base de cada entorno; también se creó una cuenta de acceso en producción. Docker Compose y las migraciones no crean usuarios de la aplicación. No incluir credenciales, hashes de contraseñas ni tokens de sesión en el repositorio o la documentación.

Las contraseñas usan scrypt con salt aleatorio. Las sesiones duran ocho horas, se guardan en PostgreSQL mediante un hash del token y se transportan con una cookie HttpOnly, SameSite=Lax. Cerrar sesión elimina la sesión del servidor. Usuarios desactivados y sesiones vencidas no pueden acceder. La API protege todas las rutas salvo `POST /auth/login` y `GET /health`.

La migración se aplica con `prisma migrate deploy` (el arranque de Docker dev ya lo ejecuta). No crea cuentas automáticamente. Para dar de alta una cuenta manualmente, generar `salt` con `randomBytes(16).toString("hex")` y guardar `salt + ":" + scryptSync(password, salt, 64).toString("hex")` en `passwordHash`, junto con un UUID y el nombre de usuario. No guardar contraseñas en texto plano.

`AUTH_ALLOWED_ORIGINS` configura los orígenes del frontend permitidos. `AUTH_COOKIE_SECURE=true` exige HTTPS para la cookie; dev usa actualmente HTTP y por eso mantiene esta opción desactivada. El Compose productivo ya define `AUTH_ALLOWED_ORIGINS=https://app.roark.uno` y `AUTH_COOKIE_SECURE=true`. Estas opciones configuran el acceso web y la cookie; no modifican las cuentas existentes. Las cuentas persisten en la base de datos al recrear los contenedores mientras se conserve su volumen.

El login admite diez intentos por minuto por IP observada por la API. El límite es local al proceso; detrás del proxy actual, las solicitudes comparten su IP. Para escalar a varios procesos, se necesitará un límite compartido y una configuración explícita de proxies confiables.

## Verificación

Compilar API y frontend, ejecutar el lint del frontend y correr `node scripts/test-auth.mjs` con `AUTH_TEST_PASSWORD` configurada mediante el entorno. Opcionalmente definir `AUTH_TEST_URL` (por defecto `http://localhost:3000`). La prueba utiliza el usuario dev `roark`, verifica acceso anónimo, credenciales inválidas, origen no permitido, cookies, acceso autenticado y revocación al cerrar sesión. No modifica datos de negocio.
