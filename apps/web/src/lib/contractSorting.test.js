import assert from "node:assert/strict"
import test from "node:test"
import { nextContractSort, sortContracts } from "./contractSorting.js"

const ids = rows => rows.map(row => row.id)

test("carpetas con orden natural, repetidos estables y sin modificar el origen", () => {
  const rows = Object.freeze([
    { id: "a", folder: "10" }, { id: "b", folder: "#2" },
    { id: "c", folder: "2" }, { id: "d", folder: "1" },
  ].map(Object.freeze))
  assert.deepEqual(ids(sortContracts(rows, { field: "folder", direction: "asc" })), ["d", "b", "c", "a"])
  assert.deepEqual(ids(sortContracts(rows, { field: "folder", direction: "desc" })), ["a", "b", "c", "d"])
  assert.deepEqual(ids(rows), ["a", "b", "c", "d"])
})

test("fechas por año/mes/día y vacíos o fechas inválidas siempre al final", () => {
  const rows = [
    { id: "a", end: "31/12/2025" }, { id: "b", end: "1/2/2026" },
    { id: "c", end: "2/1/2026" }, { id: "d", end: "31/2/2026" }, { id: "e" },
  ]
  assert.deepEqual(ids(sortContracts(rows, { field: "endDate", direction: "asc" })), ["a", "c", "b", "d", "e"])
  assert.deepEqual(ids(sortContracts(rows, { field: "endDate", direction: "desc" })), ["b", "c", "a", "d", "e"])
})

test("texto español, acentos, mayúsculas y valores vacíos", () => {
  for (const field of ["address", "tenant", "owner", "status"]) {
    const rows = [{ id: "a", [field]: "Zeta" }, { id: "b", [field]: "álvaro" }, { id: "c", [field]: "ALVARO" }, { id: "d", [field]: " " }]
    assert.deepEqual(ids(sortContracts(rows, { field, direction: "asc" })), ["b", "c", "a", "d"])
    assert.deepEqual(ids(sortContracts(rows, { field, direction: "desc" })), ["a", "b", "c", "d"])
  }
})

test("cambiar columna reinicia ascendente y repetir alterna dirección", () => {
  assert.deepEqual(nextContractSort(null, "folder"), { field: "folder", direction: "asc" })
  assert.deepEqual(nextContractSort({ field: "folder", direction: "asc" }, "folder"), { field: "folder", direction: "desc" })
  assert.deepEqual(nextContractSort({ field: "folder", direction: "desc" }, "folder"), { field: "folder", direction: "asc" })
  assert.deepEqual(nextContractSort({ field: "folder", direction: "asc" }, "owner"), { field: "owner", direction: "asc" })
})

test("modo servidor respeta exactamente el orden recibido", () => {
  const rows = [{ folder: "10" }, { folder: "2" }]
  assert.equal(sortContracts(rows, { field: "folder", direction: "asc" }, "server"), rows)
  assert.equal(sortContracts(rows, null), rows)
  assert.equal(sortContracts(rows, { field: "unknown", direction: "asc" }), rows)
  assert.equal(sortContracts(rows, { field: "folder", direction: "invalid" }), rows)
})
