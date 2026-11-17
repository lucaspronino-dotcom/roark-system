import { get, post, remove } from "@/services/apiClient"

function createReceipt(receipt) {
  return post("/receipts", receipt)
}

function getNextReceiptNumber() {
  return get("/receipts/next-number")
}

function getReceipts({ contractId, kind, personName, includeHistorical = false } = {}) {
  const params = new URLSearchParams()

  if (contractId) {
    params.set("contractId", contractId)
  }

  if (kind) {
    params.set("kind", kind)
  }

  if (personName) {
    params.set("personName", personName)
  }

  if (includeHistorical) params.set("includeHistorical", "true")

  const query = params.toString()

  return get(`/receipts${query ? `?${query}` : ""}`)
}

function deleteReceipt(id) {
  return remove(`/receipts/${id}`)
}

export { createReceipt, deleteReceipt, getNextReceiptNumber, getReceipts }

// Only the history view requests archived receipts; settlement consumers keep
// using getReceipts so source balances cannot become new debts or owner payments.
export function getPaymentHistory(filters) {
  return getReceipts({ ...filters, includeHistorical: true })
}
