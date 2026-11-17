import assert from 'node:assert/strict'
import { test } from 'node:test'
import { importLegacyConcept, resolveRegularConcepts, createRegularConceptItem, getOwnerConceptAmount, mergeConceptDraft, validateConceptSchedule } from './regularConcepts.js'

const source = {
  'ID Concepto': '572', Concepto: 'Honorarios cuota 2 de 3', Monto: '112.000,00',
  Inicio: '6/2/2026', Fin: '31/12/2027', 'Pago Inquilino': '2', 'Cobro Propietario': '1',
  Ene: '1', Feb: '2', Marz: '3', Abr: '0', Mayo: '0', Jun: '0', Jul: '0', Ago: '0', Sept: '0', Oct: '0', Nov: '0', Dic: '0', Porcentual: '0',
}

test('import preserves effects, dates, selected months and recurs in the next year', () => {
  const concept = importLegacyConcept(source)
  assert.deepEqual(concept.selectedMonths, [1, 2, 3])
  assert.equal(createRegularConceptItem(concept, new Date(2026, 0, 1)), null)
  const feb = createRegularConceptItem(concept, new Date(2026, 1, 1))
  assert.equal(feb.edit, 112000)
  assert.equal(feb.dueDate, '6/2/2026')
  assert.equal(feb.ownerAmount, 0)
  assert.equal(createRegularConceptItem(concept, new Date(2026, 3, 1)), null)
  assert.equal(createRegularConceptItem(concept, new Date(2027, 0, 1)).edit, 112000)
  assert.equal(createRegularConceptItem(concept, new Date(2028, 0, 1)), null)
})

test('bonification discounts tenant and owner independently', () => {
  const concept = importLegacyConcept({ ...source, Monto: '150.000,00', 'Pago Inquilino': '3', 'Cobro Propietario': '3' })
  const item = createRegularConceptItem(concept, new Date(2026, 1, 1))
  assert.equal(item.edit, -150000)
  assert.equal(getOwnerConceptAmount(item), -150000)
  const ownerOnly = createRegularConceptItem({ ...concept, tenantEffect: 'none', ownerEffect: 'addToOwner' }, new Date(2026, 1, 1))
  assert.equal(ownerOnly.edit, 0)
  assert.equal(ownerOnly.ownerAmount, 150000)
})

test('existing empty lists get imported concepts once; saved deletions stay deleted', () => {
  const settings = { regularConcepts: [], legacy: { fixedConcepts: [source] } }
  const concepts = resolveRegularConcepts(settings)
  assert.equal(concepts.length, 1)
  assert.equal(resolveRegularConcepts({ ...settings, regularConcepts: concepts }).length, 1)
  assert.deepEqual(resolveRegularConcepts({ ...settings, legacyConceptsVersion: 1 }), [])
  assert.deepEqual(settings.regularConcepts, [])
})

test('old receipt amounts stay unchanged and explicit zero prevents owner credit', () => {
  assert.equal(getOwnerConceptAmount({ amount: -150000 }), -150000)
  assert.equal(getOwnerConceptAmount({ amount: 112000, ownerAmount: 0 }), 0)
})

test('invalid legacy flags, dates and unsupported percentages cannot generate charges', () => {
  for (const patch of [{ 'Pago Inquilino': '9' }, { Inicio: '31/2/2026' }, { Porcentual: '0,05' }, { Monto: 'oops' }]) {
    const concept = importLegacyConcept({ ...source, ...patch })
    assert.ok(concept.importError)
    assert.equal(createRegularConceptItem(concept, new Date(2026, 1, 1)), null)
  }
})

test('native legacy concepts retain signed amounts; no-effect and empty months do not charge', () => {
  assert.equal(createRegularConceptItem({ detail: 'Descuento', numericAmount: -20 }, new Date(2026, 1, 1)).edit, -20)
  const concept = importLegacyConcept(source)
  assert.equal(createRegularConceptItem({ ...concept, selectedMonths: [] }, new Date(2026, 1, 1)), null)
  assert.equal(createRegularConceptItem({ ...concept, tenantEffect: 'none', ownerEffect: 'none' }, new Date(2026, 1, 1)), null)
})

test('editing a regular concept invalidates stale charges but preserves unchanged manual drafts', () => {
  const concept = importLegacyConcept(source)
  const original = createRegularConceptItem(concept, new Date(2026, 1, 1))
  const draft = { ...original, edit: 100000 }
  assert.equal(mergeConceptDraft(original, draft).edit, 100000)
  const updated = createRegularConceptItem({ ...concept, numericAmount: 120000 }, new Date(2026, 1, 1))
  assert.equal(mergeConceptDraft(updated, draft).edit, 120000)
})

test('schedule validates actual calendar dates, inclusive end and start before end', () => {
  assert.equal(validateConceptSchedule({ startDate: '29/2/2024', endDate: '' }), null)
  assert.ok(validateConceptSchedule({ startDate: '29/2/2026' }))
  assert.ok(validateConceptSchedule({ startDate: '2/3/2026', endDate: '1/3/2026' }))
  const concept = importLegacyConcept({ ...source, Inicio: '1/2/2026', Fin: '5/2/2026' })
  assert.equal(createRegularConceptItem(concept, new Date(2026, 1, 10)).dueDate, '5/2/2026')
  assert.equal(createRegularConceptItem(concept, new Date(2026, 2, 1)), null)
})
