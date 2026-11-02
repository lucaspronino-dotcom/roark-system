import assert from "node:assert/strict"
import test from "node:test"
import { resolvePeriodPreferences } from "./periodPreferences.js"
import { getPendingRentalDates, isRentalItemInRange } from "./rentalPeriods.js"

const november = new Date(2026, 10, 2)
const december = new Date(2026, 11, 2)
const contract = { startDate: "1/1/2026", end: "31/12/2027" }
const withPreferences = (periods) => ({ ...contract, settings: { periods } })

test("guardar eliminando anteriores: solo incluye noviembre", () => {
  const periods = resolvePeriodPreferences({}, true, november)
  assert.equal(periods.pendingFrom, "1/11/2026")
  assert.deepEqual(getPendingRentalDates(withPreferences(periods), [], november).map((date) => date.getMonth() + 1), [11])
})
test("en diciembre conserva noviembre impago; el corte no avanza al editar", () => {
  const original = resolvePeriodPreferences({}, true, november)
  const saved = resolvePeriodPreferences(original, undefined, december)
  assert.equal(saved.pendingFrom, "1/11/2026")
  assert.deepEqual(getPendingRentalDates(withPreferences(saved), [], december).map((date) => date.getMonth() + 1), [11, 12])
})
test("conservar anteriores incluye todo desde el inicio", () => {
  const periods = resolvePeriodPreferences({}, false, november)
  assert.equal(getPendingRentalDates(withPreferences(periods), [], november).length, 11)
})
test("contrato sin elección mantiene todos los meses pendientes", () => {
  assert.equal(getPendingRentalDates(contract, [], november).length, 11)
})
test("borradores de períodos eliminados no vuelven a aparecer", () => {
  const value = withPreferences(resolvePeriodPreferences({}, true, november))
  assert.equal(isRentalItemInRange({ dueDate: "1/10/2026" }, value, november), false)
  assert.equal(isRentalItemInRange({ dueDate: "1/11/2026" }, value, november), true)
})
test("contrato viejo con solo el indicador respeta eliminar anteriores", () => {
  assert.deepEqual(getPendingRentalDates(withPreferences({ skipPastPeriods: true }), [], november).map((date) => date.getMonth() + 1), [11])
})
