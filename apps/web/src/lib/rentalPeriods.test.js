import { getNextRentalPeriod } from "./rentalPeriods.js"
import assert from "node:assert/strict"
import test from "node:test"
import {
  getPendingRentalDates,
  getOutstandingRentalBalances,
  isRentalItemInRange,
} from "./rentalPeriods.js"

const today = new Date(2026, 10, 2)
const contract = { startDate: "1/1/2026", end: "31/8/2026" }
const months = (value, receipts = []) =>
  getPendingRentalDates(value, receipts, today).map(
    (date) => date.getMonth() + 1,
  )
const receipt = (month, balance = 0, number = month) => ({
  receipt: String(number),
  receiptDate: `1/${month}/2026`,
  balance,
  snapshot: {
    items: [
      { dueDate: `1/${month}/2026`, description: `Alquiler Cuota:${month}` },
    ],
  },
})

test("contrato de prueba sin configuración: muestra enero a agosto, nunca septiembre a noviembre", () => {
  assert.deepEqual(months(contract), [1, 2, 3, 4, 5, 6, 7, 8])
})
test("contrato vigente: todos los impagos hasta noviembre, sin diciembre", () => {
  assert.deepEqual(
    months({ ...contract, end: "31/12/2026" }),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  )
})
test("un recibo del mes actual no oculta las cuotas anteriores", () => {
  assert.deepEqual(
    months({ ...contract, end: "31/12/2026" }, [receipt(11)]),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  )
})
test("contrato vencido con todo pagado: no tiene cuotas ni saldos pendientes", () => {
  const receipts = Array.from({ length: 8 }, (_, index) => receipt(index + 1))
  assert.deepEqual(months(contract, receipts), [])
  assert.deepEqual(getOutstandingRentalBalances(receipts), [])
})
test("solo se excluyen los meses documentados en el recibo, no su fecha de emisión", () => {
  const payment = { ...receipt(1), receiptDate: "1/11/2026" }
  payment.snapshot.items.push(...receipt(3).snapshot.items)
  assert.deepEqual(months(contract, [payment]), [2, 4, 5, 6, 7, 8])
})
test("un recibo de extras no cancela la cuota del alquiler", () => {
  const payment = receipt(1)
  payment.snapshot.items[0].description = "Reparación"
  assert.equal(months(contract, [payment])[0], 1)
})
test("contrato que comienza en un mes futuro: no genera cuotas", () => {
  assert.deepEqual(months({ startDate: "1/12/2026", end: "30/11/2027" }), [])
})
test("incluye el mes actual aunque su día de vencimiento todavía no haya llegado", () => {
  assert.deepEqual(months({ startDate: "15/11/2026", end: "14/11/2027" }), [11])
})
test("día 31: febrero no salta ni desplaza las cuotas siguientes", () => {
  const dates = getPendingRentalDates(
    { startDate: "31/1/2026", end: "30/4/2026" },
    [],
    today,
  )
  assert.deepEqual(
    dates.map((date) => [date.getMonth() + 1, date.getDate()]),
    [
      [1, 31],
      [2, 28],
      [3, 31],
      [4, 30],
    ],
  )
})
test("datos inválidos no generan períodos", () => {
  assert.deepEqual(months({ startDate: "", end: "" }), [])
})
test("pago parcial del último mes: conserva solo el saldo, incluso vencido", () => {
  const receipts = Array.from({ length: 8 }, (_, index) =>
    receipt(index + 1, index === 7 ? 100 : 0),
  )
  assert.deepEqual(months(contract, receipts), [])
  assert.equal(getOutstandingRentalBalances(receipts)[0].edit, 100)
})
test("saldo cancelado en otro recibo: no se vuelve a cobrar", () => {
  const partial = receipt(8, 100)
  const balanceItem = getOutstandingRentalBalances([partial])[0]
  const payment = { receipt: "9", balance: 0, snapshot: { items: [balanceItem] } }
  assert.deepEqual(getOutstandingRentalBalances([partial, payment]), [])
})
test("saldo pagado parcialmente: queda solo el nuevo saldo", () => {
  const partial = receipt(8, 100)
  const balanceItem = getOutstandingRentalBalances([partial])[0]
  const payment = { receipt: "9", balance: 40, snapshot: { items: [balanceItem] } }
  assert.deepEqual(
    getOutstandingRentalBalances([partial, payment]).map((item) => item.edit),
    [40],
  )
})
test("respeta saldos trasladados con el formato anterior", () => {
  const payment = {
    ...receipt(2),
    snapshot: {
      items: [{ dueDate: "1/2/2026", description: "saldo del mes enero/2026" }],
    },
  }
  assert.deepEqual(getOutstandingRentalBalances([receipt(1, 100), payment]), [])
})
test("borradores: no recupera conceptos fuera del contrato o de meses futuros", () => {
  assert.equal(
    isRentalItemInRange({ dueDate: "1/11/2026" }, contract, today),
    false,
  )
  assert.equal(
    isRentalItemInRange(
      { dueDate: "1/12/2026" },
      { ...contract, end: "31/12/2026" },
      today,
    ),
    false,
  )
  assert.equal(
    isRentalItemInRange({ dueDate: "1/8/2026" }, contract, today),
    true,
  )
})


test("saldo pendiente muestra el número recibido de la API", () => {
  const [item] = getOutstandingRentalBalances([receipt(11, 100, 42)])
  assert.equal(item.description, "Saldo pendiente del recibo N° 42")
})

test("cancelar un saldo no oculta otro recibo pendiente", () => {
  const first = receipt(10, 100, 41)
  const second = receipt(11, 200, 42)
  const payment = {
    receipt: "43",
    balance: 0,
    snapshot: { items: [{ dueDate: "1/10/2026", description: "Saldo pendiente del recibo N° 41" }] },
  }
  const items = getOutstandingRentalBalances([first, second, payment])
  assert.deepEqual(items.map((item) => item.description), ["Saldo pendiente del recibo N° 42"])
  assert.equal(items[0].edit, 200)
})

test("avance manual incluye diciembre; la vista inicial sigue limitada a noviembre", () => {
  const active = { ...contract, end: "31/12/2026" }
  const next = getNextRentalPeriod(active, today)
  assert.equal(next.getMonth(), 11)
  assert.equal(getPendingRentalDates(active, [], today).length, 11)
  assert.equal(getPendingRentalDates(active, [], today, next).length, 12)
  assert.equal(getNextRentalPeriod(active, next), null)
})

test("no permite adelantar períodos de un contrato vencido", () => {
  assert.equal(getNextRentalPeriod(contract, today), null)
})

test("avance respeta el día contractual después de febrero y el fin exacto", () => {
  const active = { startDate: "31/1/2026", end: "30/3/2026" }
  const february = getNextRentalPeriod(active, new Date(2026, 0, 31))
  assert.equal(february.getDate(), 28)
  assert.equal(getNextRentalPeriod(active, february), null)
})

test("adelantar un mes no mueve el corte de administración de contratos antiguos", () => {
  const active = { ...contract, end: "31/12/2026", settings: { periods: { skipPastPeriods: true } } }
  const next = getNextRentalPeriod(active, today)
  assert.deepEqual(getPendingRentalDates(active, [], today, next).map((date) => date.getMonth() + 1), [11, 12])
})

test("borradores adelantados solo se admiten tras seleccionar ese mes", () => {
  const active = { ...contract, end: "31/12/2026" }
  const item = { dueDate: "1/12/2026" }
  assert.equal(isRentalItemInRange(item, active, today), false)
  assert.equal(isRentalItemInRange(item, active, today, getNextRentalPeriod(active, today)), true)
})
