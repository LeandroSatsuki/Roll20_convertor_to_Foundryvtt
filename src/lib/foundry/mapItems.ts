import type { NormalizedCharacter, NormalizedEquipment } from '../normalize/normalizedCharacterTypes'
import type { FoundryItem } from './foundryTypes'
import { makeUniqueFoundryIdentifier } from './identifiers'
import { resolveFeature } from '../rules/featureResolver'
import { defaultBonfireRuleStore } from '../rules/bonfireRuleStore'
import { normalizeRuleLookupKey } from '../rules/store/bonfireAliases'
import { buildArmorItem, buildConsumableItem, buildEquipmentItem, buildFeatItem, buildGenericItem, buildSpellItem, buildWeaponItem } from './items'
import { buildRuleDescriptionMeta } from './items/ruleDescription'
import { getClassSpellcastingRule } from '../spellcasting/classSpellcastingRules'

export function mapItems(character: NormalizedCharacter): FoundryItem[] {
  const usedItemIdentifiers = new Set<string>()
  const items: FoundryItem[] = []
  const mainClass = character.identity.classes[0]
  const sourceLabel = character.source.type === 'bonfire-xlsx' ? 'bonfire-xlsx' : 'roll20-pdf'
  const sourceBook = character.source.type === 'bonfire-xlsx' ? 'Bonfire Tales / Sheet' : 'Roll20 PDF'
  const classFallbackText = character.source.type === 'bonfire-xlsx' ? 'Classe extraida da ficha Bonfire XLSX.' : 'Classe extraida da ficha Roll20 PDF.'
  const backgroundFallbackText = character.source.type === 'bonfire-xlsx' ? 'Antecedente extraido da ficha Bonfire XLSX.' : 'Antecedente extraido do PDF.'
  const raceFallbackText = character.source.type === 'bonfire-xlsx' ? 'Raca extraida da ficha Bonfire XLSX; revisar tipo species/race.' : 'Raca extraida do PDF; revisar tipo species/race.'
  const context = {
    className: mainClass?.name,
    level: mainClass?.level,
    subclass: mainClass?.subclass,
    race: character.identity.race.value,
    background: character.identity.background.value,
  }

  if (mainClass) {
    items.push(mapClassItem(mainClass.name, mainClass.level, nextIdentifier(mainClass.name, usedItemIdentifiers, 'class'), sourceLabel, sourceBook, classFallbackText))
  }

  if (character.identity.background.value) {
    const resolution = toSimpleRuleResolution(character.identity.background.value, 'background')
    const descriptionMeta = buildRuleDescriptionMeta({
      itemName: character.identity.background.value,
      itemKind: 'background',
      ruleId: resolution.ruleId as string | undefined,
      fallbackText: backgroundFallbackText,
      sourceUrl: resolution.sourceUrl as string | undefined,
      sourceName: 'Bonfire Tales',
    })
    items.push(
      buildGenericItem({
        name: character.identity.background.value,
        type: 'background',
        img: 'icons/svg/book.svg',
        identifier: nextIdentifier(character.identity.background.value, usedItemIdentifiers, 'background'),
        description: backgroundFallbackText,
        descriptionHtml: descriptionMeta.html,
        sourceBook,
        converterFlags: {
          source: sourceLabel,
          confidence: character.identity.background.confidence,
          sourceType: 'background',
          raw: character.identity.background.raw ?? character.identity.background.value,
          sourceUrl: descriptionMeta.sourceUrl,
          descriptionMeta: {
            status: descriptionMeta.status,
            sourceUrl: descriptionMeta.sourceUrl ?? null,
            sourceName: descriptionMeta.sourceName ?? null,
            warningCodes: descriptionMeta.warningCodes,
            warningMessages: descriptionMeta.warningMessages,
            overrideApplied: false,
          },
          ruleResolution: resolution,
        },
        automation: { requestedLevel: 'none' },
      }),
    )
  }

  if (character.identity.race.value) {
    const resolution = toSimpleRuleResolution(character.identity.race.value, 'race')
    const descriptionMeta = buildRuleDescriptionMeta({
      itemName: character.identity.race.value,
      itemKind: 'race',
      ruleId: resolution.ruleId as string | undefined,
      fallbackText: raceFallbackText,
      sourceUrl: resolution.sourceUrl as string | undefined,
      sourceName: 'Bonfire Tales',
    })
    items.push(
      buildGenericItem({
        name: character.identity.race.value,
        type: 'feat',
        img: 'icons/svg/item-bag.svg',
        identifier: nextIdentifier(character.identity.race.value, usedItemIdentifiers, 'race'),
        description: raceFallbackText,
        descriptionHtml: descriptionMeta.html,
        sourceBook,
        converterFlags: {
          source: sourceLabel,
          confidence: character.identity.race.confidence,
          sourceType: 'race',
          raw: character.identity.race.raw ?? character.identity.race.value,
          sourceUrl: descriptionMeta.sourceUrl,
          descriptionMeta: {
            status: descriptionMeta.status,
            sourceUrl: descriptionMeta.sourceUrl ?? null,
            sourceName: descriptionMeta.sourceName ?? null,
            warningCodes: descriptionMeta.warningCodes,
            warningMessages: descriptionMeta.warningMessages,
            overrideApplied: false,
          },
          ruleResolution: resolution,
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
          description: `Recurso/acao extraido da ficha Bonfire XLSX. Formula: ${attack.damageFormula.value ?? 'nao encontrada'}.`,
          sourceBook,
          converterFlags: {
            source: sourceLabel,
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

function mapClassItem(name: string, level: number, identifier: string, sourceLabel: string, sourceBook: string, fallbackText: string): FoundryItem {
  const resolution = resolveFeature(name, { section: 'class', className: name, level }, defaultBonfireRuleStore)
  const classKey = normalizeRuleLookupKey(name)
  const classRule = defaultBonfireRuleStore.classes.find((rule) => [rule.id, rule.name, ...rule.aliases].map(normalizeRuleLookupKey).includes(classKey))
  const fallbackRule = getClassSpellcastingRule(name)
  const hitDice = classRule?.hitDie ?? fallbackRule.hitDie ?? 'd8'
  const classUnknown = !classRule && fallbackRule.classKey === 'unknown'
  const warnings = [
    ...(classUnknown ? ['CLASS_RULE_UNKNOWN'] : []),
    ...(resolution.confidence === 'low' ? ['CLASS_RULE_FALLBACK_USED'] : []),
    ...(classUnknown ? ['CLASS_HIT_DIE_UNKNOWN'] : []),
  ]
  const descriptionMeta = buildRuleDescriptionMeta({
    itemName: name,
    itemKind: 'class',
    ruleId: resolution.ruleId,
    fallbackText,
    sourceUrl: resolution.sourceUrl,
    sourceName: 'Bonfire Tales',
  })
  return buildGenericItem({
    name,
    type: 'class',
    img: 'icons/svg/book.svg',
    identifier,
    description: fallbackText,
    descriptionHtml: descriptionMeta.html,
    sourceBook,
    converterFlags: {
      source: sourceLabel,
      confidence: resolution.confidence,
      raw: `${name} ${level}`,
      sourceUrl: descriptionMeta.sourceUrl,
      descriptionMeta: {
        status: descriptionMeta.status,
        sourceUrl: descriptionMeta.sourceUrl ?? null,
        sourceName: descriptionMeta.sourceName ?? null,
        warningCodes: descriptionMeta.warningCodes,
        warningMessages: descriptionMeta.warningMessages,
        overrideApplied: false,
      },
      warnings,
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
    system: {
      levels: level,
      hitDice,
      advancement: [],
    },
    automation: { requestedLevel: 'none' },
  })
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
