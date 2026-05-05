import type { NormalizedCharacter, NormalizedEquipment } from '../normalize/normalizedCharacterTypes'
import type { FoundryItem } from './foundryTypes'
import { foundryId } from './ids'
import { makeUniqueFoundryIdentifier } from './identifiers'
import { itemStats } from './mapWeapons'
import { resolveFeature } from '../rules/featureResolver'
import { defaultBonfireRuleStore } from '../rules/bonfireRuleStore'
import { buildArmorItem, buildConsumableItem, buildEquipmentItem, buildFeatItem, buildGenericItem, buildSpellItem, buildWeaponItem } from './items'

export function mapItems(character: NormalizedCharacter): FoundryItem[] {
  const usedItemIdentifiers = new Set<string>()
  const items: FoundryItem[] = []
  const mainClass = character.identity.classes[0]
  const context = {
    className: mainClass?.name,
    level: mainClass?.level,
    subclass: mainClass?.subclass,
    race: character.identity.race.value,
    background: character.identity.background.value,
  }

  if (mainClass) {
    items.push(mapClassItem(mainClass.name, mainClass.level, nextIdentifier(mainClass.name, usedItemIdentifiers, 'class')))
  }

  if (character.identity.background.value) {
    items.push(
      buildGenericItem({
        name: character.identity.background.value,
        type: 'background',
        img: 'icons/svg/book.svg',
        identifier: nextIdentifier(character.identity.background.value, usedItemIdentifiers, 'background'),
        description: 'Antecedente extraido do PDF.',
        sourceBook: 'Roll20 PDF',
        converterFlags: {
          source: 'roll20-pdf',
          confidence: character.identity.background.confidence,
          sourceType: 'background',
          raw: character.identity.background.raw ?? character.identity.background.value,
          ruleResolution: toSimpleRuleResolution(character.identity.background.value, 'background'),
        },
        automation: { requestedLevel: 'none' },
      }),
    )
  }

  if (character.identity.race.value) {
    items.push(
      buildGenericItem({
        name: character.identity.race.value,
        type: 'feat',
        img: 'icons/svg/item-bag.svg',
        identifier: nextIdentifier(character.identity.race.value, usedItemIdentifiers, 'race'),
        description: 'Raca extraida do PDF; revisar tipo species/race.',
        sourceBook: 'Roll20 PDF',
        converterFlags: {
          source: 'roll20-pdf',
          confidence: character.identity.race.confidence,
          sourceType: 'race',
          raw: character.identity.race.raw ?? character.identity.race.value,
          ruleResolution: toSimpleRuleResolution(character.identity.race.value, 'race'),
        },
        automation: { requestedLevel: 'none' },
      }),
    )
  }

  character.features.forEach((feature) =>
    items.push(
      buildFeatItem({
        feature,
        identifier: nextIdentifier(feature.name.value, usedItemIdentifiers, 'feat'),
        context,
        spellcastingAbility: character.spells.ability.value,
      }),
    ),
  )
  character.resources
    .filter((resource) => resource.shouldBecomeItem)
    .forEach((resource) =>
      items.push(
        buildFeatItem({
          resource,
          identifier: nextIdentifier(resource.label.value, usedItemIdentifiers, 'resource'),
          context,
          spellcastingAbility: character.spells.ability.value,
        }),
      ),
    )
  character.attacks.filter((attack) => attack.category === 'weapon').forEach((attack) => items.push(buildWeaponItem(attack, nextIdentifier(attack.name.value, usedItemIdentifiers, 'weapon'))))
  character.equipment
    ?.filter((item) => item.category !== 'weapon')
    .forEach((item) => items.push(mapEquipmentByCategory(item, nextIdentifier(item.name.value, usedItemIdentifiers, item.category === 'consumable' ? 'consumable' : 'equipment'))))
  character.attacks
    .filter((attack) => attack.category === 'healing')
    .forEach((attack) =>
      items.push(
        buildGenericItem({
          name: attack.name.value,
          type: 'feat',
          img: 'icons/svg/item-bag.svg',
          identifier: nextIdentifier(attack.name.value, usedItemIdentifiers, 'action'),
          description: `Recurso/acao extraido da tabela de ataques. Formula: ${attack.damageFormula.value ?? 'nao encontrada'}.`,
          sourceBook: 'Roll20 PDF',
          converterFlags: {
            source: 'roll20-pdf',
            confidence: attack.name.confidence,
            sourceType: 'action',
            raw: attack.raw,
            ruleResolution: toSimpleRuleResolution(attack.name.value, 'action'),
          },
          automation: { requestedLevel: 'none' },
        }),
      ),
    )
  allSpells(character).forEach((spell) => items.push(buildSpellItem(spell)))

  return dedupeItems(items)
}

function nextIdentifier(name: unknown, usedItemIdentifiers: Set<string>, fallback: string): string {
  return makeUniqueFoundryIdentifier(name, usedItemIdentifiers, fallback)
}

function mapClassItem(name: string, level: number, identifier: string): FoundryItem {
  const resolution = resolveFeature(name, { section: 'class', className: name, level }, defaultBonfireRuleStore)
  return {
    _id: foundryId(),
    name,
    type: 'class',
    img: 'icons/svg/book.svg',
    system: {
      identifier,
      description: { value: '<p>Classe extraida da ficha Roll20 PDF.</p>', chat: '' },
      levels: level,
      hitDice: 'd10',
      source: { rules: '2024', book: 'Roll20 PDF', page: '', license: '' },
      advancement: [],
    },
    effects: [],
    folder: null,
    flags: {
      'roll20-to-foundry': {
        source: 'roll20-pdf',
        confidence: resolution.confidence,
        raw: `${name} ${level}`,
        ruleResolution: {
          rawName: name,
          resolvedName: resolution.resolvedName,
          kind: 'class',
          confidence: resolution.confidence,
          score: resolution.score ?? 0,
          ruleId: resolution.ruleId,
          sourceUrl: resolution.sourceUrl,
          candidates: resolution.candidates ?? [],
          manuallyResolved: false,
        },
      },
    },
    _stats: itemStats(),
  }
}

function dedupeItems(items: FoundryItem[]): FoundryItem[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = `${item.type}:${item.name.toLowerCase()}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function mapEquipmentByCategory(item: NormalizedEquipment, identifier: string): FoundryItem {
  if (item.category === 'armor') return buildArmorItem(item, identifier)
  if (item.category === 'consumable') return buildConsumableItem(item, identifier)
  return buildEquipmentItem(item, identifier)
}

function allSpells(character: NormalizedCharacter) {
  return [...character.spells.cantrips, ...Object.values(character.spells.levels).flatMap((level) => level.spells)]
}

function toSimpleRuleResolution(name: string, kind: string): Record<string, unknown> {
  const resolution = resolveFeature(name, { section: kind }, defaultBonfireRuleStore)
  return {
    rawName: name,
    resolvedName: resolution.resolvedName,
    kind,
    confidence: resolution.confidence,
    score: resolution.score ?? 0,
    ruleId: resolution.ruleId,
    sourceUrl: resolution.sourceUrl,
    candidates: resolution.candidates ?? [],
    manuallyResolved: false,
  }
}
