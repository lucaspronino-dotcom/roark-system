// Use the same status as the table badge, without changing the contract itself.
export function filterContracts(contracts, { search = "", showExpired = true } = {}) {
  const query = search.toLowerCase()
  return contracts.filter(contract =>
    (showExpired || contract.status !== "Vencido") &&
    [contract.folder, contract.end, contract.address, contract.status, contract.tenant, contract.owner]
      .join(" ").toLowerCase().includes(query),
  )
}
