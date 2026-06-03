import { get, patch, post, remove } from "@/services/apiClient"

function getTenants() {
  return get("/tenants")
}

function createTenant(tenant) {
  return post("/tenants", tenant)
}

function updateTenant(id, tenant) {
  return patch(`/tenants/${id}`, tenant)
}

function deleteTenant(id) {
  return remove(`/tenants/${id}`)
}

export { createTenant, deleteTenant, getTenants, updateTenant }
