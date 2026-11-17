// Run after npm run build:api. Uses a Prisma double; no database is accessed.
const assert = require('node:assert/strict')
const { test } = require('node:test')
const { ReceiptsService } = require('../apps/api/dist/src/receipts/receipts.service.js')

function serviceFor(settings = {}) {
  const created = []
  const service = new ReceiptsService({
    contract: { findUniqueOrThrow: async () => ({
      settings, folder: 'TEST', startDate: new Date('2026-01-01T12:00:00Z'), endDate: new Date('2027-12-31T12:00:00Z'),
      property: { address: 'Test' }, tenant: { person: { firstName: 'Test', lastName: 'Tenant' } },
      owner: { person: { firstName: 'Test', lastName: 'Owner' } },
    }) },
    receipt: { create: async ({ data }) => { created.push(data); return { ...data, id: 'test', origin: 'NATIVE' } } },
  })
  return { service, created }
}

const payload = {
  number: 1, balance: 0, paid: 262000, total: 262000, contractId: 'test',
  date: '6/2/2026', kind: 'TENANT_SETTLEMENT', personName: 'Test',
  items: [
    { description: 'Alquiler', dueDate: '1/2/2026', amount: 300000 },
    { conceptId: 'legacy-fixed:571', description: 'Bonificación', dueDate: '1/2/2026', amount: -150000, ownerAmount: -150000 },
    { conceptId: 'legacy-fixed:572', description: 'Honorarios', dueDate: '6/2/2026', amount: 112000, ownerAmount: 0 },
  ],
}

test('receipt snapshots preserve independent owner effects and imported identities', async () => {
  const { service, created } = serviceFor()
  const original = structuredClone(payload)
  const receipt = await service.create(payload)
  assert.equal(created.length, 1)
  assert.equal(receipt.snapshot.items[1].ownerAmount, -150000)
  assert.equal(receipt.snapshot.items[2].ownerAmount, 0)
  assert.equal(receipt.snapshot.items[2].conceptId, 'legacy-fixed:572')
  assert.equal(receipt.snapshot.items[0].ownerAmount, undefined)
  assert.deepEqual(payload, original)
})

test('unreviewed imported contracts still cannot create receipts', async () => {
  const { service, created } = serviceFor({ legacy: { reconciliationRequired: true } })
  await assert.rejects(service.create(payload), /Revisá saldos y conceptos/)
  assert.equal(created.length, 0)
})
