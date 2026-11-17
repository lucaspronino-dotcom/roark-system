import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'
const { PrismaClient } = createRequire(new URL('../apps/api/package.json', import.meta.url))('@prisma/client')
const prisma = new PrismaClient()
const ids = [randomUUID(), randomUUID()]
const rollback = new Error('intentional rollback')
try {
  const [db] = await prisma.$queryRaw`SELECT current_database() AS name`
  assert.equal(db.name, 'db_roark_dev')
  await assert.rejects(prisma.$transaction(async (tx) => {
    for (const id of ids) await tx.person.create({ data: { id, firstName: 'Prueba', lastName: 'Temporal', phone: '', dni: null } })
    assert.equal(await tx.person.count({ where: { id: { in: ids }, dni: null } }), 2)
    throw rollback
  }), (error) => error === rollback)
  assert.equal(await prisma.person.count({ where: { id: { in: ids } } }), 0)
  await assert.rejects(prisma.$transaction(async (tx) => {
    for (const id of ids) await tx.person.create({ data: { id, firstName: 'Prueba', lastName: 'Temporal', phone: '', dni: `test-${ids[0]}` } })
  }), (error) => error.code === 'P2002')
  assert.equal(await prisma.person.count({ where: { id: { in: ids } } }), 0)
  // Exercise the destructive phase inside a transaction that always rolls back.
  const countBefore = await prisma.contract.count()
  const receiptsBefore = await prisma.receipt.count()
  await assert.rejects(prisma.$transaction(async (tx) => {
    await tx.contract.deleteMany()
    assert.equal(await tx.contract.count(), 0)
    throw rollback
  }), (error) => error === rollback)
  assert.equal(await prisma.contract.count(), countBefore)
  assert.equal(await prisma.receipt.count(), receiptsBefore)
  console.log('DB checks passed: multiple NULL DNIs, unique supplied DNI, failed writes and contract deletion roll back.')
} finally {
  await prisma.$disconnect()
}
