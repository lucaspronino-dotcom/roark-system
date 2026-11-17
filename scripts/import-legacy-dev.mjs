// Only development. Default: validate and preview. No implicit seed or resets.
import { readFileSync, realpathSync } from 'node:fs'
import { resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
const { PrismaClient } = createRequire(new URL('../apps/api/package.json', import.meta.url))('@prisma/client')
import { modelNames, validatePlan } from './legacy-plan.mjs'

const args = process.argv.slice(2)
const apply = args.includes('--apply')
const replaceAll = args.includes('--replace-business-data')
const withoutBackup = args.includes('--without-backup')
const rollbackOnly = args.includes('--rollback')
if (rollbackOnly && !apply) throw new Error('--rollback requires --apply')
const planPath = args[0]
if (!planPath || planPath.startsWith('--')) throw new Error('Usage: import-legacy-dev.mjs private/migration/plan.json [--apply --replace-contracts] [--replace-business-data] [--backup private/...dump | --without-backup] [--rollback]')
const privateRoot = resolve(fileURLToPath(new URL('../private', import.meta.url))) + sep
function privateFile(path) {
  const real = realpathSync(path)
  if (!real.startsWith(privateRoot)) throw new Error('Plan and backup must stay in private/')
  return real
}
const plan = JSON.parse(readFileSync(privateFile(planPath), 'utf8'))
const counts = validatePlan(plan)
if (withoutBackup && args.includes('--backup')) throw new Error('Choose --backup or --without-backup')
if (apply) {
  if (!args.includes('--replace-contracts')) throw new Error('Explicit --replace-contracts is required')
  if (!withoutBackup) {
    const backupIndex = args.indexOf('--backup')
    if (backupIndex < 0 || !args[backupIndex + 1]) throw new Error('A verified backup is required')
    const backup = readFileSync(privateFile(args[backupIndex + 1]))
    if (backup.subarray(0, 5).toString() !== 'PGDMP' || backup.length < 100) throw new Error('Expected a PostgreSQL custom backup')
  }
}
const prisma = new PrismaClient()
try {
  const [database] = await prisma.$queryRaw`SELECT current_database() AS name`
  if (database.name !== 'db_roark_dev') throw new Error('This importer only supports db_roark_dev')
  const execute = async (tx) => {
    const existing = await tx.contract.findMany({ select: { id: true, settings: true } })
    const imported = existing.filter((row) => row.settings?.legacy?.sourceHash === plan.sourceHash)
    if (imported.length && !replaceAll) {
      const ids = new Set(imported.map((row) => row.id))
      if (imported.length !== plan.contracts.length || !plan.contracts.every((row) => ids.has(row.id))) {
        throw new Error('Partial existing import: manual reconciliation required')
      }
      return { applied: false, alreadyImported: true, contracts: imported.length }
    }
    // Do not overwrite unrelated people/properties or silently remap identifiers.
    for (const [key, model] of Object.entries(modelNames)) {
      if (key === 'contracts' || replaceAll) continue
      const collisions = await tx[model].count({ where: { id: { in: plan[key].map((row) => row.id) } } })
      if (collisions) throw new Error(`Existing ${key} import IDs; refusing to overwrite`)
    }
    const oldReceipts = await tx.receipt.count()
    const summary = { applied: apply, database: database.name, replaceContracts: existing.length, deleteRelatedReceipts: oldReceipts, replaceBusinessData: replaceAll, import: counts }
    if (!apply) return summary
    // Explicit full replacement is atomic; access accounts and sessions remain intact.
    await tx.contract.deleteMany()
    if (replaceAll) {
      for (const model of ['receipt', 'propertyOwner', 'property', 'tenant', 'owner', 'person']) {
        await tx[model].deleteMany()
      }
    }
    for (const [key, model] of Object.entries(modelNames)) {
      await tx[model].createMany({ data: plan[key] })
    }
    for (const [key, model] of Object.entries(modelNames)) {
      const actual = await tx[model].count({ where: { id: { in: plan[key].map((row) => row.id) } } })
      if (actual !== counts[key]) throw new Error(`Unexpected ${key} count; rollback`)
    }
    const after = await tx.contract.count()
    if (after !== counts.contracts) throw new Error('Unexpected contract count; rollback')
    return summary
  }
  const result = apply
    ? await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe('LOCK TABLE contracts, receipts, properties, property_owners, people, owners, tenants IN EXCLUSIVE MODE')
        const result = await execute(tx)
        if (rollbackOnly) throw Object.assign(new Error('Validation rollback'), { validationResult: result })
        return result
      }, { timeout: 120000, isolationLevel: 'Serializable' })
    : await execute(prisma)
  console.log(JSON.stringify(result, null, 2))
} catch (error) {
  // Avoid Prisma diagnostics echoing personal records.
  if (error.validationResult) {
    console.log(JSON.stringify({ ...error.validationResult, applied: false, rollbackVerified: true }, null, 2))
  } else if (error?.code) console.error(`Import failed (${error.code}); transaction rolled back.`)
  else console.error(error.message)
  if (!error.validationResult) process.exitCode = 1
} finally {
  await prisma.$disconnect()
}
