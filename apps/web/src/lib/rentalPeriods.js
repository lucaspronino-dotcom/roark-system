import { requiresSettlementReview } from "./legacyMigration.js"
import { getPendingFrom } from "./periodPreferences.js"

function parseDate(value) {
  const [day, month, year] = String(value).split("/").map(Number)
  return new Date(year, month - 1, day)
}

function monthKey(date) {
  return `${date.getFullYear()}-${date.getMonth()}`
}

// Enumerate calendar months, keeping the original due day across short months.
export function getPendingRentalDates(
  contract,
  receipts = [],
  today = new Date(),
  throughDate = today,
) {
  if (requiresSettlementReview(contract)) return []
  const start = parseDate(contract.startDate)
  const end = parseDate(contract.end)
  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    start > end
  )
    return []
  const limit = new Date(
    Math.min(
      end.getTime(),
      new Date(throughDate.getFullYear(), throughDate.getMonth() + 1, 0).getTime(),
    ),
  )
  const paidMonths = new Set()
  for (const receipt of receipts) {
    if (receipt.isHistorical) continue
    const items = receipt.snapshot?.items
    if (!Array.isArray(items) || items.length === 0) {
      paidMonths.add(monthKey(parseDate(receipt.receiptDate)))
    } else {
      // A receipt for an extra concept or a carried balance does not pay the rent.
      for (const item of items) {
        if (/alquiler\s+cuota/i.test(item.description))
          paidMonths.add(monthKey(parseDate(item.dueDate)))
      }
    }
  }
  const pendingFrom = getPendingFrom(contract, today)
  const dates = []
  for (let offset = 0; ; offset += 1) {
    const month = new Date(start.getFullYear(), start.getMonth() + offset, 1)
    const day = Math.min(
      start.getDate(),
      new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate(),
    )
    const date = new Date(month.getFullYear(), month.getMonth(), day)
    if (date > limit) break
    if ((!pendingFrom || date >= pendingFrom) && !paidMonths.has(monthKey(date))) dates.push(date)
  }
  return dates
}

export function getOutstandingRentalBalances(receipts = []) {
  receipts = receipts.filter(receipt => !receipt.isHistorical)
  const allItems = receipts.flatMap((receipt) => receipt.snapshot?.items ?? [])
  return receipts.flatMap((receipt) => {
    if (
      Number(receipt.balance) <= 0 ||
      !Number.isFinite(Number(receipt.balance))
    )
      return []
    const description = `Saldo pendiente del recibo N° ${receipt.receipt}`
    if (allItems.some((item) => item.description === description)) return []
    // Compatibility with balances already carried by the previous monthly flow.
    const dates = (receipt.snapshot?.items ?? [])
      .map((item) => parseDate(item.dueDate))
      .filter((date) => !Number.isNaN(date.getTime()))
    const date = dates.length
      ? new Date(Math.max(...dates.map(Number)))
      : parseDate(receipt.receiptDate)
    const legacyDescription = `saldo del mes ${new Intl.DateTimeFormat("es-AR", { month: "long" }).format(date)}/${date.getFullYear()}`
    if (allItems.some((item) => item.description === legacyDescription))
      return []
    return [
      {
        apply: true,
        dueDate: new Intl.DateTimeFormat("es-AR").format(date),
        description,
        edit: Number(receipt.balance),
        penalty: "$ 0,00",
      },
    ]
  })
}

export function isRentalItemInRange(item, contract, today = new Date(), throughDate = today) {
  if (requiresSettlementReview(contract)) return false
  const date = parseDate(item.dueDate)
  const start = parseDate(contract.startDate)
  const end = parseDate(contract.end)
  const lastCurrentDay = new Date(throughDate.getFullYear(), throughDate.getMonth() + 1, 0)
  const pendingFrom = getPendingFrom(contract, today)
  return date >= start && date <= end && date <= lastCurrentDay && (!pendingFrom || date >= pendingFrom)
}


export function getNextRentalPeriod(contract, currentPeriod) {
  if (requiresSettlementReview(contract)) return null
  const start = parseDate(contract.startDate)
  const end = parseDate(contract.end)
  if ([start, end, currentPeriod].some((date) => Number.isNaN(date.getTime()))) return null
  const month = new Date(currentPeriod.getFullYear(), currentPeriod.getMonth() + 1, 1)
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const next = new Date(month.getFullYear(), month.getMonth(), Math.min(start.getDate(), lastDay))
  const candidate = next < start ? start : next
  return candidate <= end ? candidate : null
}
