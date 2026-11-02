export function calculateEndDate(startDateValue, installmentsValue) {
  const [day, month, year] = startDateValue.split("/").map(Number)
  const startDate = new Date(year, month - 1, day)
  const installments = Number(installmentsValue)

  if (Number.isNaN(startDate.getTime()) || !Number.isFinite(installments) || installments < 1) {
    return ""
  }

  const endDate = new Date(startDate)

  endDate.setMonth(endDate.getMonth() + installments)
  endDate.setDate(endDate.getDate() - 1)

  return new Intl.DateTimeFormat("es-AR").format(endDate)
}
