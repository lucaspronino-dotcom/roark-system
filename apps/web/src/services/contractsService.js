import { get, patch, post, remove } from "@/services/apiClient"

function getContracts() {
  return get("/contracts")
}

function createContract(contract) {
  return post("/contracts", contract)
}

function updateContract(id, contract) {
  return patch(`/contracts/${id}`, contract)
}

function deleteContract(id) {
  return remove(`/contracts/${id}`)
}

export { createContract, deleteContract, getContracts, updateContract }
