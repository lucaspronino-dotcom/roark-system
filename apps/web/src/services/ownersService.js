import { get, patch, post, remove } from "@/services/apiClient"

function getOwners() {
  return get("/owners")
}

function createOwner(owner) {
  return post("/owners", owner)
}

function updateOwner(id, owner) {
  return patch(`/owners/${id}`, owner)
}

function deleteOwner(id) {
  return remove(`/owners/${id}`)
}

export { createOwner, deleteOwner, getOwners, updateOwner }
