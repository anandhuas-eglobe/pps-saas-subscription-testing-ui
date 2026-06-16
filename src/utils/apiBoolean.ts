export function parseApiBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') {
    return value
  }

  if (value === 1 || value === '1') {
    return true
  }

  if (value === 0 || value === '0') {
    return false
  }

  if (value === 'true') {
    return true
  }

  if (value === 'false') {
    return false
  }

  return null
}

export function requireApiBoolean(value: unknown, fieldName: string): boolean {
  const parsed = parseApiBoolean(value)
  if (parsed === null) {
    throw new Error(`${fieldName} must be a boolean value`)
  }

  return parsed
}

export function resolveApiBoolean(value: unknown, fallback = false): boolean {
  return parseApiBoolean(value) ?? fallback
}
