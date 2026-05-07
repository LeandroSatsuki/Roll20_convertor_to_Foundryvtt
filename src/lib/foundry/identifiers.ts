import type { FoundryActor } from './foundryTypes'

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

export function ensureUniqueActorItemIdentifiers(actor: FoundryActor): FoundryActor {
  const originalCounts = new Map<string, number>()
  actor.items.forEach((item) => {
    const identifier = item.system?.identifier
    if (isValidFoundryIdentifier(identifier)) originalCounts.set(String(identifier), (originalCounts.get(String(identifier)) ?? 0) + 1)
  })

  const used = new Set<string>()
  const changes: Array<{ itemId: string; itemName: string; itemType: string; from: string | null; to: string; reason: string }> = []

  actor.items.forEach((item) => {
    item.system = item.system && typeof item.system === 'object' ? item.system : {}
    const original = isValidFoundryIdentifier(item.system.identifier) ? String(item.system.identifier) : null
    const duplicatedOriginal = original ? (originalCounts.get(original) ?? 0) > 1 : false
    const shouldPreserve = original !== null && !duplicatedOriginal && !used.has(original)
    const next = shouldPreserve ? original : nextIdentifierForItem(item, used)

    used.add(next)
    if (original === next) return

    item.system.identifier = next
    const reason = duplicatedOriginal ? 'duplicate' : original && used.has(original) ? 'collision' : 'invalid-or-missing'
    changes.push({ itemId: item._id, itemName: item.name, itemType: item.type, from: original, to: next, reason })
    const flags = ensureItemConverterFlags(item)
    const warnings = Array.isArray(flags.warnings) ? flags.warnings.map(String) : []
    flags.identifierDedup = { from: original, to: next, reason }
    flags.warnings = Array.from(new Set([...warnings, 'FOUNDRY_ITEM_IDENTIFIER_DEDUPED']))
  })

  if (changes.length) {
    const actorFlags = actor.flags as Record<string, unknown>
    const converterFlags = (actorFlags['roll20-to-foundry'] as Record<string, unknown> | undefined) ?? {}
    converterFlags.identifierDedupWarnings = changes
    actorFlags['roll20-to-foundry'] = converterFlags
    actor.flags = actorFlags
  }

  return actor
}

function nextIdentifierForItem(item: FoundryActor['items'][number], used: Set<string>): string {
  const typePrefix = toFoundryIdentifier(item.type || 'item', 'item')
  const nameSlug = toFoundryIdentifier(item.name, 'item')
  const base = toFoundryIdentifier(`${typePrefix}-${nameSlug}`, `${typePrefix}-item`)
  let candidate = base
  let index = 2
  while (used.has(candidate)) {
    candidate = `${base}-${index}`
    index += 1
  }
  return candidate
}

function ensureItemConverterFlags(item: FoundryActor['items'][number]): Record<string, unknown> {
  const flags = (item.flags && typeof item.flags === 'object' ? item.flags : {}) as Record<string, unknown>
  const converterFlags = (flags['roll20-to-foundry'] as Record<string, unknown> | undefined) ?? {}
  flags['roll20-to-foundry'] = converterFlags
  item.flags = flags
  return converterFlags
}
