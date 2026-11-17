import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const apiRequire = createRequire(new URL('../apps/api/package.json', import.meta.url))
const { PrismaClient } = apiRequire('@prisma/client')
const { ContractsService } = require('../apps/api/dist/src/contracts/contracts.service.js')
const { ReceiptsService } = require('../apps/api/dist/src/receipts/receipts.service.js')
const { TenantsService } = require('../apps/api/dist/src/tenants/tenants.service.js')
const { OwnersService } = require('../apps/api/dist/src/owners/owners.service.js')
const prisma = new PrismaClient()
try {
  const [db] = await prisma.$queryRaw`SELECT current_database() AS name`
  assert.equal(db.name, 'db_roark_dev')
  const plan = JSON.parse(readFileSync('private/migration/plan.json', 'utf8'))
  const actual = await prisma.contract.findMany({ include: { property: { include: { owners: true } }, tenant: { include: { person: true } }, owner: { include: { person: true } } } })
  assert.equal(actual.length, plan.contracts.length)
  for (const expected of plan.contracts) {
    const row = actual.find((entry) => entry.id === expected.id)
    assert.ok(row)
    assert.equal(row.startDate.toISOString(), expected.startDate)
    assert.equal(row.endDate.toISOString(), expected.endDate)
    assert.equal(row.status, expected.status)
    assert.equal(row.tenantId, expected.tenantId)
    assert.equal(row.ownerId, expected.ownerId)
    assert.equal(row.property.folder, expected.folder)
    assert.deepEqual(row.settings, expected.settings)
    assert.equal(row.tenant.person.dni, null)
    assert.equal(row.owner.person.dni, null)
    assert.ok(row.property.owners.some((link) => link.ownerId === row.ownerId))
  }
  assert.equal(await prisma.receipt.count(), 0)
  const contracts = await new ContractsService(prisma).findAll()
  assert.equal(contracts.length, plan.contracts.length)
  await assert.rejects(new ReceiptsService(prisma).create({ contractId: actual[0].id, items: [{ description: 'Prueba' }] }), (error) => error.getStatus() === 400)
  const rollback = new Error('rollback service test')
  const beforePeople = await prisma.person.count()
  await assert.rejects(prisma.$transaction(async (tx) => {
    for (const service of [new TenantsService(tx), new OwnersService(tx)]) {
      const person = await service.create({ firstName: 'Prueba', lastName: 'Temporal', phone: '123', address: 'Calle ficticia', city: 'Prueba', rentalAddress: 'Calle ficticia', dni: '' })
      assert.equal(person.person.dni, null)
      const populated = await service.update(person.id, { dni: `test-${person.id}` })
      assert.equal(populated.person.dni, `test-${person.id}`)
      const kept = await service.update(person.id, { phone: '456' })
      assert.equal(kept.person.dni, populated.person.dni)
      const cleared = await service.update(person.id, { dni: ' ' })
      assert.equal(cleared.person.dni, null)
    }
    throw rollback
  }), (error) => error === rollback)
  assert.equal(await prisma.person.count(), beforePeople)
  console.log(JSON.stringify({ verifiedContracts: actual.length, active: actual.filter((row) => row.status === 'ACTIVE').length, expired: actual.filter((row) => row.status === 'EXPIRED').length, missingDniAllowed: true, administrationDatesBlank: true, historyReviewEnforced: true, personCreateAndUpdateVerified: true }))
} finally { await prisma.$disconnect() }
