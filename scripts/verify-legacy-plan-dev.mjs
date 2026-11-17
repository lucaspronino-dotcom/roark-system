// Read-only comparison of every imported field with the selected plan.
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { isDeepStrictEqual } from 'node:util'
import { modelNames, validatePlan } from './legacy-plan.mjs'
const { PrismaClient } = createRequire(new URL('../apps/api/package.json', import.meta.url))('@prisma/client')
const plan = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const expectedCounts = validatePlan(plan)
const prisma = new PrismaClient()
try {
  const [db] = await prisma.$queryRaw`SELECT current_database() AS name`
  if (db.name !== 'db_roark_dev') throw new Error('Only db_roark_dev is supported')
  for (const [key, model] of Object.entries(modelNames)) {
    const rows = await prisma[model].findMany()
    if (rows.length !== expectedCounts[key]) throw new Error(`Count mismatch: ${key}`)
    const byId = new Map(rows.map(row => [row.id, row]))
    for (const expected of plan[key]) {
      const actual = byId.get(expected.id)
      if (!actual) throw new Error(`Missing identity in ${key}`)
      for (const [field, value] of Object.entries(expected)) {
        const stored = actual[field] instanceof Date ? actual[field].toISOString() : actual[field]
        if (!isDeepStrictEqual(stored, value)) throw new Error(`Field mismatch: ${key}.${field}`)
      }
    }
  }
  const receipts = await prisma.receipt.count()
  if (receipts !== 0) throw new Error('Unexpected operational receipts')
  console.log(JSON.stringify({ verified: true, counts: expectedCounts, receipts,
    active: plan.contracts.filter(row => row.status === 'ACTIVE').length,
    expired: plan.contracts.filter(row => row.status === 'EXPIRED').length,
    skipped: plan.issues.filter(row => row.kind === 'skipped-contract-missing-owner'),
    users: await prisma.user.count(), sessions: await prisma.session.count() }, null, 2))
} catch (error) {
  console.error(error.code ? `Verification failed (${error.code})` : error.message)
  process.exitCode = 1
} finally { await prisma.$disconnect() }
