import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getPendingRentalDates, getNextRentalPeriod, isRentalItemInRange } from './rentalPeriods.js'

const contract = {
  startDate: '1/1/2024', end: '31/12/2026',
  settings: { legacy: { reconciliationRequired: true }, periods: { pendingFrom: null } },
}

test('imported history awaiting review does not invent rental debts or allow advances', () => {
  const today = new Date(2026, 10, 3)
  assert.deepEqual(getPendingRentalDates(contract, [], today), [])
  assert.equal(getNextRentalPeriod(contract, today), null)
  assert.equal(isRentalItemInRange({ dueDate: '1/11/2026' }, contract, today), false)
})

test('reviewed imports use the explicit fixed administration cutoff', () => {
  const reviewed = { ...contract, settings: {
    legacy: { reconciliationRequired: false },
    periods: { skipPastPeriods: true, pendingFrom: '1/10/2026' },
  } }
  assert.equal(getPendingRentalDates(reviewed, [], new Date(2026, 10, 3)).length, 2)
  assert.equal(getPendingRentalDates(reviewed, [], new Date(2026, 11, 3)).length, 3)
})

test('administration cutoff is optional, validates dates and fixes the chosen month', async () => {
  const { normalizeAdministrationStart } = await import('./legacyMigration.js')
  assert.equal(normalizeAdministrationStart(''), null)
  assert.equal(normalizeAdministrationStart(' 15/11/2026 '), '1/11/2026')
  assert.equal(normalizeAdministrationStart('29/2/2024'), '1/2/2024')
  for (const value of ['31/2/2026', '29/2/2026', '1/13/2026', 'invalid']) {
    assert.throws(() => normalizeAdministrationStart(value))
  }
})
