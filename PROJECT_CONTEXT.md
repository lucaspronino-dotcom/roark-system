# PROJECT CONTEXT - ROARK SYSTEM

## Descripcion General

Roark System es un sistema inmobiliario desktop/web inspirado en un sistema antiguo desarrollado en Access/WinForms utilizado diariamente en una inmobiliaria real.

El objetivo es recrear unicamente las funciones realmente utilizadas, eliminando modulos innecesarios y modernizando la interfaz.

El sistema esta pensado inicialmente para:

* uso local
* una sola PC
* funcionamiento offline
* velocidad y simplicidad

Tecnologias actuales:

* React
* Vite
* JavaScript
* posteriormente SQLite
* posteriormente Electron para generar `.exe`

---

# Objetivo Principal

El sistema gira completamente alrededor de:

* contratos de alquiler
* generacion de recibos
* liquidaciones
* historial PDF

No es un ERP completo.

El nucleo real del sistema es la liquidacion mensual de alquileres.

---

# Flujo Principal del Sistema

## Estructura principal

PROPIEDAD
└── CONTRATO
├── INQUILINO
├── PROPIETARIO
├── RECIBOS LOCATARIO
├── RECIBOS LOCADOR
├── CONCEPTOS
└── HISTORIAL

---

# FASES PRINCIPALES DEL SISTEMA

## FASE 1 - Dashboard principal

Pantalla principal con tabla de contratos.

Funciones:

* ver contratos
* ver estado
* abrir recibos
* abrir historial
* busqueda global

Columnas:

* carpeta
* direccion
* inquilino
* propietario
* estado

---

## FASE 2 - Ficha del contrato

Informacion principal:

* propiedad
* locatario
* locador
* fecha inicio
* fecha fin
* importe alquiler
* porcentaje administracion
* punitorios
* dias de gracia

Debe permitir generar periodos mensuales automaticamente.

---

## FASE 3 - Buscador global

Debe permitir buscar por:

* nombre inquilino
* nombre propietario
* direccion
* numero carpeta

---

## FASE 4 - Generador de recibo locatario

Es el modulo MAS importante del sistema.

Permite:

* generar liquidacion mensual del inquilino
* modificar importes
* agregar conceptos dinamicos
* agregar conceptos extraordinarios
* calcular total automaticamente
* generar PDF

Tipos de conceptos:

### Conceptos regulares

Ejemplos:

* alquiler
* honorarios
* internet
* seguro
* cochera
* expensas

### Conceptos extraordinarios

Ejemplos:

* arreglos
* multas
* bonificaciones
* descuentos unicos

IMPORTANTE:
Los conceptos pueden variar todos los meses.

---

# PDF LOCATARIO

El PDF generado:

* es tamano A4
* contiene:

  * recibo superior para entregar al inquilino
  * copia inferior para archivo interno

Debe incluir:

* datos del contrato
* conceptos
* total
* periodo
* fecha
* numero recibo

---

## FASE 5 - Historial recibos locatario

Debe almacenar:

* numero recibo
* fecha
* total
* PDF generado

IMPORTANTE:
Los recibos historicos NO deben recalcularse.
Se guardan como snapshot permanente.

---

## FASE 6 - Historial recibos locador

Misma logica que historial locatario pero para propietarios.

---

## FASE 7 - Liquidacion locador

Genera el recibo del propietario.

Se basa en:

* lo cobrado al inquilino
* menos comision administracion
* menos descuentos
* menos arreglos
* menos conceptos extraordinarios

Debe permitir:

* agregar conceptos extraordinarios
* modificar importes
* generar PDF

---

# Reglas importantes

## Regla 1

Los recibos historicos nunca deben modificarse automaticamente.

## Regla 2

Los conceptos son dinamicos.

## Regla 3

El sistema debe priorizar:

* velocidad
* simplicidad
* facilidad de uso

## Regla 4

No agregar modulos innecesarios.

---

# Diseno

Inspiracion:

* sistema administrativo clasico
* pero modernizado

Estilo deseado:

* sidebar izquierda
* tablas claras
* interfaz rapida
* colores sobrios
* sensacion desktop

---

# Objetivo MVP

El MVP inicial debe permitir:

* crear contratos
* visualizar contratos
* generar recibos locatario
* generar recibos locador
* guardar historial
* generar PDFs
* busqueda global

---

# Stack previsto

Frontend:

* React
* Vite

Desktop:

* Electron

Base de datos:

* SQLite

PDF:

* pdf-lib o react-pdf

---

# Estado actual del proyecto

Actualmente:

* React funcionando
* Vite funcionando
* navegacion basica funcionando
* menu lateral funcionando
* contratos mockeados
* recibos dinamicos en desarrollo
