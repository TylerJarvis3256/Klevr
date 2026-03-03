/**
 * Validate that a string looks like a valid CUID.
 * Prevents wasting DB queries on obviously invalid IDs.
 */
export function isValidId(id: string): boolean {
  return typeof id === 'string' && id.length > 0 && id.length <= 30 && /^[a-z0-9]+$/.test(id)
}

/**
 * Parse a string as a positive integer with bounds.
 * Returns the default value if parsing fails or the value is out of bounds.
 */
export function parsePositiveInt(
  value: string | null | undefined,
  defaultValue: number,
  max: number = Number.MAX_SAFE_INTEGER
): number {
  if (!value) return defaultValue
  const parsed = parseInt(value, 10)
  if (isNaN(parsed) || parsed < 1) return defaultValue
  return Math.min(parsed, max)
}
