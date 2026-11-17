// Business data is read-only; a temporary dev session is removed after the HTTP check.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { createHash, randomBytes } from 'node:crypto'
const require = createRequire(new URL('../apps/api/package.json', import.meta.url))
const { PrismaClient } = require('@prisma/client')
const { ReceiptsService } = require('./dist/src/receipts/receipts.service.js')
const prisma = new PrismaClient()
try {
  const [db] = await prisma.$queryRaw`SELECT current_database() AS name`
  assert.equal(db.name, 'db_roark_dev')
  const saved = await prisma.receipt.findMany({ where: { origin: 'LEGACY' } })
  assert.ok(saved.length > 0, 'Import history before running this check')
  const service = new ReceiptsService(prisma)
  assert.ok((await service.findAll({})).every(row => !row.isHistorical))
  const history = (await service.findAll({ includeHistorical: true })).filter(row => row.isHistorical)
  assert.equal(history.length, saved.length)
  assert.ok(history.every(row => row.isDeleteBlocked && row.pdfBase64 === null))
  const contractId = saved[0].contractId
  const filtered = await service.findAll({ contractId, kind: 'TENANT_SETTLEMENT',
    personName: 'Nombre modificado tras importar', includeHistorical: true })
  assert.equal(filtered.filter(row => row.isHistorical).length,
    saved.filter(row => row.contractId === contractId).length)
  let attemptedDelete = false
  const guarded = new ReceiptsService({ receipt: {
    findUnique: async () => saved[0],
    delete: async () => { attemptedDelete = true; throw new Error('Unexpected deletion') },
  } })
  await assert.rejects(guarded.remove(saved[0].id), /solo lectura/)
  assert.equal(attemptedDelete, false)
  const { number } = await service.getNextNumber()
  const max = await prisma.receipt.aggregate({ _max: { number: true } })
  assert.equal(number, max._max.number + 1)
  // Exercise the running server too: a regenerated client on disk does not
  // update Prisma metadata already loaded by the API process.
  const user = await prisma.user.findFirst({ where: { active: true }, select: { id: true } })
  assert.ok(user, 'An active dev user is required')
  const token = randomBytes(32).toString('hex')
  const session = await prisma.session.create({ data: { userId: user.id,
    tokenHash: createHash('sha256').update(token).digest('hex'),
    expiresAt: new Date(Date.now() + 60000) } })
  try {
    const query = new URLSearchParams({ contractId, kind: 'TENANT_SETTLEMENT', includeHistorical: 'true' })
    const response = await fetch(`http://localhost:3000/receipts?${query}`, {
      headers: { cookie: `roark_session=${token}` }, signal: AbortSignal.timeout(10000) })
    assert.equal(response.status, 200, 'Running API must load the updated Prisma client')
    const rows = await response.json()
    assert.equal(rows.filter(row => row.isHistorical).length,
      saved.filter(row => row.contractId === contractId).length)
    console.log(`HTTP history check passed: ${rows.length} receipts returned`)
  } finally {
    await prisma.session.deleteMany({ where: { id: session.id } })
  }
  console.log('History checks passed: settlement isolation, contract filtering, read-only history and next number.')
} finally {
  await prisma.$disconnect()
}
