import { toFoundryIdentifier } from '../foundry/identifiers'
import type { BonfireUses, FeatureResolution, FeatureResolutionContext } from './bonfireTypes'
import type { BonfireRuleStore } from './bonfireRuleStore'
import { defaultBonfireRuleStore } from './bonfireRuleStore'
import { buildBonfireRuleIndex } from './store/bonfireRuleIndex'
import { createBonfireEntityRuleStore } from './store/bonfireRuleStore'
import { resolveRuleName } from './resolution/featureResolutionPipeline'

export function resolveFeature(rawName: string, context: FeatureResolutionContext, store: BonfireRuleStore = defaultBonfireRuleStore): FeatureResolution {
  const index = store === defaultBonfireRuleStore ? undefined : buildBonfireRuleIndex(createBonfireEntityRuleStore(store))
  const result = resolveRuleName(rawName, context, index)
  const entity = result.candidates[0]?.entity
  const confidence: FeatureResolution['confidence'] = result.confidence === 'unknown' ? 'low' : result.confidence
  return {
    rawName,
    resolvedName: result.resolvedName,
    identifier: result.identifier || toFoundryIdentifier(result.resolvedName || rawName),
    kind: normalizeFeatureKind(result.kind, context),
    confidence,
    score: result.score,
    ruleId: result.ruleId,
    sourceUrl: result.sourceUrl,
    description: result.description,
    uses: normalizeUses(entity?.foundry?.uses),
    activation: entity?.foundry?.activationType,
    candidates: result.candidates.slice(0, 5).map((candidate) => ({
      ruleId: candidate.entity.id,
      name: candidate.entity.name,
      kind: candidate.entity.kind,
      score: candidate.score,
      confidence: candidate.confidence,
    })),
    manuallyResolved: result.manuallyResolved,
    warnings: result.warnings,
  }
}

function normalizeFeatureKind(kind: string, context: FeatureResolutionContext): FeatureResolution['kind'] {
  if (kind === 'class') return 'classFeature'
  if (kind === 'subclass') return 'subclassFeature'
  if (kind === 'race') return 'raceFeature'
  if (kind === 'background') return 'backgroundFeature'
  if (kind === 'originFeat' || kind === 'racialFeat') return kind
  if (kind === 'weapon' || kind === 'armor' || kind === 'equipment' || kind === 'consumable' || kind === 'spell' || kind === 'spellOverride') return kind
  if (kind === 'unknown' && context.section?.toLowerCase().includes('talento')) return 'feat'
  return kind as FeatureResolution['kind']
}

function normalizeUses(uses?: { max?: number | string; recovery?: string }): BonfireUses | undefined {
  if (!uses?.max) return undefined
  const recovery = uses.recovery === 'day' || uses.recovery === 'none' ? 'unknown' : uses.recovery
  return { max: uses.max, recovery: (recovery ?? 'unknown') as BonfireUses['recovery'] }
}
