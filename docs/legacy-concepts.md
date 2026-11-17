# Conceptos importados y liquidación

Reglas confirmadas el 17/11/2026 para `Conceptos_Fijos` del archivo ODS original:

- `Pago Inquilino` y `Cobro Propietario`: 1 sin efecto, 2 sumar, 3 descontar.
- `Monto` se convierte desde formato argentino; se conserva el valor original.
- `Inicio` y `Fin` delimitan la vigencia inclusiva. Se aplican los meses marcados
  (cada columna contiene su número de mes; cero significa desmarcado).
- Los meses se repiten cada año dentro de la vigencia. No se infieren conceptos
  únicos ni cantidades de cuotas a partir del nombre.
- Un concepto que comienza a mitad de mes pertenece a ese mes; su vencimiento
  no es anterior a su inicio ni posterior a su fin. Se respetan también las fechas
  del contrato, el corte de administración y los períodos pendientes.

Ejemplo: honorarios con inicio 6/2/2026, fin 31/12/2027 y enero/febrero/marzo
marcados corresponden a febrero y marzo de 2026 y enero/febrero/marzo de 2027.
Código 2 para inquilino y 1 para propietario significa cobrar al inquilino sin
acreditar ese concepto al propietario. La bonificación con códigos 3 y 3 resta
el importe a ambos.

## Incorporación sin reimportar

`apps/web/src/lib/regularConcepts.js` transforma el snapshot antiguo al abrir la
liquidación y lo combina con conceptos nativos existentes. También funciona si
una apertura anterior había guardado una lista vacía. Cada concepto importado
mantiene su ID original. El guardado de `regularConcepts` agrega el marcador
`legacyConceptsVersion: 1`: las posteriores ediciones o eliminaciones prevalecen
sobre el snapshot y no se vuelven a insertar conceptos eliminados.

La ficha muestra los valores originales con meses y efectos. La pestaña Conceptos
de la liquidación permite editar los conceptos operativos, incluyendo vigencia,
meses y efectos; se guardan en los ajustes del contrato. Los conceptos únicos se
agregan a la cuenta una sola vez, con efectos independientes sobre ambas partes.
No se crean conceptos únicos a partir de filas de `Conceptos_Fijos`.

Se mantiene el bloqueo `reconciliationRequired` hasta revisar saldos y conceptos.
No se recalculan ni modifican recibos existentes. Los recibos nuevos guardan
`ownerAmount` y `conceptId` en cada ítem del snapshot. La cuenta del locador usa
ese importe, omitiendo los conceptos sin efecto; para recibos anteriores sin ese
campo conserva el comportamiento previo basado en el importe del ítem.

Las filas inválidas o con porcentaje no interpretado se muestran como pendientes
con un motivo y no generan cargos. El plan del ensayo 002 contiene 424 conceptos
asociados a contratos; 18 tienen fin anterior al inicio y requieren corregir su
vigencia antes de aplicarse. Ninguno tiene porcentaje distinto de cero. La única fila
porcentual del archivo fuente no pertenece a los contratos de ese plan.

## Verificación

`npm run test:web` incluye recurrencia entre años, límites de vigencia, meses
seleccionados, efectos independientes, descuentos, compatibilidad con recibos
anteriores, importación idempotente y eliminación persistente. Ejecutar también
`npm run lint` y `npm run build` al modificar la integración de UI/API.

Prueba del snapshot con Prisma simulado (sin acceso a la base):
`npm run build:api && node --test scripts/test-receipt-concepts.cjs`.
