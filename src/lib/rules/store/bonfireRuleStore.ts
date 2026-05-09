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

export function getBonfireRuleEntity(ruleId: string | undefined | null): BonfireRuleEntity | undefined {
  if (!ruleId) return undefined
  const normalizedId = toFoundryIdentifier(ruleId)
  return defaultBonfireEntityRuleStore.entities.find((entity) => entity.id === ruleId || entity.identifier === normalizedId)
}

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
    baseEntity(rule, 'class', {
      foundry: { itemType: 'class' },
      tags: ['class'],
    }),
    ...featuresByLevelToEntities(rule.featuresByLevel, 'classFeature', rule.name, rule.sourceUrl),
  ]
}

function subclassToEntities(rule: BonfireSubclassRule): BonfireRuleEntity[] {
  return [
    baseEntity(rule, 'subclass', {
      className: rule.className,
      foundry: { itemType: 'subclass' },
      tags: ['subclass'],
    }),
    ...featuresByLevelToEntities(rule.featuresByLevel, 'subclassFeature', rule.className, rule.sourceUrl, rule.name),
  ]
}

function raceToEntities(rule: BonfireRaceRule): BonfireRuleEntity[] {
  return [
    baseEntity(rule, 'race', {
      foundry: { itemType: 'feat' },
      tags: ['race'],
    }),
    ...rule.features.map((feature) => featureToEntity(feature, feature.kind ?? 'raceFeature', rule.sourceUrl, { raceName: rule.name, tags: ['raceFeature'] })),
  ]
}

function backgroundToEntities(rule: BonfireBackgroundRule): BonfireRuleEntity[] {
  return [
    baseEntity(rule, 'background', {
      foundry: { itemType: 'background' },
      tags: ['background'],
    }),
    ...rule.features.map((feature) => featureToEntity(feature, feature.kind ?? 'backgroundFeature', rule.sourceUrl, { backgroundName: rule.name, tags: ['backgroundFeature'] })),
  ]
}

function featToEntity(rule: BonfireFeatRule): BonfireRuleEntity {
  const kind: BonfireRuleKind = rule.category === 'origin' ? 'originFeat' : rule.category === 'racial' ? 'racialFeat' : 'feat'
  return baseEntity(rule, kind, {
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
    aliases: [rule.spellName, ...(rule.aliases ?? [])],
    kind: 'spellOverride',
    description: rule.baseDescription ?? rule.description ?? rule.descriptionText ?? rule.shortDescription ?? rule.foundryNotes,
    descriptionHtml: rule.descriptionHtml,
    descriptionText: rule.descriptionText ?? rule.baseDescription ?? rule.description,
    shortDescription: rule.shortDescription ?? rule.foundryNotes,
    descriptionStatus: rule.descriptionStatus ?? inferLegacyDescriptionStatus(rule),
    descriptionSource: rule.descriptionSource ?? 'manual-review',
    needsReviewReasons: rule.needsReviewReasons ?? defaultNeedsReviewReasons(rule),
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
  const inferredStatus = feature.descriptionStatus ?? inferLegacyDescriptionStatus(feature)
  const fullDescriptionText = inferredStatus === 'complete' ? (feature.descriptionText ?? feature.description) : undefined
  return {
    id: feature.id,
    identifier: toFoundryIdentifier(feature.id || feature.name),
    name: feature.name,
    aliases: feature.aliases ?? [],
    kind,
    description: fullDescriptionText ?? feature.shortDescription ?? feature.description,
    descriptionHtml: inferredStatus === 'complete' ? feature.descriptionHtml : undefined,
    descriptionText: fullDescriptionText,
    shortDescription: feature.shortDescription ?? (inferredStatus === 'complete' ? undefined : feature.description),
    descriptionStatus: inferredStatus,
    descriptionSource: feature.descriptionSource ?? 'manual-review',
    needsReviewReasons: feature.needsReviewReasons ?? defaultNeedsReviewReasons(feature),
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
  rule: {
    id: string
    name: string
    aliases?: string[]
    sourceUrl?: string
    description?: string
    descriptionHtml?: string
    descriptionText?: string
    shortDescription?: string
    descriptionStatus?: BonfireRuleEntity['descriptionStatus']
    descriptionSource?: BonfireRuleEntity['descriptionSource']
    needsReviewReasons?: string[]
  },
  kind: BonfireRuleKind,
  extra: Partial<BonfireRuleEntity> = {},
): BonfireRuleEntity {
  const inferredStatus = rule.descriptionStatus ?? inferLegacyDescriptionStatus(rule)
  const fullDescriptionText = inferredStatus === 'complete' ? (rule.descriptionText ?? rule.description) : undefined
  return {
    id: rule.id,
    identifier: toFoundryIdentifier(rule.id || rule.name),
    name: rule.name,
    aliases: rule.aliases ?? [],
    kind,
    sourceUrl: rule.sourceUrl,
    sourceName: 'Bonfire local seed',
    seedLocal: true,
    description: fullDescriptionText ?? rule.shortDescription ?? rule.description,
    descriptionHtml: inferredStatus === 'complete' ? rule.descriptionHtml : undefined,
    descriptionText: fullDescriptionText,
    shortDescription: rule.shortDescription ?? (inferredStatus === 'complete' ? undefined : rule.description),
    descriptionStatus: inferredStatus,
    descriptionSource: rule.descriptionSource ?? 'manual-review',
    needsReviewReasons: rule.needsReviewReasons ?? defaultNeedsReviewReasons(rule),
    ...extra,
  }
}

function inferLegacyDescriptionStatus(rule: {
  description?: string
  descriptionText?: string
  shortDescription?: string
  descriptionSource?: BonfireRuleEntity['descriptionSource']
}): NonNullable<BonfireRuleEntity['descriptionStatus']> {
  if (rule.descriptionSource === 'card-summary') return 'summary-only'
  if (rule.descriptionText?.trim()) return 'complete'
  if (rule.description?.trim() && rule.descriptionSource && rule.descriptionSource !== 'manual-review') return 'complete'
  if (rule.shortDescription?.trim()) return 'needs-review'
  if (rule.description?.trim()) return 'needs-review'
  return 'missing'
}

function defaultNeedsReviewReasons(rule: {
  description?: string
  shortDescription?: string
  descriptionStatus?: BonfireRuleEntity['descriptionStatus']
  descriptionSource?: BonfireRuleEntity['descriptionSource']
}): string[] | undefined {
  const status = rule.descriptionStatus ?? inferLegacyDescriptionStatus(rule)
  if (status === 'complete') return undefined
  if (status === 'summary-only') return ['summary-card-used-no-full-description', 'missing-full-rule-page']
  if (status === 'needs-review' && rule.descriptionSource === 'manual-review') return ['manual-description-not-source-verified']
  if (status === 'fallback') return ['fallback-description']
  if (status === 'missing') return ['missing-full-rule-page']
  return ['description-needs-review']
}
