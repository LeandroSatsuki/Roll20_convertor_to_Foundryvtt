import { toFoundryIdentifier } from '../../foundry/identifiers'
import type {
  BonfireBackgroundRule,
  BonfireClassRule,
  BonfireFeatRule,
  BonfireRaceRule,
  BonfireRuleFeature,
  BonfireSpellOverrideRule,
  BonfireSubclassRule,
  BonfireWeaponRule,
} from '../bonfireTypes'
import { defaultBonfireRuleStore, type BonfireRuleStore as LegacyStore } from '../bonfireRuleStore'
import type { BonfireRuleEntity, BonfireRuleKind } from '../schema/bonfireEntityTypes'

export type BonfireEntityRuleStore = {
  entities: BonfireRuleEntity[]
}

export function createBonfireEntityRuleStore(store: LegacyStore = defaultBonfireRuleStore): BonfireEntityRuleStore {
  return { entities: legacyStoreToEntities(store) }
}

export const defaultBonfireEntityRuleStore = createBonfireEntityRuleStore(defaultBonfireRuleStore)

export function legacyStoreToEntities(store: LegacyStore): BonfireRuleEntity[] {
  return [
    ...store.classes.flatMap(classToEntities),
    ...store.subclasses.flatMap(subclassToEntities),
    ...store.races.flatMap(raceToEntities),
    ...store.backgrounds.flatMap(backgroundToEntities),
    ...store.feats.map(featToEntity),
    ...store.weapons.map(weaponToEntity),
    ...store.spellOverrides.map(spellOverrideToEntity),
  ]
}

function classToEntities(rule: BonfireClassRule): BonfireRuleEntity[] {
  return [
    baseEntity(rule, 'class', { description: `Classe Bonfire. Dado de vida ${rule.hitDie}.`, foundry: { itemType: 'class' }, tags: ['class'] }),
    ...featuresByLevelToEntities(rule.featuresByLevel, 'classFeature', rule.name, rule.sourceUrl),
  ]
}

function subclassToEntities(rule: BonfireSubclassRule): BonfireRuleEntity[] {
  return [
    baseEntity(rule, 'subclass', { description: `Subclasse de ${rule.className}.`, className: rule.className, foundry: { itemType: 'subclass' }, tags: ['subclass'] }),
    ...featuresByLevelToEntities(rule.featuresByLevel, 'subclassFeature', rule.className, rule.sourceUrl, rule.name),
  ]
}

function raceToEntities(rule: BonfireRaceRule): BonfireRuleEntity[] {
  return [
    baseEntity(rule, 'race', { description: `Raça Bonfire. Deslocamento ${rule.speed}.`, foundry: { itemType: 'feat' }, tags: ['race'] }),
    ...rule.features.map((feature) => featureToEntity(feature, feature.kind ?? 'raceFeature', rule.sourceUrl, { raceName: rule.name, tags: ['raceFeature'] })),
  ]
}

function backgroundToEntities(rule: BonfireBackgroundRule): BonfireRuleEntity[] {
  return [
    baseEntity(rule, 'background', { description: `Antecedente Bonfire.`, foundry: { itemType: 'background' }, tags: ['background'] }),
    ...rule.features.map((feature) => featureToEntity(feature, feature.kind ?? 'backgroundFeature', rule.sourceUrl, { backgroundName: rule.name, tags: ['backgroundFeature'] })),
  ]
}

function featToEntity(rule: BonfireFeatRule): BonfireRuleEntity {
  const kind: BonfireRuleKind = rule.category === 'origin' ? 'originFeat' : rule.category === 'racial' ? 'racialFeat' : 'feat'
  return baseEntity(rule, kind, {
    description: rule.effects.join('\n'),
    foundry: { itemType: 'feat', activationType: rule.activation, uses: rule.uses },
    tags: ['feat', rule.category],
  })
}

function weaponToEntity(rule: BonfireWeaponRule): BonfireRuleEntity {
  const kind: BonfireRuleKind =
    rule.category === 'armor' || rule.category === 'shield'
      ? 'armor'
      : rule.category === 'consumable'
        ? 'consumable'
        : rule.category === 'simple' || rule.category === 'martial'
          ? 'weapon'
          : 'equipment'
  return baseEntity(rule, kind, {
    description: rule.properties.join(', '),
    foundry: {
      itemType: kind === 'weapon' ? 'weapon' : kind === 'consumable' ? 'consumable' : 'equipment',
      damageFormula: rule.damage,
      damageType: rule.damageType,
    },
    tags: ['equipment', rule.category, ...rule.properties],
  })
}

function spellOverrideToEntity(rule: BonfireSpellOverrideRule): BonfireRuleEntity {
  return {
    id: rule.id,
    identifier: toFoundryIdentifier(rule.id),
    name: rule.spellName,
    aliases: [rule.spellName],
    kind: 'spellOverride',
    description: rule.description,
    shortDescription: rule.foundryNotes,
    sourceUrl: rule.sourceUrl,
    sourceName: 'Bonfire spell overrides',
    seedLocal: true,
    tags: ['spell', rule.status],
  }
}

function featuresByLevelToEntities(featuresByLevel: Record<string, BonfireRuleFeature[]>, defaultKind: BonfireRuleKind, className: string, sourceUrl?: string, subclassName?: string): BonfireRuleEntity[] {
  return Object.entries(featuresByLevel).flatMap(([levelText, features]) =>
    features.map((feature) =>
      featureToEntity(feature, feature.kind ?? defaultKind, sourceUrl, {
        className,
        subclassName,
        level: Number(levelText),
        tags: [defaultKind],
      }),
    ),
  )
}

function featureToEntity(feature: BonfireRuleFeature, kind: BonfireRuleKind, sourceUrl?: string, extra: Partial<BonfireRuleEntity> = {}): BonfireRuleEntity {
  return {
    id: feature.id,
    identifier: toFoundryIdentifier(feature.id || feature.name),
    name: feature.name,
    aliases: feature.aliases ?? [],
    kind,
    description: feature.description,
    sourceUrl: feature.sourceUrl ?? sourceUrl,
    sourceName: 'Bonfire local seed',
    seedLocal: true,
    foundry: {
      itemType: 'feat',
      activationType: feature.activation,
      uses: feature.uses,
    },
    ...extra,
    tags: Array.from(new Set([...(extra.tags ?? []), kind])),
  }
}

function baseEntity(
  rule: { id: string; name: string; aliases?: string[]; sourceUrl?: string },
  kind: BonfireRuleKind,
  extra: Partial<BonfireRuleEntity> = {},
): BonfireRuleEntity {
  return {
    id: rule.id,
    identifier: toFoundryIdentifier(rule.id || rule.name),
    name: rule.name,
    aliases: rule.aliases ?? [],
    kind,
    sourceUrl: rule.sourceUrl,
    sourceName: 'Bonfire local seed',
    seedLocal: true,
    ...extra,
  }
}
