# Probar otra versión de la base antigua

## Archivos del proceso

| Archivo | Función |
| --- | --- |
| `scripts/inspect-legacy-ods.py` | Lee ODS por partes; reconoce hojas, encabezados, filas repetidas y coordenadas. |
| `scripts/prepare-legacy-migration.py` | Convierte el ODS con las reglas actuales, sin conectar a PostgreSQL. |
| `scripts/compare-legacy-plans.py` | Compara dos planes sin modificar archivos originales ni bases. |
| `scripts/legacy-plan.mjs` | Valida el plan antes de aplicarlo. |
| `scripts/import-legacy-dev.mjs` | Simula/aplica el reemplazo transaccional, exclusivamente en db_roark_dev. |
| `scripts/verify-legacy-plan-dev.mjs` | Compara todos los campos importados con el plan, exclusivamente en desarrollo. |
| `docs/legacy-migration-mapping.md` | Columnas, relaciones, selección de filas, conversiones y supuestos exactos. |

Son archivos del repositorio, no instrucciones que haya que reconstruir del chat.
Los datos reales y los resultados se guardan en `private/`, fuera de Git y del servidor web.
No hace falta API ni PostgreSQL para preparar y comparar. Se necesita Python 3.11+
(el script usa `hashlib.file_digest`); las herramientas JS usan la versión de Node de `.nvmrc`.

## 1. Guardar el archivo actualizado

Copiarlo a una ruta privada nueva, por ejemplo:

```text
private/migration/BB_DD_actualizada.ods
```

No reemplazar `BB_DD.ods`, los planes anteriores ni los backups. No subirlo a `apps/web/public`.
No convertirlo primero a CSV: se necesitan las distintas hojas y sus encabezados.

## 2. Convertir a una carpeta nueva

Desde la raíz del repositorio:

```bash
python3 scripts/prepare-legacy-migration.py private/migration/BB_DD_actualizada.ods --as-of 2026-11-04 --output-dir private/migration/ensayo-003 --skip-missing-owners
```

El ejemplo usa una carpeta nueva: `ensayo-002` ya contiene el plan aplicado.
`--skip-missing-owners` omite expresamente contratos sin propietario y registra las omisiones;
quitarlo si se desea que esas referencias detengan la conversión.
Cambiar fecha y nombre de carpeta para cada ensayo. `--as-of` es la fecha usada para
clasificar contratos activos/vencidos, **no** el inicio de administración. Si se omite,
se usa la fecha del sistema. Para comparar solo diferencias del archivo con el ensayo
original, usar la misma fecha: `--as-of 2026-11-03`.

El conversor crea:

| Resultado | Contenido |
| --- | --- |
| `source.json` | Filas extraídas de las 12 hojas seleccionadas, sin los campos antiguos de acceso filtrados. Incluye registros no seleccionados para importar. |
| `plan.json` | Personas, inquilinos, propietarios, inmuebles, relaciones y contratos convertidos; incidencias en `issues`. |
| `traceability.json` | Archivo/hash/fecha y, por hoja, columnas con letras y filas con ID antiguo, uso y UUID de destino en el plan. |

Si la carpeta ya contiene cualquiera de esos tres archivos, el proceso se detiene
para no sobrescribir el ensayo. Elegir otro `--output-dir`.
Los resultados son privados; no subirlos al repositorio.

## 3. Comparar con el ensayo original

```bash
python3 scripts/compare-legacy-plans.py private/migration/ensayo-002/plan.json private/migration/ensayo-003/plan.json --output private/migration/ensayo-003/comparison.json
```

La consola muestra conteos de agregados, eliminados, modificados y sin cambios.
`comparison.json` contiene IDs y rutas de campos modificados, sin copiar valores
personales. Se ignora el cambio de `settings.legacy.sourceHash` para no marcar todos
los contratos como cambiados solo porque el ODS es otro. Las diferencias reales
incluyen snapshots originales y filas de períodos, no solo campos visibles.
El comparador no sobrescribe un informe existente: usar otro nombre para repetir.

La reproducción histórica de v1 está en `private/migration/audit-v1/`: en ese momento
se verificaron cero diferencias en las seis listas de entidades. El conversor actual
ya cambió el mapeo de comisión y la identidad de inmuebles, por lo que volver a
procesar el ODS original no reproduce necesariamente aquel plan. Conservar ambos.

## 4. Revisar las diferencias antes de importar

Abrir [el mapeo exacto](legacy-migration-mapping.md) y los JSON privados:

- Para un contrato con error, buscar su ID antiguo en `traceability.json`, hoja
  Contrato, registros de `rows`; `row` da su fila en Calc.
- Buscar el encabezado en `columns` de esa hoja; `letter` e `index` dan su posición.
- Revisar `plan.json.issues`: límites de período omitidos, alquileres faltantes,
  contratos omitidos y tipos/estados no mapeados.
- Contrastar original (`source.json`) y convertido (`plan.json`). La guía documenta
  que Per1 se usó como intervalo, DocumentoN como extras y ciertas reglas de
  punitorios se interpretaron provisionalmente. No asumir que son correctas por
  haber pasado la validación estructural.
- Revisar registros `archive-only`, especialmente los conceptos que no encontraron
  contrato. No cuentan como datos importados.

## 5. Aplicar otra versión en desarrollo

El importador no realiza actualizaciones parciales de una importación previa.
Sin `--replace-business-data`, un mismo hash con los mismos contratos termina sin
cambios; otro hash con IDs existentes es rechazado. `--replace-contracts` solo no
elimina esa restricción. No cambiar los UUID para evitarla.

Para revisar un reemplazo completo, esta simulación es de solo lectura:

```bash
docker compose -f docker-compose.dev.yml exec -T api node scripts/import-legacy-dev.mjs private/migration/ensayo-003/plan.json --replace-business-data
```

La aplicación requiere añadir `--apply --replace-contracts` y proporcionar
`--backup private/...dump`. El respaldo se prepara según [base de datos](database.md#backups).
Solo ante indicación expresa de omitirlo puede usarse `--without-backup` en su lugar.
Con `--rollback` adicional se ensaya toda la escritura y se revierte antes de confirmar.

`--replace-business-data` elimina contratos, recibos, relaciones, inmuebles,
inquilinos, propietarios y personas actuales, e inserta el plan en una transacción.
Conserva usuarios y sesiones. No reutiliza inmuebles por carpeta y dirección.
Si falla la escritura se revierte la transacción; no restaura automáticamente un backup.
No ejecutar seed, eliminar volúmenes ni usar el compose productivo para un ensayo.

## Pruebas al cambiar el mapeo

```bash
python3 -m unittest discover -s scripts -p 'test_*.py'
```

Cubren lectura de filas/columnas repetidas, coordenadas físicas con filas vacías,
formatos monetarios, fechas, porcentajes, referencias, DNI ausente, trazabilidad y
comparación entre versiones. Un cambio de regla necesita una prueba con datos
ficticios que muestre la conversión esperada; no copiar personas reales a los tests.

## Omitir contratos sin propietario

El conversor acepta `--skip-missing-owners` para omitir expresamente los contratos
cuyo inmueble carece de relaciones de propietario o tiene una referencia de propietario
inexistente. Conserva las filas originales en `source.json`, registra los contratos
en `plan.json.issues` como `skipped-contract-missing-owner` y los identifica en
la trazabilidad como `skipped-missing-owner`. Sin esta opción sigue rechazando
referencias inválidas. No omite otros errores de conversión.

## Actualización: administración fija

Por indicación del usuario, `RelaciónPropietarios.AdministFija` se importa como
importe en `propertyOwners.commission`, visible en Comisión de la ficha de propiedad.
Por ejemplo, `10.000,50` se guarda como `10000.50`; vacío se convierte en cero.
`AdminPor` conserva su conversión independiente a porcentaje de administración.
Esta regla reemplaza el rechazo previo de administración fija distinta de cero.

## Reimportación completa autorizada (actualización)

El conversor ahora conserva un inmueble por ID original, aunque se repitan carpeta
 y dirección. No agrupa propietarios por nombre. La migración
`20261104010000_allow_repeated_property_folders` reemplaza el índice único por uno no único.
Estas reglas reemplazan la consolidación y reutilización por carpeta/dirección de v1.

El importador admite `--replace-business-data` junto con `--apply --replace-contracts`:
reemplaza todos los contratos, recibos, relaciones, inmuebles, inquilinos, propietarios
 y personas de `db_roark_dev` en una transacción. Conserva usuarios y sesiones.
Sin esa opción siguen rechazándose IDs existentes; ya no se reutilizan inmuebles
por carpeta y dirección. `--without-backup` permite omitir el respaldo solamente
cuando el usuario lo indica expresamente; por defecto sigue requiriéndose `--backup`.
`--rollback` junto con `--apply` ejecuta el reemplazo completo y revierte la transacción
para verificar restricciones antes de la aplicación definitiva.

El ODS actualizado produce 160 contratos: se omite el 94 por propietario inexistente.
Los pagos históricos siguen sin convertirse a recibos operativos en este importador.

### Resultado del ensayo 002

Aplicado en desarrollo desde `private/migration/ensayo-002/plan.json`, sin respaldo
nuevo por instrucción expresa. Se reemplazaron los datos de negocio anteriores:
160 contratos (90 activos y 70 vencidos), 119 inmuebles, 126 inquilinos,
58 propietarios, 184 personas y 121 relaciones de propiedad. Se omitió el contrato
94, inmueble de ID 86, por falta de propietario. Se conservaron usuario y sesión.
Se verificó previamente el reemplazo con rollback; después se compararon todos los
campos de las seis listas de entidades contra el plan. No se importaron recibos.

Verificación de solo lectura del plan aplicado:

```bash
docker compose -f docker-compose.dev.yml exec -T api node scripts/verify-legacy-plan-dev.mjs private/migration/ensayo-002/plan.json
```

## Reutilizar la migración para producción

Los scripts están en `scripts/`; no dependen del historial del chat. El conversor
`prepare-legacy-migration.py` y el validador `legacy-plan.mjs` se pueden reutilizar
para preparar datos destinados a producción. En cambio, `import-legacy-dev.mjs`
, `import-legacy-history-dev.mjs` y `verify-legacy-plan-dev.mjs` verifican
explícitamente `db_roark_dev` y rechazan
`db_roark_prod`. **Todavía no hay un importador habilitado para producción.**
Cambiar el comando de Compose no elimina esta limitación.

Archivos privados del ensayo validado:

- ODS: `private/migration/BB_DD_actualizada.ods`.
- Plan aplicado: `private/migration/ensayo-002/plan.json`.
- Datos fuente: `private/migration/ensayo-002/source.json`.
- Trazabilidad: `private/migration/ensayo-002/traceability.json`.
- Historial: `private/migration/history-20261105/history-plan.json`.
- Procedimiento del historial: [historial de pagos](legacy-payment-history.md).

Estos archivos están fuera de Git: deben conservarse o transferirse por separado,
sin publicarlos en el frontend ni incluirlos en imágenes Docker. Si cambia la planilla,
generar otro ensayo y compararlo con el 002. La clasificación activo/vencido del plan
validado corresponde al `--as-of 2026-11-04`; para una carga futura revisar la fecha
y volver a validar, sin sobrescribir el ensayo anterior.

Antes de importar a producción queda preparar lo siguiente:

1. Revisar el histórico ya ensayado en desarrollo: 1.789 recibos de inquilinos,
   83 con importes a revisar y 3.846 registros excluidos con motivo en el plan.
   Se conserva como historial de solo lectura; no concilia automáticamente saldos
   ni períodos pagados y no contiene PDFs originales. Revisar las exclusiones y
   acordar la conciliación o el corte de administración antes de habilitar cobros.
2. Adaptar el importador y el verificador con selección y comprobación explícita
   de la base productiva, incluyendo el importador de historial. Definir cómo se
   ejecutarán con acceso privado a ambos planes. El historial exige contratos con
   el mismo hash de origen e identidad; importar y verificar contratos primero.
3. Desplegar las migraciones de esquema pendientes mediante `prisma migrate deploy`,
   incluidas `20261104010000_allow_repeated_property_folders` y
   `20261104020000_receipt_history`, y generar Prisma con el esquema actualizado.
   Recrear o reiniciar la API y desplegar el frontend actualizado; comprobar el
   historial mediante HTTP autenticado, no solo mediante Prisma en otro proceso.
   Consultar [producción](production.md).
4. Revisar qué datos existen en producción y decidir expresamente si se reemplazan
   o se conservan. El reemplazo completo usado en desarrollo borra todos los datos
   de negocio; no es una actualización incremental. La decisión de no crear respaldo
   en este ensayo de desarrollo no define el procedimiento de producción. Preparar
   y verificar un respaldo productivo y el procedimiento de recuperación antes
   de aplicar cambios.
5. Ensayar el plan, comprobar conteos, relaciones, comisiones, carpetas repetidas
   y omisiones; después de aplicar, verificar los campos y el histórico conciliado.

Las reglas ya acordadas son conservar las identidades originales aunque coincidan
carpeta/dirección o nombres de propietarios, llevar `AdministFija` a Comisión como
importe, y registrar los contratos omitidos por falta de propietario. El contrato
94 omitido en este ensayo debe revisarse nuevamente si el ODS se corrige.

## Conceptos regulares importados

Desde el 17/11/2026, los conceptos conservados en `settings.legacy.fixedConcepts`
se incorporan al abrir la liquidación. No hace falta repetir el reemplazo de datos.
Consultar [reglas, pruebas y límites](legacy-concepts.md). Se mantienen la revisión
previa de saldos y el corte fijo de administración; no se modifican recibos históricos.
