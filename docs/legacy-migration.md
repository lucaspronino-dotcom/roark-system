# Migración de la base antigua (BB_DD.ods)

- [Mapeo exacto de hojas, filas y columnas](legacy-migration-mapping.md).
- [Probar una planilla actualizada y comparar versiones](legacy-migration-retry.md).

El historial de la planilla actualizada se documenta en
[Historial de pagos](legacy-payment-history.md). La sección siguiente describe la
primera importación del 3 de noviembre.

## Resultado aplicado en desarrollo

El 3 de noviembre de 2026 se reemplazaron los 9 contratos y sus 2 recibos de
`db_roark_dev` por los 105 contratos de BB_DD.ods: 15 activos y 90 vencidos o
rescindidos según esa fecha. No se modificó producción ni cuentas de acceso.
Se importaron las personas vinculadas a esos contratos: 101 inquilinos y 61
propietarios (162 personas sin fusionar identidades por nombre), 100 inmuebles y
105 relaciones de propiedad. Los demás registros de catálogo existentes se
conservaron; un inmueble con igual carpeta/dirección se reutilizó y actualizó.

Los 102 IDs de inmuebles referenciados se consolidaron en 100 claves carpeta/dirección.
Los pares de IDs antiguos 82/126 y 102/103 tienen iguales propietarios, participaciones,
administración y localidad. Sus contratos siguen separados; cada ficha conserva
el snapshot del inmueble original. No se consolidan duplicados con propietarios
ni localidades diferentes.

- DNI opcional en Prisma, DTO, servicios y formularios. Ausencia o blanco se guarda
  como NULL; varios NULL son válidos. Los DNI informados siguen siendo únicos.
  Un PATCH que omite DNI lo conserva; vacío o NULL lo borra.
- Inicio de administración vacío en los 105 contratos (`pendingFrom: null`,
  `skipPastPeriods: false`). Se puede completar en la ficha; fija el primer día del
  mes elegido, sin avanzar con el calendario.
- Se conservaron fechas originales, cuotas, importes disponibles, rescisión y
  porcentajes conocidos. Hay importes vacíos en 74 fichas y 16 límites de períodos
  incoherentes; los valores originales se guardaron en `settings.legacy`.
- Tipo/estado del inmueble e índice de ajuste quedaron vacíos cuando no se pudo
  identificar el catálogo original; no se asignaron códigos ni valores inventados.
- De los 325 conceptos antiguos, 277 están conservados por contrato en `settings.legacy.fixedConcepts`
  y se pueden consultar en la ficha. No se aplican automáticamente a los cobros,
  porque los códigos de imputación y las reglas históricas aún requieren conciliación.
  Los otros 48 no encontraron contrato coincidente y solo quedaron en el respaldo privado.
  Este conteo corrige el informe inicial que atribuía los 325 a las fichas.
- Los 1.618 recibos y movimientos antiguos se conservaron en el ODS y en la extracción
  privada `source.json`. No se convirtieron en recibos operativos ni se generaron PDFs:
  faltan vínculos/períodos inequívocos. La falta de PDF no impidió importar los contratos.
- Cada contrato importado tiene `legacy.reconciliationRequired: true`. La UI no
  calcula deudas ni anticipos y la API rechaza emitir recibos mientras esté marcado.
  Después de revisar importes, conceptos, saldos e inicio de administración, marcar
  «Saldos y conceptos revisados; habilitar liquidaciones» y guardar la ficha.
  Sin corte se consideran los períodos desde el inicio contractual; la revisión no
  reconstruye pagos antiguos automáticamente.

El original está en `private/migration/BB_DD.ods`. La carpeta está excluida de Git,
Docker y del acceso de archivos de Vite (`server.fs.deny`, también rutas `/@fs/`).
Los informes y copias contienen datos reales y deben mantenerse privados.

Backups PostgreSQL (formato custom, inventario comprobado con `pg_restore --list`):

- `private/migration/before-legacy-20261103.dump`: antes de cambiar el esquema de DNI.
- `private/migration/before-replacement-20261103.dump`: después del cambio de esquema,
  inmediatamente antes del reemplazo de contratos.

## Preparación, simulación y aplicación

Consultar [el procedimiento de nuevos ensayos](legacy-migration-retry.md). Cada
conversión debe usar una carpeta nueva mediante `--output-dir` y conserva origen,
plan y trazabilidad. No volver a generar sobre `private/migration/plan.json`.

El importador solo acepta `db_roark_dev`. Una reejecución del mismo archivo ya
importado no modifica datos. **Una versión distinta con IDs ya importados se rechaza**:
no hay soporte de actualización automática entre versiones. Primero comparar offline;
no borrar datos ni cambiar UUID para eludir el control.

## Validación realizada

- 40 pruebas frontend; lector ODS y conversiones Python (4 pruebas).
- Normalización de DNI; validación real de los DTO de alta/edición de ambos roles.
- Integración dev: múltiples DNI NULL, unicidad con DNI informado, rollback de altas
  fallidas y de borrado de contratos; altas/ediciones de servicios revertidas.
- Verificación de los 105 contratos contra el plan (fechas, personas, propietarios,
  ajustes y snapshots); bloqueo de recibos pendientes de conciliación.
- Segunda ejecución de importación: sin modificaciones ni duplicados.
- Lint y compilación de ambas aplicaciones.

Comandos adicionales (las pruebas que usan `dist` requieren compilar API antes):

```bash
python3 -m unittest discover -s scripts -p 'test_*.py'
node_modules/.bin/tsx scripts/test-optional-dni.ts
npm run test:web
docker compose -f docker-compose.dev.yml exec -T api node scripts/test-person-dto.cjs
docker compose -f docker-compose.dev.yml exec -T api node scripts/test-migration-db.mjs
docker compose -f docker-compose.dev.yml exec -T api node scripts/verify-legacy-dev.mjs
```

`verify-legacy-dev.mjs` comprueba el estado inmediatamente posterior a la importación;
no usarlo como prueba rutinaria después de editar contratos o emitir recibos.
`test-migration-db.mjs` prueba un borrado transaccional que siempre revierte; ejecutarlo
solo en dev sin otras operaciones simultáneas.

## Relevamiento inicial (antes de importar)

El ODS tiene 111 hojas y unos 136 MB de XML descomprimido. Leer en streaming;
la lectura completa fue terminada por falta de memoria. La primera fila no vacía
se interpreta como encabezados; los conteos incluyen registros sin filtrar por vigencia.

## Herramienta de inspección

Desde la raíz, con Python 3 (sin dependencias externas):

```bash
python3 scripts/inspect-legacy-ods.py private/migration/BB_DD.ods > private/migration/inventory.json
python3 -m unittest discover -s scripts -p 'test_inspect_legacy_ods.py'
```

El script no conecta a la base. Informa hojas, encabezados, cantidad de filas y
cantidad de valores presentes por columna; no imprime los registros. Los informes
quedan en la carpeta privada. La prueba usa una planilla sintética y cubre repetición
de filas/columnas, valores cero, fechas, texto enriquecido y separación entre hojas.
La función `inspect(path, on_row=None)` permite auditar filas mediante un callback;
este recibe hoja, encabezados, celdas y repetición de fila. Los valores son textos
visibles, con valor XML como respaldo: no son todavía valores normalizados para importar.

## Mapeo inicial

| Hoja | Filas | Destino / campos relevantes |
| --- | ---: | --- |
| Inquilinos | 131 | `people` + `tenants`: Id Inquilino, Apellido, Nombre, Documentos, Telefonos/Celular, email. Obtener domicilio de alquiler del inmueble del contrato; no asumir que Dirección es ese domicilio. |
| Propietarios | 73 | `people` + `owners`: ID Propietario, Apellido, Nombre, Dirección, Localidad, Celular, email, CBU. |
| Propiedades | 135 | `properties`: ID, Carpeta, Dirección, Localidad, TipoPropiedad; resolver catálogos y estado. |
| RelaciónPropietarios | 134 | `property_owners`: Propiedad, Propietario, Titular, Participación, AdminPor, AdministFija. |
| Contrato | 105 | `contracts`: ID Contrato, Propiedad, Inquilino, Inicio Contrato, Fin Contrato; carpeta desde el inmueble. |
| Conceptos_Fijos | 325 | Inicio/Fin, Concepto, Monto, Contrato, meses, Pago Inquilino/Cobro Propietario y banderas. Requiere definir persistencia de conceptos; no reducir todo a un importe fijo de alquiler. |
| Recibos | 1.618 | Histórico a conciliar: IdClave, Contrato, Propietario, Fecha Alta, Total, MontoPagado, saldos, Anulado e IdReciboProp. |
| ResumendeCuentaPropietario | 5.745 | Conciliación de liquidaciones: Contrato, Propietario, IdRecibo, Ingreso/Egreso, Abonado y fechas. |
| Movimientos | 1.876 | Conciliación de pagos: Recibonro, Contrato, Propiedad, Inquilino, Propietario, Ingreso/Egreso. |
| FormasPagoDetalle | 1.352 | Detalle de medios de pago; verificar relaciones antes de importar. |
| localidades / Ciudades | 605 / 602 | Catálogos candidatos; comprobar cuál usa cada referencia. |

Las hojas de agenda, publicidad, configuración y cuentas de acceso no forman parte
de la migración inicial inmobiliaria. No trasladar contraseñas ni usuarios antiguos.

## Hallazgos verificados

- IDs completos y sin duplicados en Contrato, Propiedades, Propietarios e Inquilinos.
- Los 105 contratos referencian inmuebles e inquilinos existentes.
- Las 134 relaciones propietario/inmueble apuntan a registros existentes.
- Todos los contratos tienen al menos un propietario por su inmueble; tres tienen varios.
- El campo Propietario de Propiedades está vacío: usar RelaciónPropietarios.
- Documentos está vacío en los 131 inquilinos y 73 propietarios. CUIT/CIUT también está vacío.
  Inicialmente `Person.dni` era obligatorio. Se resolvió haciéndolo opcional; no se
  inventaron documentos ni se unieron personas por coincidencia de nombre.
- Faltan seis direcciones de inmuebles y una carpeta. Hay nombres incompletos y
  pocos teléfonos/correos. Revisar si afectan los contratos elegidos para importar.
- Hay 7 contratos con Rescindio verdadero; no equivale simplemente a comparar fechas.
- Cuotas contiene 24 o 36. Montos del Alquiler y Per1..Per12 son candidatos para
  `settings.periods.rows` (`rent`, `untilInstallment`); validar límites y montos faltantes.
- Las participaciones observadas son 1 y 0; AdminPor contiene fracciones como
  0,050000001 y 0,07. Convertir a porcentajes con redondeo controlado y validar sumas,
  titulares y participaciones cero. AdministFija es cero en las 134 relaciones.
- Punitorios, Pago Final, FechadePrimerPago, DiasGracia, DiaPunitStart y PunitAPartir
  son candidatos para `settings.surcharges`; sus significados deben confirmarse.
- 872 recibos tienen contrato y todas esas referencias existen; 746 carecen de
  contrato directo. No asignarlos automáticamente a un contrato arbitrario del propietario.
- IdClave es único y completo en los 1.618 recibos. Id Recibo tiene 480 vacíos y
  duplicados; nroRecibo y NroReciboGral tienen un solo valor distinto cada uno.
  No usarlos directamente como `Receipt.number`.
- Las hojas de reimpresión y Liquidación están vacías. No se identificó un campo
  de PDF original en Recibos. El modelo actual exige PDF y snapshot: aún no está
  resuelta la migración fiel del histórico. No generar documentos nuevos y tratarlos
  como originales ni inferir períodos pagados solo por fecha de emisión.

## Pendientes de conciliación histórica

1. Alcance de contratos resuelto: se importaron todos. Completar el corte por ficha cuando se conozca.
2. Revisar campos incompletos y catálogos. El DNI ya es opcional; la trazabilidad y
   los IDs de origen/destino están documentados en el nuevo informe por ensayo.
3. Revisar las conversiones provisionales del mapeo v1 antes del siguiente ensayo.
   La preparación, comparación y simulación actuales no escriben en la base.
4. Conciliar saldos y períodos históricos. Si se elige comenzar a administrar desde
   un mes determinado, guardar `skipPastPeriods` y un `pendingFrom` fijo; eso no debe
   borrar ni dar por pagadas deudas anteriores sin una decisión explícita.
5. Probar importación idempotente en desarrollo, con backup previo y transacción.
   No ejecutar seed. El reemplazo de contratos existentes se realizó por instrucción expresa del usuario.
6. Validar totales, vínculos, copropietarios, contratos rescindidos, pagos parciales y
   deudas antes de planificar producción. Preservar snapshots y PDFs existentes.

Para el importador se necesitan pruebas de decimales con coma, porcentajes fraccionarios,
fechas, límites de cuotas, referencias inexistentes, DNI ausente, reejecución y rollback.
La prueba del lector no demuestra todavía que los datos sean importables.
