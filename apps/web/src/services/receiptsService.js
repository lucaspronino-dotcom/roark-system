import { get, post, remove } from "@/services/apiClient"

function createReceipt(receipt) {
  return post("/receipts", receipt)
}

function getNextReceiptNumber() {
  return get("/receipts/next-number")
}

function getReceipts({ contractId, kind, personName } = {}) {
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

  const query = params.toString()

  return get(`/receipts${query ? `?${query}` : ""}`)
}

function deleteReceipt(id) {
  return remove(`/receipts/${id}`)
}

export { createReceipt, deleteReceipt, getNextReceiptNumber, getReceipts }
