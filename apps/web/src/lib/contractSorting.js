const collator = new Intl.Collator("es-AR", { numeric: true, sensitivity: "base" })

export const contractSortColumns = [
  { field: "folder", label: "table.columns.folder" },
  { field: "endDate", label: "table.columns.end" },
  { field: "address", label: "table.columns.address" },
  { field: "status", label: "table.columns.status" },
  { field: "tenant", label: "table.columns.collections" },
  { field: "owner", label: "table.columns.settlement" },
]

export function nextContractSort(current, field) {
  return { field, direction: current?.field === field && current.direction === "asc" ? "desc" : "asc" }
}

function dateValue(value) {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(value ?? "").trim())
  if (!match) return null
  const [, day, month, year] = match.map(Number)
  const date = new Date(0)
  date.setUTCFullYear(year, month - 1, day)
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null
  return date.getTime()
}

function valueFor(row, field) {
  if (field === "endDate") return dateValue(row.end)
  const value = String(row[field] ?? "").trim()
  const normalized = field === "folder" ? value.replace(/^#/, "").trim() : value
  return normalized || null
}

// In server mode, keep the API's order. The same { field, direction } state
// can later be translated to validated API query parameters at the service layer.
export function sortContracts(rows, sort, mode = "client") {
  if (mode === "server" || !sort || !contractSortColumns.some(column => column.field === sort.field)) return rows
  if (!["asc", "desc"].includes(sort.direction)) return rows
  const direction = sort.direction === "asc" ? 1 : -1
  return [...rows].sort((a, b) => {
    const left = valueFor(a, sort.field)
    const right = valueFor(b, sort.field)
    // Missing/invalid values always go last, in both directions.
    if (left === null) return right === null ? 0 : 1
    if (right === null) return -1
    const comparison = typeof left === "number" ? left - right : collator.compare(left, right)
    return comparison * direction
  })
}
