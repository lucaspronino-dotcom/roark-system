import assert from 'node:assert/strict'
import { test } from 'node:test'
import { filterContracts } from './contractFilters.js'

const contracts = [
  { id: 'expired', folder: '2', status: 'Vencido', address: 'Calle Norte', tenant: 'Ana', owner: 'Luis' },
  { id: 'active', folder: '10', status: 'Alquiler', address: 'Calle Sur', tenant: 'Ana', owner: 'Marta' },
]

test('shows all contracts by default; hiding expired is reversible and preserves order and data', () => {
  const original = structuredClone(contracts)
  assert.deepEqual(filterContracts(contracts), contracts)
  assert.deepEqual(filterContracts(contracts, { showExpired: false }), [contracts[1]])
  assert.deepEqual(filterContracts(contracts, { showExpired: true }), contracts)
  assert.deepEqual(contracts, original)
})

test('status filter combines with folder, address, tenant and owner searches', () => {
  for (const search of ['10', 'SUR', 'ana', 'marta']) {
    assert.deepEqual(filterContracts(contracts, { showExpired: false, search }), [contracts[1]])
  }
  assert.deepEqual(filterContracts(contracts, { showExpired: false, search: 'Luis' }), [])
  assert.deepEqual(filterContracts(contracts, { search: 'Luis' }), [contracts[0]])
  assert.deepEqual(filterContracts([], { showExpired: false }), [])
})
