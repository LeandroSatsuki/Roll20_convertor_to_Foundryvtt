export function toFoundryIdentifier(input: unknown, fallback = 'item'): string {
  const raw = String(input ?? '').trim()

  const withoutAccents = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  const slug = withoutAccents
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '')

  return slug || fallback
}

export function makeUniqueFoundryIdentifier(input: unknown, used: Set<string>, fallback = 'item'): string {
  const base = toFoundryIdentifier(input, fallback)
  let candidate = base
  let index = 2

  while (used.has(candidate)) {
    candidate = `${base}-${index}`
    index += 1
  }

  used.add(candidate)
  return candidate
}

export function isValidFoundryIdentifier(identifier: unknown): boolean {
  return typeof identifier === 'string' && /^[a-z0-9_-]+$/.test(identifier)
}
