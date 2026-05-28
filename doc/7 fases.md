# LAS 7 FASES REALES DEL SISTEMA INMOBILIARIO

## FASE 1 — PANEL PRINCIPAL / CONTRATOS PERMANENTES

Es la pantalla principal del sistema.

Muestra una tabla con todos los contratos activos y vencidos.

Desde esta pantalla:

* se visualizan los contratos
* se accede a todas las demás funciones
* se realizan búsquedas rápidas
* se abren recibos e historiales

Columnas principales:

* número de carpeta
* dirección
* inquilino
* propietario
* estado del contrato

Funciones usadas diariamente:

* búsqueda rápida
* abrir carpeta del contrato
* abrir generación de recibo
* abrir historial

El usuario aclaró que esta es la pantalla que usa constantemente para navegar el sistema.

---

# FASE 2 — FICHA DEL CONTRATO

Al hacer click sobre un contrato se abre la carpeta/ficha del mismo.

Esta pantalla contiene toda la información contractual principal.

Lo único realmente utilizado de esta pantalla es la pestaña de:

## "Condiciones"

Información usada:

* fecha de inicio
* fecha de finalización
* importe del alquiler
* porcentaje de administración
* punitorios
* días de gracia
* períodos

Las demás pestañas del sistema viejo NO se utilizan y no son importantes para el nuevo sistema.

Esta fase funciona como la base de configuración del contrato.

---

# FASE 3 — BUSCADOR GLOBAL

Pantalla de búsqueda rápida.

Permite buscar contratos por:

* nombre del inquilino
* nombre del propietario
* dirección
* número de carpeta

Es una función usada constantemente para localizar contratos rápidamente.

No tiene lógica compleja.
Es solamente un buscador global del sistema.

---

# FASE 4 — GENERADOR DE RECIBO DEL INQUILINO (LOCATARIO)

Es la función MÁS importante del sistema.

Desde acá se genera la liquidación mensual del inquilino.

La pantalla permite:

* editar importes manualmente
* modificar montos mes a mes
* agregar conceptos
* agregar descuentos
* agregar bonificaciones
* agregar punitorios
* generar el recibo PDF

Los importes NO son fijos.
Cada mes pueden cambiar.

Ejemplos:

* alquiler
* honorarios
* luz
* agua
* gas
* internet
* expensas
* cochera
* seguro

Existe además una pestaña de:

## "Conceptos Extras"

Ahí se agregan:

* cargos únicos
* descuentos únicos
* arreglos
* bonificaciones
* conceptos extraordinarios

Después de confirmar:

* se genera un PDF
* tamaño A4
* dividido en dos partes:

  * recibo para el inquilino
  * copia interna de respaldo

Este módulo representa el corazón del sistema.

---

# FASE 5 — HISTORIAL DE RECIBOS DEL INQUILINO

Pantalla que almacena el historial de recibos generados para el locatario.

Muestra:

* período
* número de recibo
* fecha
* importe

Al hacer click sobre el número de recibo:

* se abre el PDF histórico generado anteriormente

IMPORTANTE:
Los recibos viejos quedan guardados como snapshot y NO deben recalcularse.

---

# FASE 6 — HISTORIAL DE RECIBOS DEL LOCADOR

Funciona igual que la fase 5.

La diferencia es que:

* almacena los recibos/liquidaciones del propietario
* no los del inquilino

Muestra el historial de pagos/liquidaciones realizados al locador.

---

# FASE 7 — GENERADOR DE RECIBO DEL LOCADOR (PROPIETARIO)

Esta pantalla se utiliza DESPUÉS de haber generado el recibo del inquilino.

Genera automáticamente la liquidación del propietario.

La lógica principal es:

TOTAL COBRADO AL INQUILINO

* comisión administración
* descuentos
* arreglos
* conceptos extraordinarios
  = TOTAL A PAGAR AL PROPIETARIO

Existe un campo de:

## "Concepto Extraordinario"

Ahí se agregan:

* arreglos
* reparaciones
* descuentos
* reconocimientos al inquilino
* gastos excepcionales

Luego:

* se confirma
* se genera PDF
* se guarda historial

El PDF es similar al del locatario pero orientado al propietario y mostrando descuentos de administración.
