import { foundryId } from '../foundry/ids'
import { toFoundryIdentifier } from '../foundry/identifiers'
import type { FoundryLibraryEntry, FoundryLibraryQuality } from './foundryReferenceLibraryTypes'
import { aliasesForFoundryLibraryName, normalizeFoundryLibraryName, normalizeFoundryLibraryNameKeepingParentheses } from './foundryLibraryAliases'

export const acceptedFoundryLibraryItemTypes = new Set(['spell', 'class', 'subclass', 'feat', 'weapon', 'equipment', 'consumable', 'loot', 'tool', 'background', 'race'])

export function indexFoundryActorItems(actorJson: unknown, sourceFileName: string): { actorName: string; entries: FoundryLibraryEntry[]; itemCount: number; rejectedItemCount: number } {
  const actor = unwrapFoundryActor(actorJson)
  const actorName = typeof actor.name === 'string' && actor.name.trim() ? actor.name : sourceFileName
  const sourceActorId = typeof actor._id === 'string' ? actor._id : undefined
  const items = Array.isArray(actor.items) ? actor.items : []
  const entries: FoundryLibraryEntry[] = []

  for (const item of items) {
    const record = asRecord(item)
    const name = typeof record.name === 'string' ? record.name.trim() : ''
    const type = typeof record.type === 'string' ? record.type : ''
    if (!name || !acceptedFoundryLibraryItemTypes.has(type)) continue
    const system = asRecord(record.system)
    const flags = asRecord(record.flags)
    const plutonium = extractPlutonium(flags)
    const dnd5e = asRecord(flags.dnd5e)
    const source = asRecord(system.source)
    const spell = type === 'spell' ? extractSpell(system) : undefined
    const itemId = typeof record._id === 'string' ? record._id : foundryId()
    const identifier = typeof system.identifier === 'string' && system.identifier.trim() ? system.identifier : toFoundryIdentifier(name)

    entries.push({
      libraryId: `lib-${foundryId(12)}`,
      sourceActorName: actorName,
      sourceFileName,
      sourceActorId,
      item,
      itemId,
      name,
      normalizedName: normalizeFoundryLibraryNameKeepingParentheses(name),
      normalizedNameWithoutParentheses: normalizeFoundryLibraryName(name),
      type,
      identifier,
      aliases: aliasesForFoundryLibraryName(name),
      plutonium,
      dnd5e: typeof dnd5e.sourceId === 'string' ? { sourceId: dnd5e.sourceId } : undefined,
      source: {
        book: stringValue(source.book),
        custom: stringValue(source.custom),
        rules: stringValue(source.rules),
        page: stringValue(source.page),
      },
      spell,
      quality: extractQuality(record, system, flags),
    })
  }

  return { actorName, entries, itemCount: items.length, rejectedItemCount: items.length - entries.length }
}

function extractQuality(item: Record<string, unknown>, system: Record<string, unknown>, flags: Record<string, unknown>): FoundryLibraryQuality {
  const activities = system.activities
  const midiProperties = system.properties ?? system.midiProperties
  const description = asRecord(system.description)
  const stats = asRecord(item._stats)
  const uses = system.uses
  return {
    hasActivities: isNonEmptyCollection(activities),
    hasEffects: Array.isArray(item.effects) && item.effects.length > 0,
    hasMidiProperties: isNonEmptyCollection(midiProperties),
    hasPlutoniumFlags: Boolean(flags.plutonium),
    hasCompendiumSource: typeof stats.compendiumSource === 'string' && stats.compendiumSource.length > 0,
    hasDescription: typeof description.value === 'string' && description.value.trim().length > 0,
    hasUses: isNonEmptyCollection(uses),
    hasDamageOrHealing: hasDamageOrHealing(system),
  }
}

function extractPlutonium(flags: Record<string, unknown>): FoundryLibraryEntry['plutonium'] | undefined {
  const plutonium = asRecord(flags.plutonium)
  if (!Object.keys(plutonium).length) return undefined
  return {
    page: stringValue(plutonium.page),
    source: stringValue(plutonium.source),
    hash: stringValue(plutonium.hash),
    propDroppable: stringValue(plutonium.propDroppable),
    spellClassNames: Array.isArray(plutonium.spellClassNames) ? plutonium.spellClassNames.filter((value): value is string => typeof value === 'string') : undefined,
  }
}

function extractSpell(system: Record<string, unknown>): FoundryLibraryEntry['spell'] {
  return {
    level: typeof system.level === 'number' ? system.level : undefined,
    school: stringValue(system.school),
    sourceClass: stringValue(system.sourceClass),
    prepared: typeof system.prepared === 'number' ? system.prepared : undefined,
  }
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

export function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined
}

function isNonEmptyCollection(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0
  if (value && typeof value === 'object') return Object.keys(value).length > 0
  return false
}

function unwrapFoundryActor(value: unknown): Record<string, unknown> {
  const direct = asRecord(value)
  if (Array.isArray(direct.items)) return direct
  for (const key of ['actor', 'data', 'document', 'export']) {
    const nested = asRecord(direct[key])
    if (Array.isArray(nested.items)) return nested
  }
  return direct
}

function hasDamageOrHealing(system: Record<string, unknown>): boolean {
  if (typeof system.damage === 'string' && system.damage.trim()) return true
  if (isNonEmptyCollection(system.damage) || isNonEmptyCollection(system.healing)) return true
  const activities = asRecord(system.activities)
  return Object.values(activities).some((activity) => {
    const record = asRecord(activity)
    return isNonEmptyCollection(record.damage) || isNonEmptyCollection(record.healing) || record.type === 'damage' || record.type === 'heal'
  })
}
