# Mapeo exacto de BB_DD.ods — conversor v1

Este documento describe **lo que hizo el código**, no un mapeo definitivo aprobado
para el negocio. Las reglas inferidas y los campos no importados se indican para
poder corregirlos antes del próximo ensayo. No se modificó la base al documentarlo.

## Código y evidencia

- [Conversión ODS → plan](../scripts/prepare-legacy-migration.py): función `prepare`.
- [Lector ODS](../scripts/inspect-legacy-ods.py): lectura por partes y coordenadas.
- [Validador del plan](../scripts/legacy-plan.mjs): referencias y restricciones.
- [Aplicación a desarrollo](../scripts/import-legacy-dev.mjs): transacción y borrado.
- [Comparación de versiones](../scripts/compare-legacy-plans.py): diferencias sin PostgreSQL.
- [Procedimiento para otro archivo](legacy-migration-retry.md).

La conversión original está en `private/migration/plan.json`; sus registros fuente,
en `private/migration/source.json`. El ODS original se conserva sin cambios.
La reproducción documentada está en `private/migration/audit-v1/`.
`traceability.json` registra hash SHA-256 del ODS y del conversor, fecha `asOf`,
nombre del archivo, columnas con letra/número/encabezado y cada fila con su ID
antiguo, clasificación y destinos del plan. No contiene nombres, domicilios ni importes.
`source.json` sí contiene valores originales y debe seguir siendo privado.

## Qué significa fila y columna

Las letras de las tablas siguientes corresponden **al BB_DD.ods original**. El código
busca encabezados por su texto exacto, no por esas letras: mover una columna con su
encabezado conserva el mapeo; renombrarla requiere revisar el conversor. La primera
fila no vacía de cada hoja se interpreta como encabezados; no se importa como dato.
Filas vacías se ignoran para datos pero cuentan en la numeración visible de Calc.
Las repeticiones de filas/columnas del formato ODS se cuentan en las coordenadas.
No se recalculan fórmulas: se lee el texto visible/cacheado y, si falta, el atributo
XML de fecha o valor. No hay evaluación de fórmulas ni inferencia de encabezados.

Cada registro de `traceability.json` contiene `headerRow`, `row` (ambos empiezan en 1),
`sourceId`, `usage` y `destinationPlanRefs`. Para obtener una celda exacta, unir `row`
con la letra de `columns` del encabezado correspondiente. Los UUID son los del
**plan**: el importador puede reutilizar el UUID de un inmueble ya existente que
coincida en carpeta y dirección. Eso ocurrió en un inmueble de la ejecución original.

## Selección de filas

No se aplicó filtro de vigencia: entraron todas las filas de `Contrato`. Después se
seleccionaron solo sus inquilinos, inmuebles y propietarios relacionados; no se
importaron todos los contactos de las otras hojas.

- `Contrato`: cada ID debe ser único y no vacío.
- `Inquilinos`: `Id Inquilino` aparece en `Contrato.Inquilino`.
- `Propiedades`: `ID` aparece en `Contrato.Propiedad`.
- `RelaciónPropietarios`: filas del inmueble referenciado; debe existir un único titular
  y las participaciones deben sumar 1 antes de convertir a porcentaje.
- `Propietarios`: IDs presentes en las relaciones anteriores.
- `Conceptos_Fijos`: se conserva la fila cuyo `Contrato` coincide, solo como referencia.
- `localidades`: lookup de `Localidad`; no crea una tabla de localidades nueva.
- `Recibos`: `Contrato` solo se usa para contar recibos asociados. No se importó ningún
  recibo operativo, pago, saldo, período pagado ni PDF.

Las categorías del informe son `converted` (convertido), `converted-or-consolidated`
(inmueble que puede compartir destino), `consolidated-reference` (relación duplicada
que comparte destino), `snapshot-only` (concepto de referencia), `count-only` (solo
conteo de recibos), `lookup` (catálogo utilizado) y `archive-only` (solo extracción).

## Filas exactas del archivo original

Encabezados en fila 1 de las 12 hojas extraídas. Las filas siguientes son las
utilizadas para convertir, relacionar, conservar conceptos o contar recibos; los
registros restantes se identifican como `archive-only` en el informe privado.

| Hoja | Uso | Cantidad | Números de fila en Calc |
| --- | --- | ---: | --- |
| Conceptos_Fijos | snapshot-only | 277 | 5–28, 30–38, 43–45, 50–64, 66, 69–70, 74–101, 105–133, 141–142, 146–173, 176–188, 194–211, 213, 220–235, 237–241, 243–257, 259–326 |
| Contrato | converted | 105 | 2–106 |
| Inquilinos | converted | 101 | 4–6, 8–20, 22, 24–28, 30–33, 35–44, 46–47, 51–52, 55–59, 61, 63, 66–69, 71–75, 77–83, 85, 87, 89–90, 92–94, 96, 98–101, 104, 106–113, 115, 117–132 |
| localidades | lookup | 2 | 71, 136 |
| Propiedades | converted-or-consolidated | 102 | 2, 4–15, 17, 19–21, 23, 25–29, 31–43, 46, 49–51, 54–55, 57–62, 64, 66–67, 69, 72–75, 77–78, 80–82, 84–88, 90–95, 97, 99–107, 109–110, 112, 114, 117–118, 120–125, 127, 129–131, 133–136 |
| Propietarios | converted | 61 | 2, 4–19, 22–26, 28–39, 41, 43–45, 47–49, 51–52, 54–57, 59–67, 69–71, 73–74 |
| Recibos | count-only | 872 | 10–11, 23, 33–35, 38–40, 61, 64, 66, 70–72, 75–77, 84–85, 89–91, 96–99, 102–104, 107–110, 115–116, 118, 131–132, 143, 145, 147, 152–155, 162–163, 166–167, 171–172, 176–177, 183–185, 189–190, 193–194, 200–202, 206–207, 213–214, 216–217, 239–240, 243–244, 247–249, 252, 254–256, 258–263, 265, 267–268, 278, 280–284, 291–292, 294–295, 299, 302, 305, 312, 317–319, 322, 329, 335–336, 338–341, 346, 350, 352–353, 356–358, 360, 364–365, 369–370, 372, 377, 380–384, 386, 395, 397, 401, 404–405, 407, 409–410, 419–422, 436–437, 448–454, 456–457, 459–460, 462–464, 468–469, 472, 474, 476, 480–481, 483, 485, 487–488, 490–494, 496, 498, 503, 510–511, 514, 517, 519–520, 525, 527, 535–536, 539–540, 551–553, 555–556, 558–565, 573, 575–578, 580–582, 586–588, 590–591, 594–598, 600–601, 603–605, 607–608, 610–619, 622–624, 627–630, 632–633, 635–637, 639, 641–642, 644, 647–649, 652–653, 657–658, 660–661, 663–665, 670–671, 675–677, 679, 683, 685, 687, 689–690, 693, 705, 708, 711–714, 718, 720–721, 723–724, 726, 729, 733–735, 737, 739–740, 745–747, 751, 753–755, 757–758, 760–763, 765–766, 771, 773–774, 778, 780–786, 788–791, 793, 795, 797–798, 800–802, 804–806, 808–811, 813–814, 817–818, 820–822, 824, 826–827, 834, 836–839, 842–843, 846–847, 850–851, 853, 855–856, 860, 863, 867, 869, 872–874, 878–885, 888, 891, 893–894, 897, 900–903, 906, 908–909, 912, 915, 926–927, 929, 932–935, 937–939, 942–943, 945–948, 950–951, 953–954, 956–957, 959–960, 962–964, 966–968, 970–972, 975–984, 986–992, 994–998, 1000–1006, 1008–1009, 1011, 1013–1014, 1016–1019, 1021–1023, 1025–1027, 1029–1032, 1035–1038, 1040–1041, 1043–1044, 1046–1047, 1050, 1052–1054, 1057–1060, 1067, 1069–1074, 1081, 1083, 1085, 1087, 1089–1092, 1094–1096, 1102–1103, 1106, 1108, 1110–1112, 1114–1115, 1118, 1120, 1122, 1126–1127, 1129, 1131, 1133, 1136, 1138, 1141–1142, 1144, 1147–1148, 1151–1155, 1157–1173, 1175–1177, 1179–1185, 1188–1211, 1213, 1216–1220, 1222–1227, 1229–1231, 1233, 1235, 1237, 1239–1244, 1246–1247, 1251–1253, 1256, 1258, 1260–1266, 1268–1270, 1272, 1274–1275, 1277, 1279–1280, 1282, 1285–1287, 1289–1290, 1292, 1294, 1296–1298, 1300–1301, 1303–1304, 1306–1307, 1309–1311, 1314–1315, 1317, 1320–1321, 1324–1327, 1329, 1332, 1335, 1338, 1340, 1342, 1344, 1346, 1350, 1353–1354, 1357–1358, 1360, 1362–1365, 1367–1369, 1371, 1373, 1375–1376, 1378, 1380–1381, 1383, 1385–1395, 1397–1400, 1403–1409, 1411, 1413–1414, 1416–1417, 1419–1420, 1422–1424, 1426–1438, 1440–1444, 1446–1447, 1449–1464, 1466–1471, 1473–1478, 1480–1484, 1486–1487, 1489–1492, 1494, 1496, 1498–1502, 1504, 1506, 1509–1512, 1514–1515, 1517–1518, 1520, 1522, 1524–1526, 1528–1529, 1531–1533, 1535–1536, 1538–1540, 1542, 1544–1545, 1547, 1550–1551, 1553–1556, 1558, 1560–1561, 1564–1567, 1569, 1571–1572, 1574–1575, 1577, 1579–1585, 1587–1590, 1592, 1594–1597, 1601, 1603, 1605, 1607, 1609, 1611, 1613, 1615, 1617, 1619 |
| RelaciónPropietarios | consolidated-reference | 2 | 102, 125 |
| RelaciónPropietarios | converted | 105 | 2, 4–16, 18, 20–22, 24, 26–33, 35–49, 52–54, 57–64, 66, 68–69, 71, 74–77, 79–80, 82–84, 86–96, 98, 100–101, 103–108, 110–111, 113, 115, 118–119, 121–124, 126–127, 129–135 |

Las 48 filas de Conceptos_Fijos que solo quedaron en el respaldo son: 2–4, 29, 39–42, 46–49, 65, 67–68, 71–73, 102–104, 134–140, 143–145, 174–175, 189–193, 212, 214–219, 236, 242, 258.

## Personas e inmuebles

### Hoja `Inquilinos`

| Columna original | Encabezado exacto | Destino / uso en v1 |
| --- | --- | --- |
| C | `Id Inquilino` | Identidad de `tenants.id` y `people.id`, separada del rol propietario. |
| E | `Nombre` | `people.firstName`; literal; vacío se conserva. |
| D | `Apellido` | `people.lastName`; literal. |
| I | `Documentos` | `people.dni`; recorta espacios; vacío → NULL. No toma CUIT ni DNI del cónyuge. |
| M | `Celular` | Primera opción para `people.phone`. |
| G | `Telefonos` | Se usa si Celular está vacío; si ambos faltan queda vacío. |
| S | `email` | `people.email`; vacío → NULL. |
| F | `Dirección` | NO se usa como domicilio de alquiler: se toma Propiedades.Dirección del contrato con Inicio Contrato más reciente. |

### Hoja `Propietarios`

| Columna original | Encabezado exacto | Destino / uso en v1 |
| --- | --- | --- |
| A | `ID Propietario` | Identidad de `owners.id` y su `people.id`. |
| D | `Nombre` | `people.firstName`. |
| C | `Apellido` | `people.lastName`. |
| H | `Documentos` | `people.dni`; espacios externos eliminados; vacío → NULL. |
| L | `Celular` | Primera opción de `people.phone`. |
| F | `Telefonos` | Respaldo de Celular. |
| R | `email` | `people.email`; vacío → NULL. |
| E | `Dirección` | `owners.address`; literal. |
| N | `Localidad` | `owners.city`: resolver por localidades.Id, conservar texto libre, vacío/0 → vacío; ID numérico desconocido aborta. |
| AA | `CBU` | `owners.transferAliasOrCbu`; vacío → NULL. |

### Hoja `Propiedades`

| Columna original | Encabezado exacto | Destino / uso en v1 |
| --- | --- | --- |
| A | `ID` | Identidad antigua y relación con contratos; debe ser convertible a entero para elegir ID canónico. |
| B | `Carpeta` | `properties.folder` con espacios externos eliminados; `contracts.folder` toma el valor original. |
| C | `Dirección` | `properties.address` con espacios externos eliminados; también domicilio del inquilino. |
| D | `Localidad` | `properties.city` mediante localidades; misma regla que propietarios. |
| T | `TipoPropiedad` | NO se traduce: `properties.type` queda vacío. |
| N | `TipoEstado` | NO se traduce: `properties.status` queda vacío. |
| O | `TipoEstado1` | NO se traduce. |
| P | `TipoEstado2` | NO se traduce. |
| L | `Propietario` | NO se usa para vincular propietarios; se usa RelaciónPropietarios. |
| I | `Fecha de Mandato` | NO se usó como inicio de administración; se conserva en el snapshot del inmueble. |

### Hoja `RelaciónPropietarios`

| Columna original | Encabezado exacto | Destino / uso en v1 |
| --- | --- | --- |
| A | `id` | Solo trazabilidad; el UUID de la relación se genera con ID canónico de inmueble + ID propietario. |
| D | `Propiedad` | FK a `properties` (con posible consolidación). |
| B | `Propietario` | FK a `owners`. |
| G | `Titular` | `property_owners.isPrimary`: verdadero solo si el texto es `VERDADERO`. El titular define `contracts.ownerId`. |
| C | `Participación` | `property_owners.participation`: fracción × 100, redondeada a 4 decimales. |
| F | `AdminPor` | `property_owners.administration`: misma conversión; 0,050000001 → 5. |
| E | `AdministFija` | Debe ser cero; otro valor aborta. No se importa como porcentaje ni importe. |

`property_owners.commission` se fijó en 0: **no se tomó de una columna de comisión**.
No se unen personas por nombre ni DNI: un propietario y un inquilino se crean como
personas separadas. Si una versión nueva trae DNI repetidos, la validación puede
rechazar el plan; no representa una deduplicación automática.

### Consolidación de inmuebles

Se agrupa por `(Carpeta.strip(), Dirección.strip())`. Solo se permite consolidar si
las filas de propiedad tienen la misma Localidad y la misma lista de propietarios,
Participación, Titular, AdminPor y AdministFija (comparados como textos de origen).
Se toma el menor ID numérico como canónico. No se compara TipoPropiedad ni se resuelven
contratos superpuestos. Esta regla debe revisarse: una coincidencia de dirección
no demuestra por sí sola que sean la misma unidad física.

En el primer archivo se consolidaron 82/126 y 102/103. Los 105 contratos se mantuvieron
separados; cada uno conserva `originalProperty` con el registro de su ID antiguo.

## Contratos

### Hoja `Contrato`

| Columna original | Encabezado exacto | Destino / uso en v1 |
| --- | --- | --- |
| A | `ID Contrato` | `contracts.id` determinístico y `settings.legacy.contractId`. |
| C | `Propiedad` | `contracts.propertyId` a través de Propiedades.ID. |
| D | `Inquilino` | `contracts.tenantId` a través de Inquilinos.Id Inquilino. |
| E | `Inicio Contrato` | `contracts.startDate`: día/mes/año → fecha ISO a las 00:00 UTC. |
| F | `Fin Contrato` | `contracts.endDate`: fecha original, no recalculada a partir de cuotas. |
| AT | `Cuotas` | `settings.periods.installments` como texto; para límites se convierte a entero. |
| AJ | `Per1` | También se copia a `settings.periods.adjustmentInterval`; no demuestra por sí solo una frecuencia uniforme. |
| AV | `Rescindio` | Si es `VERDADERO`, status EXPIRED; en otro caso EXPIRED si Fin Contrato < --as-of, o ACTIVE. |
| AW | `FechaRes` | `settings.termination.date` solo si Rescindio = VERDADERO; no sustituye endDate. |
| R | `Punitorios` | `settings.surcharges.dailyPercentagePoints`: fracción × 100 y coma decimal; 0,01 → texto 1,0. |
| Q | `Pago Final` | `settings.surcharges.finalPayment`, literal; interpretación pendiente de validar. |
| DC | `FechadePrimerPago` | `settings.surcharges.firstPaymentDate`, literal; no es inicio de administración. |
| DD | `DiasGracia` | `settings.surcharges.graceDays`, literal. |
| DE | `DiaPunitStart` | NO se asignó a un campo operativo. |
| DF | `PunitAPartir` | NO se asignó a un campo operativo. |
| B | `Fecha de Alta` | NO se usó como inicio de administración ni como createdAt. |
| N | `Comisión` | NO se importó como comisión. |
| O | `ComPorc` | NO se importó como comisión. |

### Las 12 ternas de períodos

Cada terna produce, si el límite es válido, una fila de `settings.periods.rows`.
Las columnas no son contiguas. `Monto del Alquiler` sin sufijo corresponde al período 1.

| Período | Hasta cuota (`untilInstallment`) | Alquiler (`rent`) | Extra (`extras`) |
| --- | --- | --- | --- |
| 1 | AJ: `Per1` | K: `Monto del Alquiler` | AZ: `Documento1` |
| 2 | AK: `Per2` | L: `Monto del Alquiler2` | BA: `Documento2` |
| 3 | AL: `Per3` | M: `Monto del Alquiler3` | BB: `Documento3` |
| 4 | AN: `Per4` | AM: `Monto del Alquiler4` | BC: `Documento4` |
| 5 | AP: `Per5` | AO: `Monto del Alquiler5` | BD: `Documento5` |
| 6 | AR: `Per6` | AQ: `Monto del Alquiler6` | BE: `Documento6` |
| 7 | BH: `Per7` | BG: `Monto del Alquiler7` | BT: `Documento7` |
| 8 | BJ: `Per8` | BI: `Monto del Alquiler8` | BU: `Documento8` |
| 9 | BL: `Per9` | BK: `Monto del Alquiler9` | BV: `Documento9` |
| 10 | BN: `Per10` | BM: `Monto del Alquiler10` | BW: `Documento10` |
| 11 | BP: `Per11` | BO: `Monto del Alquiler11` | BX: `Documento11` |
| 12 | BR: `Per12` | BQ: `Monto del Alquiler12` | BS: `Documento12` |

Reglas que efectivamente aplicó v1:

1. Períodos se recorren en orden 1..12. Límite vacío o cero se omite; si tenía alquiler,
   registra `rent-without-period`.
2. Límite menor/igual al último aceptado o mayor que Cuotas se omite y registra
   `invalid-period-limit`. Los valores siguen en `originalContract`.
3. Alquiler vacío se conserva como texto vacío y registra `missing-rent`; no se
   arrastra el alquiler anterior. Importes conocidos quedan con dos decimales y coma.
4. `DocumentoN` se copió a `extras`. **Es una interpretación provisional del campo**,
   no una confirmación de su significado en el sistema viejo.
5. Si el último período válido no llega a Cuotas, se agrega una fila final con alquiler
   y extra vacíos (`missing-final-rent`).

Estas reglas explican parte de las diferencias observadas; deben revisarse con los
datos actualizados. El informe `plan.json.issues` indica ID de contrato y período.
Para llegar a la celda, buscar ese ID en `traceability.json` y usar la columna de esta tabla.

### Valores sin columna fuente

| Destino | Valor aplicado |
| --- | --- |
| `settings.periods.adjustmentType` | Vacío; no se asumió ICL/IPC. |
| `settings.periods.pendingFrom` | NULL: inicio de administración desconocido. |
| `settings.periods.skipPastPeriods` | false. |
| `settings.surcharges.chargeFromDay` | Vacío. |
| `settings.surcharges.fixedDailyPoints` | Vacío. |
| `settings.legacy.reconciliationRequired` | true; exige revisión antes de liquidar. |
| `settings.legacy.source` | Literal BB_DD.ods en v1; para otra versión identificar por SHA-256 y `traceability.inputFile`. |
| `createdAt` / `updatedAt` | Fechas generadas por la base al importar; no fechas originales. |

Los UUID usan UUIDv5 con namespace URL y texto `roark:legacy:v1:<tipo>:<ID>`.
Tipos: tenant, tenant-person, owner, owner-person, property, contract; para
property-owner se concatena `<ID inmueble canónico>:<ID propietario>`.
No cambiar esta fórmula al comparar dos versiones con los mismos IDs.

## Datos conservados sin convertir

### Hoja `Conceptos_Fijos`

**Actualización operativa (17/11/2026):** la tabla siguiente describe el archivo
histórico del conversor v1. La aplicación ahora transforma ese snapshot al abrir
la liquidación en `settings.regularConcepts`, sin reimportar ni reemplazar datos.
Ver [conceptos importados](legacy-concepts.md) para las reglas confirmadas.


| Columna original | Encabezado exacto | Destino / uso en v1 |
| --- | --- | --- |
| A | `ID Concepto` | Solo snapshot en `settings.legacy.fixedConcepts`; no genera un concepto de cobro. |
| B | `Inicio` | Solo snapshot en `settings.legacy.fixedConcepts`; no genera un concepto de cobro. |
| C | `Fin` | Solo snapshot en `settings.legacy.fixedConcepts`; no genera un concepto de cobro. |
| D | `Concepto` | Solo snapshot en `settings.legacy.fixedConcepts`; no genera un concepto de cobro. |
| E | `Monto` | Solo snapshot en `settings.legacy.fixedConcepts`; no genera un concepto de cobro. |
| F | `Pago Inquilino` | Solo snapshot en `settings.legacy.fixedConcepts`; no genera un concepto de cobro. |
| G | `Cobro Propietario` | Solo snapshot en `settings.legacy.fixedConcepts`; no genera un concepto de cobro. |
| T | `Contrato` | Une la fila al contrato para guardar el snapshot. |

También se conservan todas las demás columnas de Conceptos_Fijos, incluidos meses,
porcentajes y banderas, sin interpretarlas. Contrato y Propiedades se conservan completos
en `settings.legacy.originalContract` / `originalProperty`.

### Hoja `Recibos`

| Columna original | Encabezado exacto | Destino / uso en v1 |
| --- | --- | --- |
| D | `Contrato` | Solo filtra para `settings.legacy.receiptCount`; no enlaza un recibo operativo. |
| BD | `IdClave` | Identificador para trazabilidad, no se transforma en número de recibo. |

`Total`, `MontoPagado`, saldos, fechas, períodos, punitorios y restantes columnas de Recibos
**no se importaron como pagos**. Las hojas ResumendeCuentaPropietario, Movimientos,
FormasPagoDetalle y Ciudades se extrajeron a `source.json`, pero no alimentaron tablas
operativas. Se usó `localidades` (Id → Nombre), no Ciudades.

Se extraen únicamente las 12 hojas enumeradas en `TABLES` del conversor. Las otras
99 hojas no se incorporan al plan. En la extracción se excluye cualquier encabezado
que contenga `password`, `username` o `userweb` (sin distinguir mayúsculas). No se
trasladaron cuentas de acceso. El ODS original permanece intacto.

## Formatos y límites conocidos

- Fechas operativas: `%d/%m/%Y`, con validación de calendario; sin conversión automática
  de serial Excel ni fechas ISO. FechadePrimerPago y FechaRes quedan como textos originales.
- Números: punto de miles y coma decimal; se quitan `$` y espacios. `120.000,50` es válido;
  `1.5` no se interpreta como decimal inglés. No se convierten porcentajes con símbolo `%`.
- Estado rescindido/titular: comparación literal con `VERDADERO`.
- Encabezados: sensibles a acentos, mayúsculas y espacios; no se estandarizan ni se corrigen.
- Código documentado como v1 experimental. Validar las hipótesis sobre períodos,
  DocumentoN, punitorios, comisión y consolidación antes de aplicar otra versión.

## Actualización: administración fija

Por indicación del usuario, `RelaciónPropietarios.AdministFija` se importa como
importe en `propertyOwners.commission`, visible en Comisión de la ficha de propiedad.
Por ejemplo, `10.000,50` se guarda como `10000.50`; vacío se convierte en cero.
`AdminPor` conserva su conversión independiente a porcentaje de administración.
Esta regla reemplaza el rechazo previo de administración fija distinta de cero.

## Actualización: identidades de inmuebles repetidos

Se conserva cada ID de Propiedades como inmueble independiente, aun con igual
Carpeta y Dirección. Los contratos conservan su inmueble y propietario originales.
Esto reemplaza la consolidación por carpeta/dirección y la reutilización de inmuebles
por esa combinación descritas arriba para v1. Los IDs de propietario no se unifican
por coincidencia de nombres. La selección sigue limitada a inmuebles de contratos importables.
