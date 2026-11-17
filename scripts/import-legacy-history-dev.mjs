// Additive import into receipts. Existing receipts are never overwritten.
import assert from 'node:assert/strict'
import { readFileSync, realpathSync } from 'node:fs'
import { resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { isDeepStrictEqual } from 'node:util'
const { PrismaClient } = createRequire(new URL('../apps/api/package.json', import.meta.url))('@prisma/client')
const args = process.argv.slice(2)
const apply = args.includes('--apply'), rollback = args.includes('--rollback'), verify = args.includes('--verify')
if (rollback && !apply) throw new Error('--rollback requires --apply')
if (verify && apply) throw new Error('--verify is read-only')
const path = realpathSync(args[0])
assert.ok(path.startsWith(resolve(fileURLToPath(new URL('../private', import.meta.url))) + sep), 'Plan must stay in private/')
const plan = JSON.parse(readFileSync(path, 'utf8'))
assert.equal(plan.version, 1)
assert.equal(plan.type, 'legacy-tenant-history')
assert.match(plan.sourceHash, /^[a-f0-9]{64}$/)
assert.ok(Array.isArray(plan.receipts) && plan.receipts.length > 0, 'Empty history refused')
const seenIds = new Set(), seenSources = new Set(), seenNumbers = new Set()
const fields = ['id', 'origin', 'kind', 'contractId', 'number', 'date', 'total', 'paid', 'balance', 'personName', 'pdfBase64', 'snapshot']
for (const row of plan.receipts) {
  assert.deepEqual(Object.keys(row).sort(), [...fields].sort(), 'Unexpected history fields')
  for (const field of ['id', 'contractId']) assert.match(row[field], /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/)
  assert.ok(!seenIds.has(row.id) && !seenSources.has(row.snapshot?.sourceId) && !seenNumbers.has(row.number), 'Duplicate identity or number')
  seenIds.add(row.id); seenSources.add(row.snapshot.sourceId); seenNumbers.add(row.number)
  assert.equal(row.origin, 'LEGACY'); assert.equal(row.kind, 'TENANT_SETTLEMENT')
  assert.equal(row.pdfBase64, null)
  assert.equal(row.snapshot.sourceHash, plan.sourceHash)
  assert.ok(typeof row.snapshot.sourceId === 'string' && row.snapshot.sourceId.trim())
  assert.ok(Number.isInteger(row.number) && row.number > 0 && row.number <= 2147483647)
  assert.equal(new Date(row.date).toISOString(), row.date)
  for (const field of ['total', 'paid', 'balance']) assert.ok(row[field] === null || Number.isFinite(row[field]), 'Invalid amount')
  assert.equal(typeof row.personName, 'string')
  assert.equal(row.snapshot.sourceSheet, 'Recibos')
  assert.ok(Number.isInteger(row.snapshot.sourceRow) && row.snapshot.sourceRow > 1)
  assert.equal(row.snapshot.original?.IdClave, row.snapshot.sourceId)
  assert.equal(Number(row.snapshot.original?.['Id Recibo']), row.number)
  assert.ok(Array.isArray(row.snapshot.reviewReasons))
}
function assertSame(actual, expected) {
  for (const field of fields) {
    const value = actual[field] instanceof Date ? actual[field].toISOString() : actual[field]
    if (!isDeepStrictEqual(value, expected[field])) throw new Error(`Existing receipt differs in ${field}; refusing to overwrite`)
  }
}
const prisma = new PrismaClient()
try {
  const [db] = await prisma.$queryRaw`SELECT current_database() AS name`
  if (db.name !== 'db_roark_dev') throw new Error('Only db_roark_dev is supported')
  const execute = async tx => {
    const contracts = await tx.contract.findMany({ select: { id: true, settings: true } })
    const byId = new Map(contracts.map(c => [c.id, c]))
    for (const row of plan.receipts) {
      const legacy = byId.get(row.contractId)?.settings?.legacy
      if (legacy?.sourceHash !== plan.sourceHash || legacy?.contractId !== row.snapshot.sourceContractId) {
        throw new Error('History does not match imported contract identity/source')
      }
    }
    const existing = await tx.receipt.findMany({ where: { OR: [{ id: { in: [...seenIds] } }, { number: { in: [...seenNumbers] } }] } })
    const byNumber = new Map(existing.map(row => [row.number, row]))
    const byExistingId = new Map(existing.map(row => [row.id, row]))
    const pending = []
    for (const row of plan.receipts) {
      const saved = byNumber.get(row.number) ?? byExistingId.get(row.id)
      if (saved) assertSame(saved, row)
      else pending.push(row)
    }
    if (verify && pending.length) throw new Error('History verification found missing receipts')
    if (apply && pending.length) {
      await tx.receipt.createMany({ data: pending })
      const stored = await tx.receipt.findMany({ where: { id: { in: [...seenIds] } } })
      const byStoredId = new Map(stored.map(row => [row.id, row]))
      for (const row of plan.receipts) {
        if (!byStoredId.has(row.id)) throw new Error('Missing history after write; rollback')
        assertSame(byStoredId.get(row.id), row)
      }
    }
    return { database: db.name, applied: apply, verified: verify || apply,
      receipts: plan.receipts.length, existing: existing.length, toCreate: pending.length,
      created: apply ? pending.length : 0, reviewCount: plan.receipts.filter(row => row.snapshot.reviewReasons.length).length }
  }
  const result = await prisma.$transaction(async tx => {
    if (apply) await tx.$executeRawUnsafe('LOCK TABLE contracts, receipts IN EXCLUSIVE MODE')
    const result = await execute(tx)
    if (rollback) throw Object.assign(new Error('Validation rollback'), { validationResult: result })
    return result
  }, { timeout: 120000, isolationLevel: 'Serializable' })
  console.log(JSON.stringify(result, null, 2))
} catch (error) {
  if (error.validationResult) console.log(JSON.stringify({ ...error.validationResult, applied: false, created: 0, rollbackVerified: true }, null, 2))
  else {
    console.error(error.code ? `History import failed (${error.code}); transaction rolled back` : error.message)
    process.exitCode = 1
  }
} finally { await prisma.$disconnect() }
