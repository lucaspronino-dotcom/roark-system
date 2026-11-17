import assert from 'node:assert/strict'
import { test } from 'node:test'
import { normalizeOptionalDni } from '../apps/api/src/common/optional-dni'

test('DNI absent, cleared, and supplied keep distinct PATCH semantics', () => {
  assert.equal(normalizeOptionalDni(undefined), undefined)
  assert.equal(normalizeOptionalDni(null), null)
  assert.equal(normalizeOptionalDni(''), null)
  assert.equal(normalizeOptionalDni('   '), null)
  assert.equal(normalizeOptionalDni(' 12345678 '), '12345678')
})
