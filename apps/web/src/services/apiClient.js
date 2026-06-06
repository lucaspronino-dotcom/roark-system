const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000"

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  })

  if (!response.ok) {
    const message = await readErrorMessage(response)
    throw new Error(message || "API request failed")
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
}

async function readErrorMessage(response) {
  const text = await response.text()

  try {
    const error = JSON.parse(text)

    return error.message ?? text
  } catch {
    return text
  }
}

function get(path) {
  return apiRequest(path)
}

function post(path, body) {
  return apiRequest(path, {
    body: JSON.stringify(body),
    method: "POST",
  })
}

function patch(path, body) {
  return apiRequest(path, {
    body: JSON.stringify(body),
    method: "PATCH",
  })
}

function remove(path) {
  return apiRequest(path, {
    method: "DELETE",
  })
}

export { get, patch, post, remove }
