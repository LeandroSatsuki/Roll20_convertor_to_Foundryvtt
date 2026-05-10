import { toFoundryIdentifier } from '../../foundry/identifiers'
import { isAllowedCompleteDescriptionSource } from '../descriptionSourcePolicy'
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
import generatedClasses from '../../../../data/bonfire/generated/classes.seed.json'
import generatedClassFeatures from '../../../../data/bonfire/generated/class-features.seed.json'
import generatedRaces from '../../../../data/bonfire/generated/races.seed.json'
import generatedRaceFeatures from '../../../../data/bonfire/generated/race-features.seed.json'
import generatedBackgrounds from '../../../../data/bonfire/generated/backgrounds.seed.json'
import generatedBackgroundFeatures from '../../../../data/bonfire/generated/background-features.seed.json'
import generatedFeats from '../../../../data/bonfire/generated/feats.seed.json'
import generatedSubclasses from '../../../../data/bonfire/generated/subclasses.seed.json'
import generatedSubclassFeatures from '../../../../data/bonfire/generated/subclass-features.seed.json'
import generatedSpellOverrides from '../../../../data/bonfire/generated/spell-overrides.seed.json'
import { normalizeRuleLookupKey } from './bonfireAliases'

export type BonfireEntityRuleStore = {
  entities: BonfireRuleEntity[]
}

export function createBonfireEntityRuleStore(store: LegacyStore = defaultBonfireRuleStore): BonfireEntityRuleStore {
  const legacyEntities = legacyStoreToEntities(store)
  if (store !== defaultBonfireRuleStore) return { entities: legacyEntities }
  return { entities: dedupeEntities([...legacyEntities, ...generatedBonfireEntities]) }
}

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

const generatedBonfireEntities: BonfireRuleEntity[] = dedupeEntities([
  ...normalizeGeneratedEntities(generatedClasses),
  ...normalizeGeneratedEntities(generatedClassFeatures),
  ...normalizeGeneratedEntities(generatedRaces),
  ...normalizeGeneratedEntities(generatedRaceFeatures),
  ...normalizeGeneratedEntities(generatedBackgrounds),
  ...normalizeGeneratedEntities(generatedBackgroundFeatures),
  ...normalizeGeneratedEntities(generatedFeats),
  ...normalizeGeneratedEntities(generatedSubclasses),
  ...normalizeGeneratedEntities(generatedSubclassFeatures),
  ...normalizeGeneratedEntities(generatedSpellOverrides),
])

export const defaultBonfireEntityRuleStore = createBonfireEntityRuleStore(defaultBonfireRuleStore)

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
    parentRuleId: feature.parentRuleId,
    parentName: feature.parentName,
    parentDisplayName: feature.parentDisplayName,
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
    parentRuleId?: string
    parentName?: string
    parentDisplayName?: string
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
    parentRuleId: rule.parentRuleId,
    parentName: rule.parentName,
    parentDisplayName: rule.parentDisplayName,
    ...extra,
  }
}

function inferLegacyDescriptionStatus(rule: {
  description?: string
  descriptionText?: string
  shortDescription?: string
  descriptionSource?: BonfireRuleEntity['descriptionSource']
}): NonNullable<BonfireRuleEntity['descriptionStatus']> {
  if (rule.descriptionSource === 'card-summary' || rule.descriptionSource === 'category-preview') return 'summary-only'
  if (rule.descriptionSource === 'manual-review' || rule.descriptionSource === 'unknown' || !rule.descriptionSource) return 'needs-review'
  if (isAllowedCompleteDescriptionSource(rule.descriptionSource)
    && (rule.descriptionText?.trim() || rule.description?.trim())) return 'complete'
  if (rule.shortDescription?.trim()) return 'needs-review'
  if (rule.description?.trim() || rule.descriptionText?.trim()) return 'needs-review'
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
  if (status === 'summary-only') return ['summary-card-used-no-full-description', 'missing-full-rule-description', 'missing-full-rule-page']
  if (status === 'needs-review' && rule.descriptionSource === 'manual-review') return ['manual-description-not-source-verified', 'missing-full-rule-description']
  if (status === 'missing') return ['missing-full-rule-description', 'missing-full-rule-page']
  return ['description-needs-review']
}

function normalizeGeneratedEntities(rawEntities: unknown[]): BonfireRuleEntity[] {
  return rawEntities
    .map((entry) => normalizeGeneratedEntity(entry))
    .filter((entry): entry is BonfireRuleEntity => Boolean(entry))
}

function normalizeGeneratedEntity(raw: unknown): BonfireRuleEntity | null {
  const entry = raw as Record<string, unknown>
  const id = stringOrUndefined(entry.id)
  const name = stringOrUndefined(entry.name)
  const kind = stringOrUndefined(entry.kind) as BonfireRuleKind | undefined
  if (!id || !name || !kind) return null

  const aliases = Array.isArray(entry.aliases) ? entry.aliases.map((alias) => String(alias)).filter(Boolean) : []
  const foundry = entry.foundry && typeof entry.foundry === 'object' && !Array.isArray(entry.foundry)
    ? normalizeGeneratedFoundry(entry.foundry as Record<string, unknown>)
    : undefined

  return {
    id,
    identifier: stringOrUndefined(entry.identifier) ?? toFoundryIdentifier(id || name),
    name,
    aliases,
    kind,
    sourceUrl: stringOrUndefined(entry.sourceUrl),
    sourceName: 'Bonfire generated seed',
    description: stringOrUndefined(entry.description) ?? stringOrUndefined(entry.descriptionText) ?? stringOrUndefined(entry.shortDescription),
    descriptionHtml: stringOrUndefined(entry.descriptionHtml),
    descriptionText: stringOrUndefined(entry.descriptionText),
    shortDescription: stringOrUndefined(entry.shortDescription),
    descriptionStatus: (stringOrUndefined(entry.descriptionStatus) as BonfireRuleEntity['descriptionStatus']) ?? inferLegacyDescriptionStatus({
      description: stringOrUndefined(entry.description),
      descriptionText: stringOrUndefined(entry.descriptionText),
      shortDescription: stringOrUndefined(entry.shortDescription),
      descriptionSource: stringOrUndefined(entry.descriptionSource) as BonfireRuleEntity['descriptionSource'],
    }),
    descriptionSource: (stringOrUndefined(entry.descriptionSource) as BonfireRuleEntity['descriptionSource']) ?? 'unknown',
    needsReviewReasons: Array.isArray(entry.needsReviewReasons) ? entry.needsReviewReasons.map((value) => String(value)).filter(Boolean) : undefined,
    className: stringOrUndefined(entry.className),
    subclassName: stringOrUndefined(entry.subclassName),
    raceName: stringOrUndefined(entry.raceName),
    backgroundName: stringOrUndefined(entry.backgroundName),
    parentRuleId: stringOrUndefined(entry.parentRuleId),
    parentName: stringOrUndefined(entry.parentName),
    parentDisplayName: stringOrUndefined(entry.parentDisplayName),
    sourceFileName: stringOrUndefined(entry.sourceFileName),
    level: typeof entry.level === 'number' ? entry.level : undefined,
    seedLocal: true,
    foundry,
    tags: Array.isArray(entry.tags) ? entry.tags.map((tag) => String(tag)).filter(Boolean) : [],
  }
}

function normalizeGeneratedFoundry(foundry: Record<string, unknown>): BonfireRuleEntity['foundry'] {
  const rawUses = foundry.uses
  const uses = rawUses && typeof rawUses === 'object' && !Array.isArray(rawUses)
    ? {
        max: typeof (rawUses as Record<string, unknown>).max === 'number' || typeof (rawUses as Record<string, unknown>).max === 'string'
          ? ((rawUses as Record<string, unknown>).max as number | string)
          : undefined,
        spent: typeof (rawUses as Record<string, unknown>).spent === 'number' ? ((rawUses as Record<string, unknown>).spent as number) : undefined,
        recovery: normalizeRecoveryValue(stringOrUndefined((rawUses as Record<string, unknown>).recovery)),
      }
    : undefined

  return {
    itemType: stringOrUndefined(foundry.itemType ?? foundry.preferredType),
    activityType: stringOrUndefined(foundry.activityType),
    activationType: stringOrUndefined(foundry.activationType),
    damageFormula: stringOrUndefined(foundry.damageFormula),
    damageType: stringOrUndefined(foundry.damageType),
    healingFormula: stringOrUndefined(foundry.healingFormula),
    saveAbility: stringOrUndefined(foundry.saveAbility),
    target: stringOrUndefined(foundry.target),
    range: stringOrUndefined(foundry.range),
    duration: stringOrUndefined(foundry.duration),
    uses,
  }
}

function dedupeEntities(entities: BonfireRuleEntity[]): BonfireRuleEntity[] {
  const seen = new Map<string, BonfireRuleEntity>()
  for (const entity of entities) {
    const key = semanticEntityKey(entity)
    const existing = seen.get(key)
    if (!existing) {
      seen.set(key, entity)
      continue
    }
    const preferred = entityRank(entity) > entityRank(existing) ? entity : existing
    const fallback = preferred === entity ? existing : entity
    seen.set(key, mergeEntities(preferred, fallback))
  }
  return Array.from(seen.values())
}

function semanticEntityKey(entity: BonfireRuleEntity): string {
  return [
    normalizeRuleLookupKey(entity.name),
    entity.kind,
    normalizeRuleLookupKey(entity.className ?? ''),
    normalizeRuleLookupKey(entity.subclassName ?? ''),
    normalizeRuleLookupKey(entity.raceName ?? ''),
    normalizeRuleLookupKey(entity.backgroundName ?? ''),
    normalizeRuleLookupKey(entity.parentName ?? ''),
    String(entity.level ?? ''),
  ].join('::')
}

function entityRank(entity: BonfireRuleEntity): number {
  const status = entity.descriptionStatus
  const statusRank = status === 'complete' ? 5 : status === 'needs-review' ? 3 : status === 'summary-only' ? 2 : 1
  return statusRank * 10 + (entity.sourceName === 'Bonfire generated seed' ? 2 : 0) + (entity.parentName ? 1 : 0)
}

function mergeEntities(preferred: BonfireRuleEntity, fallback: BonfireRuleEntity): BonfireRuleEntity {
  return {
    ...preferred,
    aliases: Array.from(new Set([...(preferred.aliases ?? []), ...(fallback.aliases ?? [])])),
    description: preferred.description ?? fallback.description,
    descriptionHtml: preferred.descriptionHtml ?? fallback.descriptionHtml,
    descriptionText: preferred.descriptionText ?? fallback.descriptionText,
    shortDescription: preferred.shortDescription ?? fallback.shortDescription,
    sourceUrl: preferred.sourceUrl ?? fallback.sourceUrl,
    sourceFileName: preferred.sourceFileName ?? fallback.sourceFileName,
    className: preferred.className ?? fallback.className,
    subclassName: preferred.subclassName ?? fallback.subclassName,
    raceName: preferred.raceName ?? fallback.raceName,
    backgroundName: preferred.backgroundName ?? fallback.backgroundName,
    parentRuleId: preferred.parentRuleId ?? fallback.parentRuleId,
    parentName: preferred.parentName ?? fallback.parentName,
    parentDisplayName: preferred.parentDisplayName ?? fallback.parentDisplayName,
    foundry: mergeFoundry(preferred.foundry, fallback.foundry),
    needsReviewReasons: Array.from(new Set([...(preferred.needsReviewReasons ?? []), ...(fallback.needsReviewReasons ?? [])])),
    tags: Array.from(new Set([...(preferred.tags ?? []), ...(fallback.tags ?? [])])),
  }
}

function mergeFoundry(
  preferred: BonfireRuleEntity['foundry'] | undefined,
  fallback: BonfireRuleEntity['foundry'] | undefined,
): BonfireRuleEntity['foundry'] | undefined {
  if (!preferred) return fallback
  if (!fallback) return preferred
  const preferredUses = preferred.uses
  const fallbackUses = fallback.uses
  return {
    itemType: preferred.itemType ?? fallback.itemType,
    activityType: preferred.activityType ?? fallback.activityType,
    activationType: preferred.activationType ?? fallback.activationType,
    damageFormula: preferred.damageFormula ?? fallback.damageFormula,
    damageType: preferred.damageType ?? fallback.damageType,
    healingFormula: preferred.healingFormula ?? fallback.healingFormula,
    saveAbility: preferred.saveAbility ?? fallback.saveAbility,
    target: preferred.target ?? fallback.target,
    range: preferred.range ?? fallback.range,
    duration: preferred.duration ?? fallback.duration,
    uses: preferredUses ?? fallbackUses
      ? {
          max: preferredUses?.max ?? fallbackUses?.max,
          spent: preferredUses?.spent ?? fallbackUses?.spent,
          recovery: preferredUses?.recovery ?? fallbackUses?.recovery,
        }
      : undefined,
  }
}

function stringOrUndefined(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

function normalizeRecoveryValue(
  value: string | undefined,
): 'sr' | 'lr' | 'day' | 'charges' | 'none' | 'unknown' | 'sr-lr' | undefined {
  if (!value) return undefined
  switch (value) {
    case 'short-rest':
    case 'short rest':
    case 'sr':
      return 'sr'
    case 'long-rest':
    case 'long rest':
    case 'lr':
      return 'lr'
    case 'short-long-rest':
    case 'short or long rest':
    case 'rest':
    case 'sr-lr':
      return 'sr-lr'
    case 'day':
    case 'daily':
      return 'day'
    case 'charges':
      return 'charges'
    case 'none':
      return 'none'
    case 'unknown':
      return 'unknown'
    default:
      return undefined
  }
}
