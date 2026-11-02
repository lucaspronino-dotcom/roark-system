export function resolvePeriodPreferences(previous = {}, choice, today = new Date()) {
  const skipPastPeriods = choice ?? previous.skipPastPeriods ?? false
  if (!skipPastPeriods) return { skipPastPeriods: false, pendingFrom: null }
  const currentMonth = `1/${today.getMonth() + 1}/${today.getFullYear()}`
  return {
    skipPastPeriods: true,
    pendingFrom: choice === true ? currentMonth : previous.pendingFrom ?? currentMonth,
  }
}

export function getPendingFrom(contract, today = new Date()) {
  const periods = contract.settings?.periods
  if (periods?.skipPastPeriods !== true) return null
  // Older contracts only stored the boolean; saving the record fixes the cutoff.
  const value = periods.pendingFrom
  if (!value) return new Date(today.getFullYear(), today.getMonth(), 1)
  const [, month, year] = value.split("/").map(Number)
  return new Date(year, month - 1, 1)
}
