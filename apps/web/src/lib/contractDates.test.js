import assert from "node:assert/strict"
import test from "node:test"

import { calculateEndDate } from "./contractDates.js"

const cases = [
  ["contrato de 12 meses: incluye el último mes", "1/11/2026", "12", "31/10/2027"],
  ["contrato de una cuota: cubre un mes", "1/11/2026", "1", "30/11/2026"],
  ["contrato de 24 meses: cruza años", "1/1/2026", "24", "31/12/2027"],
  ["febrero de un año bisiesto", "1/2/2028", "1", "29/2/2028"],
  ["febrero de un año no bisiesto", "1/2/2027", "1", "28/2/2027"],
  ["inicio a mitad de mes", "15/11/2026", "12", "14/11/2027"],
  ["sin fecha de inicio", "", "12", ""],
  ["sin cuotas", "1/11/2026", "", ""],
  ["cantidad de cuotas inválida", "1/11/2026", "abc", ""],
]

for (const [description, start, installments, expected] of cases) {
  test(description, () => {
    assert.equal(calculateEndDate(start, installments), expected)
  })
}
