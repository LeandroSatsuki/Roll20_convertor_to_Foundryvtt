import type { FoundryActor, FoundryItem } from '../foundry/foundryTypes'
import type { NormalizedCharacter } from '../normalize/normalizedCharacterTypes'
import type { FoundryReferenceLibrary } from '../foundry-library/foundryReferenceLibraryTypes'
import { calculateSpellSlots } from '../spellcasting/calculateSpellSlots'
import { inferSpellcastingAbility } from '../spellcasting/inferSpellcastingAbility'
import { hydrateClassItem } from './hydrateClassItem'
import { hydrateConsumableItem } from './hydrateConsumableItem'
import { hydrateEquipmentItem } from './hydrateEquipmentItem'
import { hydrateFeatItem } from './hydrateFeatItem'
import { hydrateSpellItem } from './hydrateSpellItem'
import { hydrateWeaponItem } from './hydrateWeaponItem'
import { attachHydrationReport, buildHydrationReport } from './hydrationAudit'

export function hydrateActorItems(actor: FoundryActor, character: NormalizedCharacter, library: FoundryReferenceLibrary | null | undefined): FoundryActor {
  applyCalculatedSpellSlots(actor, character)
  if (!library) return actor

  const mainClass = character.identity.classes[0]
  const context = {
    characterClass: mainClass?.name,
    characterLevel: mainClass?.level,
    spellcastingAbility: inferSpellcastingAbility(character),
  }

  actor.items = actor.items.map((item) => hydrateItem(item, library, context))
  const report = buildHydrationReport(actor.items)
  attachLibraryReport(actor, library)
  attachHydrationReport(actor, report)
  return actor
}

function hydrateItem(
  item: FoundryItem,
  library: FoundryReferenceLibrary,
  context: { characterClass?: string; characterLevel?: number; spellcastingAbility?: ReturnType<typeof inferSpellcastingAbility> },
): FoundryItem {
  if (item.type === 'spell') return hydrateSpellItem(item, library, context)
  if (item.type === 'class') return hydrateClassItem(item, library, context)
  if (item.type === 'weapon') return hydrateWeaponItem(item, library)
  if (item.type === 'consumable') return hydrateConsumableItem(item, library)
  if (['equipment', 'consumable', 'loot', 'tool'].includes(item.type)) return hydrateEquipmentItem(item, library)
  if (['feat', 'background', 'race', 'subclass'].includes(item.type)) return hydrateFeatItem(item, library, context)
  return item
}

function applyCalculatedSpellSlots(actor: FoundryActor, character: NormalizedCharacter) {
  const calculated = calculateSpellSlots(character)
  const currentSpells = ((actor.system.spells as Record<string, unknown> | undefined) ?? {}) as Record<string, unknown>
  for (let level = 1; level <= 9; level += 1) {
    currentSpells[`spell${level}`] = {
      ...(currentSpells[`spell${level}`] as Record<string, unknown> | undefined),
      value: calculated.levels[level - 1],
      override: null,
      bonuses: ((currentSpells[`spell${level}`] as Record<string, unknown> | undefined)?.bonuses as Record<string, unknown> | undefined) ?? { save: '', attack: '' },
    }
  }
  if (calculated.pact) currentSpells.pact = calculated.pact
  actor.system.spells = currentSpells
  const flags = actor.flags as Record<string, unknown>
  const converterFlags = (flags['roll20-to-foundry'] as Record<string, unknown> | undefined) ?? {}
  converterFlags.spellcastingProgression = removeUndefinedDeep(calculated)
  flags['roll20-to-foundry'] = converterFlags
  actor.flags = flags
}

function attachLibraryReport(actor: FoundryActor, library: FoundryReferenceLibrary) {
  const flags = actor.flags as Record<string, unknown>
  const converterFlags = (flags['roll20-to-foundry'] as Record<string, unknown> | undefined) ?? {}
  converterFlags.foundryReferenceLibraryReport = removeUndefinedDeep(library.report)
  flags['roll20-to-foundry'] = converterFlags
  actor.flags = flags
}

function removeUndefinedDeep<T>(value: T): T {
  if (!value || typeof value !== 'object') return value
  if (Array.isArray(value)) {
    for (let index = value.length - 1; index >= 0; index -= 1) {
      if (value[index] === undefined) value.splice(index, 1)
      else removeUndefinedDeep(value[index])
    }
    return value
  }
  const record = value as Record<string, unknown>
  for (const key of Object.keys(record)) {
    if (record[key] === undefined) delete record[key]
    else removeUndefinedDeep(record[key])
  }
  return value
}
