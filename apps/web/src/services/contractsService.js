const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000"

async function getContracts() {
  const response = await fetch(`${API_BASE_URL}/contracts`)

  if (!response.ok) {
    throw new Error("Could not fetch contracts")
  }

  return response.json()
}

export { getContracts }
