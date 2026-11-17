// Undefined in PATCH preserves the previous value; blank explicitly clears it.
export function normalizeOptionalDni(value: string | null | undefined) {
  return value === undefined ? undefined : value?.trim() || null
}
