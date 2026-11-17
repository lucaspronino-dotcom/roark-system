import assert from 'node:assert/strict'
import test from 'node:test'
import { createLegacyReceiptPdf, legacyReceiptLines } from './legacyReceiptPdf.js'
import { getPendingRentalDates, getOutstandingRentalBalances } from './rentalPeriods.js'

test('el histórico no cancela períodos ni genera deudas operativas', () => {
  const contract = { startDate: '1/1/2026', end: '28/2/2026' }
  const historical = { isHistorical: true, receipt: '42', receiptDate: '1/1/2026', balance: 200,
    snapshot: { items: [{ dueDate: '1/1/2026', description: 'Alquiler Cuota:1' }] } }
  assert.equal(getPendingRentalDates(contract, [historical], new Date(2026, 2, 1)).length, 2)
  assert.deepEqual(getOutstandingRentalBalances([historical]), [])
})

test('la exportación conserva los valores originales y aclara que no es el PDF original', async () => {
  const receipt = { receipt: '42', total: 999, snapshot: { originalNumber: '42',
    tenantName: 'Persona de prueba', reviewReasons: ['missing-amount'],
    original: { Total: '1.200,50', MontoPagado: '0', Obs: 'Observación '.repeat(600) } } }
  const lines = legacyReceiptLines(receipt)
  assert.ok(lines.includes('Total: 1.200,50'))
  assert.ok(lines.includes('MontoPagado: 0'))
  assert.ok(lines.some(line => line.includes('No es el PDF original')))
  assert.ok(lines.some(line => line.startsWith('REVISAR:')))
  const blob = createLegacyReceiptPdf(receipt)
  assert.equal(blob.type, 'application/pdf')
  const pdf = await blob.text()
  assert.ok(pdf.startsWith('%PDF-1.4'))
  assert.match(pdf, /\/Count [2-9]/)
  const xref = Number(pdf.match(/startxref\n(\d+)/)[1])
  assert.equal(pdf.slice(xref, xref + 4), 'xref')
})

test('el histórico usa la plantilla Roark A4 con copia y valores guardados sin recalcular', async () => {
  const receipt = { receipt: '42', total: 999, paid: 999, balance: 0, cancelled: true,
    snapshot: { originalNumber: '42', tenantName: 'Persona de prueba', propertyAddress: 'Calle de prueba',
      original: { 'Fecha Alta': '3/2/2026', Total: '1.200,50', MontoPagado: '0', SaldoInquilino: '', Alquiler: '1.000,00', Punitorios: '200,50', Anulado: 'VERDADERO' } } }
  const original = structuredClone(receipt)
  const pdf = await createLegacyReceiptPdf(receipt).text()
  assert.match(pdf, /\(ROARK\)/)
  assert.match(pdf, /MediaBox \[0 0 595 842\]/)
  assert.match(pdf, /COPIA HISTORICA/)
  assert.match(pdf, /ANULADO/)
  assert.match(pdf, /1\.200,50/)
  assert.match(pdf, /No informado/)
  assert.doesNotMatch(pdf, /\(999\)/)
  assert.deepEqual(receipt, original)
})


test('el PDF histórico indica revisión y conserva texto extenso sin usar el contrato actual', async () => {
  const receipt = { receipt: '17', snapshot: { reviewReasons: ['amounts-do-not-reconcile'],
    original: { Total: '1.000,99', MontoPagado: '900,00', SaldoInquilino: '500,00', Obs: 'Detalle '.repeat(1200) + 'FIN DEL DETALLE' } } }
  const pdf = await createLegacyReceiptPdf(receipt).text()
  for (const text of ['REVISAR:', '1.000,99', '900,00', '500,00', 'FIN DEL DETALLE', 'No informado en el registro']) assert.ok(pdf.includes(text))
  const pageCount = Number(pdf.match(/\/Count (\d+)/)[1])
  assert.ok(pageCount > 2)
  const xref = Number(pdf.match(/startxref\n(\d+)/)[1])
  assert.equal(pdf.slice(xref, xref + 4), 'xref')
})
