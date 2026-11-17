import assert from 'node:assert/strict'

export const modelNames = {
  people: 'person', tenants: 'tenant', owners: 'owner', properties: 'property',
  propertyOwners: 'propertyOwner', contracts: 'contract',
}

export function validatePlan(plan) {
  assert.equal(plan.version, 1, 'Unsupported plan version')
  assert.match(plan.sourceHash, /^[a-f0-9]{64}$/)
  assert.ok(plan.contracts?.length > 0, 'Empty import refused')
  const ids = {}
  for (const key of Object.keys(modelNames)) {
    assert.ok(Array.isArray(plan[key]), `Missing ${key}`)
    ids[key] = new Set()
    for (const row of plan[key]) {
      assert.match(row.id, /^[a-f0-9-]{36}$/)
      assert.ok(!ids[key].has(row.id), `Duplicate ${key} ID`)
      ids[key].add(row.id)
    }
  }
  const requireId = (table, id) => assert.ok(ids[table].has(id), `Unresolved ${table} reference`)
  const dnis = new Set()
  for (const person of plan.people) {
    if (person.dni !== null) {
      assert.ok(typeof person.dni === 'string' && person.dni.trim())
      assert.ok(!dnis.has(person.dni), 'Duplicate DNI in plan')
      dnis.add(person.dni)
    }
  }
  for (const role of [...plan.tenants, ...plan.owners]) requireId('people', role.personId)
  const relationships = new Set()
  for (const row of plan.propertyOwners) {
    requireId('properties', row.propertyId)
    requireId('owners', row.ownerId)
    const key = `${row.propertyId}:${row.ownerId}`
    assert.ok(!relationships.has(key), 'Duplicate property owner')
    relationships.add(key)
    for (const field of ['participation', 'administration', 'commission']) {
      assert.ok(Number.isFinite(row[field]) && row[field] >= 0, `Invalid ${field}`)
    }
  }
  for (const row of plan.contracts) {
    requireId('properties', row.propertyId)
    requireId('tenants', row.tenantId)
    requireId('owners', row.ownerId)
    assert.ok(relationships.has(`${row.propertyId}:${row.ownerId}`), 'Contract owner missing from property')
    const start = new Date(row.startDate), end = new Date(row.endDate)
    assert.ok(Number.isFinite(+start) && Number.isFinite(+end) && start <= end, 'Invalid dates')
    assert.ok(['ACTIVE', 'EXPIRED'].includes(row.status))
    assert.equal(row.settings?.legacy?.sourceHash, plan.sourceHash)
    assert.equal(row.settings.legacy.reconciliationRequired, true)
    assert.equal(row.settings.periods.pendingFrom, null)
    assert.equal(row.settings.periods.skipPastPeriods, false)
  }
  return Object.fromEntries(Object.keys(modelNames).map((key) => [key, plan[key].length]))
}
