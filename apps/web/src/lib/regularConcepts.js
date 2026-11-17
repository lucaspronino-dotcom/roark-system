const legacyMonths = ['Ene', 'Feb', 'Marz', 'Abr', 'Mayo', 'Jun', 'Jul', 'Ago', 'Sept', 'Oct', 'Nov', 'Dic']
const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' })

function parseDate(value) {
  const match = String(value ?? '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!match) return null
  const [, day, month, year] = match.map(Number)
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null
}

function parseAmount(value) {
  if (typeof value === 'number') return value
  const text = String(value ?? '').replace(/[$\s]/g, '')
  if (!/^-?\d+(?:\.\d{3})*(?:,\d+)?$/.test(text)) return NaN
  return Number(text.replaceAll('.', '').replace(',', '.'))
}

export function importLegacyConcept(row) {
  const amount = parseAmount(row.Monto)
  const tenantEffect = { 1: 'none', 2: 'addToPayment', 3: 'discountPayment' }[row['Pago Inquilino']]
  const ownerEffect = { 1: 'none', 2: 'addToOwner', 3: 'discountOwner' }[row['Cobro Propietario']]
  const start = parseDate(row.Inicio)
  const end = parseDate(row.Fin)
  const validMonths = legacyMonths.every((key, i) => ['0', String(i + 1)].includes(String(row[key])))
  const importError = !tenantEffect || !ownerEffect ? 'Efecto desconocido'
    : !Number.isFinite(amount) || amount < 0 ? 'Importe inválido'
    : !start || !end || start > end ? 'Vigencia inválida'
    : !validMonths ? 'Meses inválidos'
    : row.Porcentual && parseAmount(row.Porcentual) !== 0 ? 'Porcentaje pendiente de revisión' : null
  return {
    id: `legacy-fixed:${row['ID Concepto']}`,
    legacyId: String(row['ID Concepto']),
    detail: row.Concepto,
    amount: Number.isFinite(amount) ? money.format(amount) : String(row.Monto),
    numericAmount: amount,
    tenantEffect, ownerEffect,
    startDate: row.Inicio, endDate: row.Fin,
    selectedMonths: legacyMonths.flatMap((key, i) => Number(row[key]) === i + 1 ? [i + 1] : []),
    ...(importError ? { importError } : {}),
  }
}

// Merge once, including imports previously opened and saved with an empty list.
// The version marker makes later user edits/deletions authoritative.
export function resolveRegularConcepts(settings = {}, fallback = []) {
  const concepts = Array.isArray(settings.regularConcepts) ? settings.regularConcepts : fallback
  if (settings.legacyConceptsVersion === 1) return concepts
  const existing = new Set(concepts.map(concept => concept.legacyId).filter(Boolean))
  return [...concepts, ...(settings.legacy?.fixedConcepts ?? [])
    .filter(row => !existing.has(String(row['ID Concepto'])))
    .map(importLegacyConcept)]
}

export function createRegularConceptItem(concept, periodDate) {
  if (concept.importError) return null
  const monthStart = new Date(periodDate.getFullYear(), periodDate.getMonth(), 1)
  const monthEnd = new Date(periodDate.getFullYear(), periodDate.getMonth() + 1, 0)
  const start = concept.startDate ? parseDate(concept.startDate) : null
  const end = concept.endDate ? parseDate(concept.endDate) : null
  if ((concept.startDate && !start) || (concept.endDate && !end) || (start && end && start > end)) return null
  if ((start && start > monthEnd) || (end && end < monthStart)) return null
  if (Array.isArray(concept.selectedMonths) && !concept.selectedMonths.includes(periodDate.getMonth() + 1)) return null
  const rawAmount = concept.numericAmount ?? concept.edit ?? parseAmount(concept.amount)
  if (!Number.isFinite(rawAmount)) return null
  const magnitude = Math.abs(rawAmount)
  const amount = concept.tenantEffect === 'none' ? 0
    : concept.tenantEffect === 'discountPayment' ? -magnitude
    : concept.tenantEffect === 'addToPayment' ? magnitude : rawAmount
  const ownerAmount = concept.ownerEffect === 'none' ? 0
    : concept.ownerEffect === 'discountOwner' ? -magnitude
    : concept.ownerEffect === 'addToOwner' ? magnitude : amount
  if (amount === 0 && ownerAmount === 0) return null
  // A monthly concept beginning after the rental due day still belongs to that month.
  const dueDate = new Date(Math.min(end?.getTime() ?? Infinity, Math.max(periodDate.getTime(), start?.getTime() ?? -Infinity)))
  const monthName = new Intl.DateTimeFormat('es-AR', { month: 'long' }).format(periodDate)
  return {
    apply: true, dueDate: new Intl.DateTimeFormat('es-AR').format(dueDate),
    description: `${monthName}/${periodDate.getFullYear()} ${concept.detail} -`,
    edit: amount, ownerAmount, conceptId: concept.id,
    conceptRevision: JSON.stringify([rawAmount, concept.tenantEffect, concept.ownerEffect, concept.startDate, concept.endDate, concept.selectedMonths]),
    isRegularConcept: true, penalty: '$ 0,00',
  }
}

// Read only receipt metadata; never apply current contract rules to old receipts.
export function getOwnerConceptAmount(item) {
  return Number(item.ownerAmount ?? item.amount ?? item.edit ?? 0)
}

export function validateConceptSchedule({ startDate, endDate }) {
  const start = parseDate(startDate)
  const end = endDate ? parseDate(endDate) : null
  if (!start || (endDate && !end)) return 'Ingresá fechas válidas con formato día/mes/año'
  if (end && start > end) return 'La fecha fin debe ser igual o posterior al inicio'
  return null
}

export function mergeConceptDraft(item, draftItem) {
  if (!draftItem || (item.isRegularConcept && item.conceptRevision !== draftItem.conceptRevision)) return item
  return { ...item, ...draftItem, ownerAmount: item.ownerAmount, conceptId: item.conceptId }
}
