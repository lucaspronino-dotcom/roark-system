import { get, patch, post, remove } from "@/services/apiClient"

function getProperties() {
  return get("/properties")
}

function getProperty(id) {
  return get(`/properties/${id}`)
}

function createProperty(property) {
  return post("/properties", property)
}

function updateProperty(id, property) {
  return patch(`/properties/${id}`, property)
}

function deleteProperty(id) {
  return remove(`/properties/${id}`)
}

export {
  createProperty,
  deleteProperty,
  getProperties,
  getProperty,
  updateProperty,
}
