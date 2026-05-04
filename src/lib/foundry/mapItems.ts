import type { NormalizedCharacter, NormalizedEquipment, NormalizedFeature, NormalizedResource } from '../normalize/normalizedCharacterTypes'
import type { FoundryItem } from './foundryTypes'
import { foundryId } from './ids'
import { makeUniqueFoundryIdentifier } from './identifiers'
import { escapeHtml, itemStats, mapWeaponAttack } from './mapWeapons'
import { resolveFeature } from '../rules/featureResolver'
import { defaultBonfireRuleStore } from '../rules/bonfireRuleStore'
import { resolveWeaponOrEquipment } from '../rules/weaponResolver'

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
      mapTextItem(
        character.identity.background.value,
        'background',
        'Antecedente extraido do PDF.',
        'background',
        nextIdentifier(character.identity.background.value, usedItemIdentifiers, 'background'),
      ),
    )
  }

  if (character.identity.race.value) {
    items.push(
      mapTextItem(
        character.identity.race.value,
        'feat',
        'Raca extraida do PDF; revisar tipo species/race.',
        'race',
        nextIdentifier(character.identity.race.value, usedItemIdentifiers, 'race'),
      ),
    )
  }

  character.features.forEach((feature) => items.push(mapFeatureItem(feature, nextIdentifier(feature.name.value, usedItemIdentifiers, 'feat'), context)))
  character.resources.filter((resource) => resource.shouldBecomeItem).forEach((resource) => items.push(mapResourceItem(resource, nextIdentifier(resource.label.value, usedItemIdentifiers, 'resource'), context)))
  character.attacks.filter((attack) => attack.category === 'weapon').forEach((attack) => items.push(mapWeaponAttack(attack, nextIdentifier(attack.name.value, usedItemIdentifiers, 'weapon'))))
  character.equipment
    ?.filter((item) => item.category !== 'weapon')
    .forEach((item) => items.push(mapEquipmentItem(item, nextIdentifier(item.name.value, usedItemIdentifiers, item.category === 'consumable' ? 'consumable' : 'equipment'))))
  character.attacks
    .filter((attack) => attack.category === 'healing')
    .forEach((attack) =>
      items.push(
        mapTextItem(
          attack.name.value,
          'feat',
          `Recurso/acao extraido da tabela de ataques. Formula: ${attack.damageFormula.value ?? 'nao encontrada'}.`,
          'action',
          nextIdentifier(attack.name.value, usedItemIdentifiers, 'action'),
          attack.raw,
        ),
      ),
    )

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

function mapFeatureItem(feature: NormalizedFeature, identifier: string, context: { className?: string; level?: number; subclass?: string; race?: string; background?: string }): FoundryItem {
  const resolution = resolveFeature(
    feature.raw || feature.name.value,
    { ...context, section: feature.sourceType },
    defaultBonfireRuleStore,
  )
  const max = resolution.uses?.max
  const usesMax = typeof max === 'number' ? max : feature.uses?.max.value
  const featureUses = feature.uses
  const spent = usesMax && featureUses?.value.value !== null ? Math.max(usesMax - (featureUses?.value.value ?? usesMax), 0) : 0
  return {
    _id: foundryId(),
    name: resolution.confidence === 'low' ? feature.name.value : resolution.resolvedName,
    type: 'feat',
    img: resolution.kind === 'spellcasting' ? 'icons/svg/book.svg' : 'icons/svg/item-bag.svg',
    system: {
      identifier,
      description: { value: `<p>${escapeHtml(resolution.description || feature.description.value || feature.raw)}</p>`, chat: '' },
      source: { rules: '2024', book: 'Bonfire Tales', page: '', license: '' },
      uses: usesMax
        ? {
            spent,
            max: usesMax,
            recovery: [{ period: resolution.uses?.recovery === 'sr-lr' ? 'sr' : (resolution.uses?.recovery ?? 'unknown'), type: 'recoverAll' }],
          }
        : { spent: null, max: '', recovery: [] },
      activities: {},
      activation: { type: resolution.activation ?? feature.activation?.type ?? 'special', cost: null, condition: '' },
    },
    effects: [],
    folder: null,
    flags: {
      'roll20-to-foundry': {
        rawName: feature.raw || feature.name.value,
        resolvedKind: resolution.kind,
        confidence: resolution.confidence,
        source: 'bonfire-rule-store',
        sourceUrl: resolution.sourceUrl,
        warnings: resolution.warnings,
        ruleResolution: {
          rawName: feature.raw || feature.name.value,
          resolvedName: resolution.resolvedName,
          kind: resolution.kind,
          confidence: resolution.confidence,
          score: resolution.score ?? 0,
          ruleId: resolution.ruleId,
          sourceUrl: resolution.sourceUrl,
          candidates: resolution.candidates ?? [],
          manuallyResolved: resolution.manuallyResolved ?? false,
        },
      },
    },
    _stats: itemStats(),
  }
}

function mapResourceItem(resource: NormalizedResource, identifier: string, context: { className?: string; level?: number; subclass?: string; race?: string; background?: string }): FoundryItem {
  const max = resource.max.value
  const value = resource.value.value
  const spent = max !== null && value !== null ? Math.max(max - value, 0) : null
  const resolution = resolveFeature(resource.label.value, { ...context, section: 'action' }, defaultBonfireRuleStore)
  return {
    _id: foundryId(),
    name: resource.label.value,
    type: 'feat',
    img: 'icons/svg/aura.svg',
    system: {
      identifier,
      description: { value: `<p>${escapeHtml(resource.raw)}</p>`, chat: '' },
      source: { rules: '2024', book: 'Roll20 PDF', page: '', license: '' },
      uses: {
        spent,
        max: max ?? '',
        recovery: [{ period: resource.recovery.value === 'unknown' ? 'lr' : resource.recovery.value, type: 'recoverAll' }],
      },
      activities: {},
      activation: { type: inferActivation(resource.label.value), cost: null, condition: '' },
    },
    effects: [],
    folder: null,
    flags: {
      'roll20-to-foundry': {
        source: 'roll20-pdf',
        confidence: resource.value.confidence,
        raw: resource.raw,
        ruleResolution: {
          rawName: resource.label.value,
          resolvedName: resolution.resolvedName,
          kind: resolution.kind,
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

function mapTextItem(name: string, type: string, description: string, sourceType: string, identifier: string, raw = ''): FoundryItem {
  const resolution = resolveFeature(name, { section: sourceType }, defaultBonfireRuleStore)
  return {
    _id: foundryId(),
    name,
    type,
    img: type === 'background' ? 'icons/svg/book.svg' : 'icons/svg/item-bag.svg',
    system: {
      identifier,
      description: { value: `<p>${escapeHtml(description)}</p>`, chat: '' },
      source: { rules: '2024', book: 'Roll20 PDF', page: '', license: '' },
      uses: { spent: null, max: '', recovery: [] },
      activities: {},
    },
    effects: [],
    folder: null,
    flags: {
      'roll20-to-foundry': {
        source: 'roll20-pdf',
        confidence: resolution.confidence,
        sourceType,
        raw,
        ruleResolution: {
          rawName: name,
          resolvedName: resolution.resolvedName,
          kind: sourceType,
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

function mapEquipmentItem(item: NormalizedEquipment, identifier: string): FoundryItem {
  const rule = resolveWeaponOrEquipment(item.name.value)
  const itemType = item.category === 'consumable' ? 'consumable' : 'equipment'
  const resolvedKind = rule?.category === 'armor' || rule?.category === 'shield' ? 'armor' : rule?.category === 'consumable' ? 'consumable' : rule ? 'equipment' : item.category
  return {
    _id: foundryId(),
    name: item.name.value,
    type: itemType,
    img: item.category === 'armor' ? 'icons/equipment/chest/breastplate-layered-steel.webp' : item.category === 'consumable' ? 'icons/consumables/potions/potion-bottle-red.webp' : 'icons/svg/item-bag.svg',
    system: {
      identifier,
      description: { value: `<p>${escapeHtml(rule?.properties.join(', ') || item.raw)}</p>`, chat: '' },
      source: { rules: '2024', book: 'Bonfire Tales / Sheet', page: '', license: '' },
      quantity: item.quantity.value,
      equipped: /shield|scale mail/i.test(item.name.value),
      activities: {},
    },
    effects: [],
    folder: null,
    flags: {
      'roll20-to-foundry': {
        rawName: item.raw,
        resolvedKind,
        confidence: item.name.confidence,
        source: 'bonfire-xlsx',
        sourceUrl: rule?.sourceUrl,
        warnings: rule ? [] : ['Equipamento exportado com estrutura genérica.'],
        ruleResolution: {
          rawName: item.raw || item.name.value,
          resolvedName: rule?.name ?? item.name.value,
          kind: resolvedKind,
          confidence: rule ? 'high' : 'low',
          score: rule ? 100 : 0,
          ruleId: rule?.id,
          sourceUrl: rule?.sourceUrl,
          candidates: rule ? [{ ruleId: rule.id, name: rule.name, kind: resolvedKind, score: 100, confidence: 'high' }] : [],
          manuallyResolved: false,
        },
      },
    },
    _stats: itemStats(),
  }
}

function inferActivation(label: string): string {
  if (/Retomar F[oô]lego/i.test(label)) return 'bonus'
  if (/Supersti[cç][aã]o|Legado/i.test(label)) return 'reaction'
  if (/Surto/i.test(label)) return 'special'
  return 'special'
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
