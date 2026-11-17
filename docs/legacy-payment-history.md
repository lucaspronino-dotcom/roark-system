# Historial de pagos antiguo

El plan del 5 de noviembre de 2026 usa `BB_DD_actualizada.ods` y los contratos de
`private/migration/ensayo-002/plan.json`. Contiene 1.789 recibos de inquilinos;
83 conservan importes faltantes o que no concilian, señalados para revisión.
Excluye 2.380 registros sin contrato importado asociado y 1.466 sin número de
recibo de inquilino. Las exclusiones quedan enumeradas en el plan privado.

El importador agrega recibos únicamente en `db_roark_dev`, sin reemplazar contratos
ni recibos existentes. Compara hash e identidad del contrato, rechaza conflictos de
número o identidad y verifica cada campo tras insertar. Una reejecución idéntica
no modifica datos. No admite actualizar históricos existentes.

## Resultado en desarrollo

Importación aplicada el 5 de noviembre de 2026: 1.789 recibos creados y verificados
campo por campo. La prueba con rollback revirtió todas las inserciones; la segunda
ejecución creó cero recibos. No se modificó producción. Por indicación del usuario,
no se generó un respaldo nuevo de desarrollo.

## Comportamiento

- El historial solicita `includeHistorical=true`; las liquidaciones consultan solo
  recibos nativos. No se infieren meses pagados ni se trasladan saldos antiguos.
- Los importados llevan `origin=LEGACY`, son de solo lectura y conservan número,
  fecha, importes, anulación y snapshot con valores originales, fila e ID.
- Los importes ausentes son NULL, no cero. Las diferencias no se corrigen.
- No hay PDF original en esta fuente. Al abrir un histórico se muestra directamente
  el visor PDF, con descarga y el mismo formato Roark A4 de los recibos nuevos:
  encabezado, importes y copia para archivo. Se rotula HISTÓRICO y, si corresponde,
  ANULADO. No se recalcula el contrato ni se deducen conceptos a partir de totales.
- Los importes se muestran tal como estaban guardados, con sus decimales; los
  ausentes dicen «No informado». El propietario no se toma del contrato actual
  cuando falta en el snapshot. Las páginas siguientes conservan el detalle de
  los campos originales, incluyendo notas extensas e incidencias de revisión.
- La plantilla compartida está en `apps/web/src/lib/settlementPdf.js`; la adaptación
  histórica en `legacyReceiptPdf.js`. Generar la vista no modifica el recibo en la base.
- Los PDFs originales existentes se abren tal como están, sin regenerarlos.
- Se mantiene el bloqueo de liquidación hasta revisar saldos y conceptos de la ficha.
- La numeración nueva continúa después del mayor número existente.

## Preparación y aplicación

Usar una carpeta privada nueva; no sobrescribir planes. Requiere la migración
`20261104020000_receipt_history` y regenerar Prisma.

```bash
python3 scripts/prepare-legacy-history.py private/migration/BB_DD_actualizada.ods --contracts-plan private/migration/ensayo-002/plan.json --output-dir private/migration/history-20261105
docker compose -f docker-compose.dev.yml exec -T api node scripts/import-legacy-history-dev.mjs private/migration/history-20261105/history-plan.json
docker compose -f docker-compose.dev.yml exec -T api node scripts/import-legacy-history-dev.mjs private/migration/history-20261105/history-plan.json --apply --rollback
docker compose -f docker-compose.dev.yml exec -T api node scripts/import-legacy-history-dev.mjs private/migration/history-20261105/history-plan.json --apply
docker compose -f docker-compose.dev.yml exec -T api node scripts/import-legacy-history-dev.mjs private/migration/history-20261105/history-plan.json --verify
```

Sin opciones simula; `--apply --rollback` prueba la escritura completa y la revierte;
`--verify` solo compara. Datos e informes permanecen en `private/`.

## Pruebas

```bash
python3 -m unittest discover -s scripts -p 'test_*.py'
npm run test:web
npm run lint
npm run build
docker compose -f docker-compose.dev.yml exec -T api node scripts/test-history-dev.mjs
```

Después de regenerar Prisma, reiniciar la API dev para que cargue el esquema nuevo:
`docker compose -f docker-compose.dev.yml restart api`. El hot reload puede conservar
el cliente anterior en memoria y rechazar PDFs NULL con error P2032.

La integración requiere API dev disponible, compilada e historial importado.
Crea una sesión dev temporal y la elimina al terminar para comprobar también HTTP;
no modifica datos de negocio y
comprueba filtros, aislamiento de liquidaciones y numeración. El bloqueo de borrado
se prueba con un cliente simulado. Las pruebas unitarias cubren importes, fechas,
duplicados, anulaciones, exclusiones, snapshots, exportación PDF y aislamiento de deudas.

## Producción: pendiente de habilitar

Los comandos de esta guía son exclusivamente de desarrollo. El importador rechaza
`db_roark_prod`; cambiar el Compose no lo habilita. La preparación offline del plan
sí es reutilizable. Consultar [pendientes del pase productivo](legacy-migration-retry.md#reutilizar-la-migración-para-producción)
para contratos, historial, esquema, respaldo y verificaciones. No hay todavía un
comando de importación productiva implementado y validado.
