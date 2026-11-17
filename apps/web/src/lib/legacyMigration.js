export function requiresSettlementReview(contract) {
  return contract?.settings?.legacy?.reconciliationRequired === true
}

// Administration starts at a fixed calendar month, never at the current month.
export function normalizeAdministrationStart(value) {
  if (!value?.trim()) return null
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!match) throw new Error('Ingresá el inicio de administración con formato día/mes/año')
  const [, day, month, year] = match.map(Number)
  const date = new Date(year, month - 1, day)
  if (year < 1900 || date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new Error('La fecha de inicio de administración no es válida')
  }
  return `1/${month}/${year}`
}
